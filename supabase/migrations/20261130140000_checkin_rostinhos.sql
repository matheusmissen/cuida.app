-- Cuida: Etapa 7 do novo plano — check-in diário com 6 rostinhos (docs/PRD.md, seção 4).
-- 1. checkins.nivel: 1 = muito bem … 6 = muito mal (nulo nos registros feitos só pela conversa com a Lia).
-- 2. registrar_rostinho(p_nivel): o aparelho do idoso grava o nível escolhido, conta como interação
--    e, no nível 6 ("Muito mal"), cria o alerta laranja para o responsável (regra avaliarRostinho em
--    packages/regras; o teste rostinho.test.ts confere que é o mesmo alerta). Não depende da IA.
--    A Edge Function `registrar-checkin` chama esta função e manda o push; se ela falhar, o app chama direto.
--    Toques repetidos em 2 minutos não duplicam o check-in nem o alerta.
-- O gatilho resolver_alerta_do_checkin (migration de ações do alerta) já resolve o "sem resposta" ao inserir.

alter table public.checkins add column nivel smallint check (nivel between 1 and 6);

create function public.registrar_rostinho(p_nivel int) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_paciente uuid;
  v_checkin uuid;
  v_alerta uuid;
  v_responsavel uuid;
begin
  if p_nivel is null or p_nivel not between 1 and 6 then
    raise exception 'Nível inválido';
  end if;
  select id into v_paciente from public.pacientes where usuario_id = auth.uid();
  if v_paciente is null then
    raise exception 'Aparelho não vinculado';
  end if;

  update public.pacientes set ultima_interacao_em = now() where id = v_paciente;

  -- Toque repetido: reaproveita o check-in de rostinho dos últimos 2 minutos.
  select id into v_checkin
    from public.checkins
   where paciente_id = v_paciente and nivel is not null and feito_em > now() - interval '2 minutes'
   order by feito_em desc
   limit 1;
  if v_checkin is not null then
    return jsonb_build_object('checkin_id', v_checkin, 'alerta_id', null, 'novo_alerta', false);
  end if;

  insert into public.checkins (paciente_id, nivel) values (v_paciente, p_nivel)
  returning id into v_checkin;

  if p_nivel = 6 then
    -- Laranja: primeiro o responsável; a verificar-doses avisa o grupo se ele não agir a tempo.
    select c.usuario_id into v_responsavel
      from public.cuidadores c
     where c.paciente_id = v_paciente
     order by (c.papel = 'principal') desc, c.ordem_escala
     limit 1;
    insert into public.alertas (paciente_id, gatilho, nivel, motivo, avisados)
    values (
      v_paciente,
      'geral.checkin_muito_mal',
      'laranja',
      'Respondeu "Muito mal" no check-in.',
      case when v_responsavel is null then '{}'::uuid[] else array[v_responsavel] end
    )
    returning id into v_alerta;
  end if;

  return jsonb_build_object('checkin_id', v_checkin, 'alerta_id', v_alerta, 'novo_alerta', v_alerta is not null);
end;
$$;

revoke all on function public.registrar_rostinho(int) from public, anon;
grant execute on function public.registrar_rostinho(int) to authenticated;
