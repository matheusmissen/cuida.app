-- Cuida: Etapa 8 do novo plano — consentimento do idoso por finalidade (docs/PRD.md, "Dados e LGPD").
-- O idoso (titular) concorda com cada finalidade separadamente, no primeiro acesso:
--   registro: guardar como está se sentindo e os remédios (necessária: sem ela o Cuida não cuida dele);
--   familia:  mostrar para a família (o grupo de cuidado);
--   lia:      conversar com a Lia (IA) sobre a saúde.
-- Antes da resposta, ou se o idoso recusar "familia", os dados ficam "aguardando consentimento":
-- só o responsável vê e recebe alertas; os acompanhantes não. Sem "lia", a Lia não processa nada.
-- O histórico guarda cada resposta (prova do consentimento) e as mudanças de ideia.

alter table public.pacientes
  add column consente_registro_em timestamptz,
  add column consente_familia_em timestamptz,
  add column consente_lia_em timestamptz,
  add column consentimento_respondido_em timestamptz;

create table public.consentimentos_historico (
  id bigint generated always as identity primary key,
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  finalidade text not null check (finalidade in ('registro', 'familia', 'lia')),
  aceito boolean not null,
  em timestamptz not null default now()
);
create index consentimentos_historico_paciente on public.consentimentos_historico (paciente_id, em desc);
alter table public.consentimentos_historico enable row level security;
create policy "consentimentos: idoso e responsável veem" on public.consentimentos_historico for select to authenticated
  using (public.e_paciente(paciente_id) or public.e_cuidador_principal(paciente_id));
-- Sem políticas de escrita: só registrar_consentimento grava.

-- Só o idoso (pelo próprio aparelho) muda o consentimento: a família edita outros dados do paciente,
-- mas nunca estas colunas. O servidor (sem usuário) continua podendo, por exemplo, ao recriar o seed.
create function public._so_o_idoso_consente() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.e_paciente(new.id) and (
       new.consente_registro_em is distinct from old.consente_registro_em
    or new.consente_familia_em is distinct from old.consente_familia_em
    or new.consente_lia_em is distinct from old.consente_lia_em
    or new.consentimento_respondido_em is distinct from old.consentimento_respondido_em) then
    raise exception 'Só a pessoa cuidada pode mudar as permissões';
  end if;
  return new;
end;
$$;
revoke all on function public._so_o_idoso_consente() from public, anon, authenticated;
create trigger so_o_idoso_consente before update on public.pacientes
  for each row execute function public._so_o_idoso_consente();

-- O aparelho do idoso responde (no primeiro acesso ou, depois, em "Minha privacidade").
create function public.registrar_consentimento(p_registro boolean, p_familia boolean, p_lia boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_paciente uuid;
begin
  select id into v_paciente from public.pacientes where usuario_id = auth.uid();
  if v_paciente is null then
    raise exception 'Aparelho não vinculado';
  end if;
  if not coalesce(p_registro, false) then
    raise exception 'Sem guardar os dados o Cuida não consegue cuidar de você';
  end if;
  update public.pacientes
     set consente_registro_em = coalesce(consente_registro_em, now()),
         consente_familia_em = case when p_familia then coalesce(consente_familia_em, now()) end,
         consente_lia_em = case when p_lia then coalesce(consente_lia_em, now()) end,
         consentimento_respondido_em = now(),
         ultima_interacao_em = now()
   where id = v_paciente;
  insert into public.consentimentos_historico (paciente_id, finalidade, aceito)
  values (v_paciente, 'registro', true), (v_paciente, 'familia', coalesce(p_familia, false)), (v_paciente, 'lia', coalesce(p_lia, false));
end;
$$;
revoke all on function public.registrar_consentimento(boolean, boolean, boolean) from public, anon;
grant execute on function public.registrar_consentimento(boolean, boolean, boolean) to authenticated;

-- Quem da família vê os dados de saúde: o responsável sempre; os acompanhantes só com "familia".
create function public.ve_saude(p_paciente uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.e_cuidador_principal(p_paciente)
      or (public.e_cuidador(p_paciente)
          and exists (select 1 from public.pacientes p where p.id = p_paciente and p.consente_familia_em is not null));
$$;
revoke all on function public.ve_saude(uuid) from public, anon;
grant execute on function public.ve_saude(uuid) to authenticated;

-- Tabelas de saúde: e_cuidador → ve_saude (o aparelho do idoso continua como estava).
drop policy "remedios: família gerencia" on public.remedios;
create policy "remedios: família gerencia" on public.remedios for all to authenticated
  using (public.ve_saude(paciente_id)) with check (public.ve_saude(paciente_id));
drop policy "horarios: família gerencia" on public.horarios;
create policy "horarios: família gerencia" on public.horarios for all to authenticated
  using (public.ve_saude(paciente_id)) with check (public.ve_saude(paciente_id));
drop policy "regras: família gerencia" on public.regras;
create policy "regras: família gerencia" on public.regras for all to authenticated
  using (public.ve_saude(paciente_id)) with check (public.ve_saude(paciente_id));
drop policy "memoria: família gerencia" on public.memoria_paciente;
create policy "memoria: família gerencia" on public.memoria_paciente for all to authenticated
  using (public.ve_saude(paciente_id)) with check (public.ve_saude(paciente_id));

drop policy "doses: ver" on public.doses;
create policy "doses: ver" on public.doses for select to authenticated
  using (public.ve_saude(paciente_id) or public.e_paciente(paciente_id));
drop policy "doses: família remove futuras" on public.doses;
create policy "doses: família remove futuras" on public.doses for delete to authenticated
  using (public.ve_saude(paciente_id) and confirmado_em is null and previsto_em > now());

drop policy "checkins: ver" on public.checkins;
create policy "checkins: ver" on public.checkins for select to authenticated
  using (public.ve_saude(paciente_id) or public.e_paciente(paciente_id));

drop policy "alertas: ver" on public.alertas;
create policy "alertas: ver" on public.alertas for select to authenticated
  using (public.ve_saude(paciente_id) or public.e_paciente(paciente_id));
drop policy "alertas: marcar visto" on public.alertas;
create policy "alertas: marcar visto" on public.alertas for update to authenticated
  using (public.ve_saude(paciente_id)) with check (public.ve_saude(paciente_id));

drop policy "documentos: família vê" on public.documentos;
create policy "documentos: família vê" on public.documentos for select to authenticated
  using (public.ve_saude(paciente_id));
drop policy "documentos: família envia" on public.documentos;
create policy "documentos: família envia" on public.documentos for insert to authenticated
  with check (public.ve_saude(paciente_id) and enviado_por = auth.uid() and leitura is null
              and status = case when tipo = 'receita' then 'enviado'::public.status_documento else 'conferida'::public.status_documento end);
drop policy "documentos: família edita título e data" on public.documentos;
create policy "documentos: família edita título e data" on public.documentos for update to authenticated
  using (public.ve_saude(paciente_id)) with check (public.ve_saude(paciente_id));
drop policy "documentos: família apaga" on public.documentos;
create policy "documentos: família apaga" on public.documentos for delete to authenticated
  using (public.ve_saude(paciente_id));

-- Arquivos dos documentos (Storage): a mesma regra.
create or replace function public.pode_acessar_arquivo(p_nome text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_pasta text := split_part(p_nome, '/', 1);
begin
  if v_pasta !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.ve_saude(v_pasta::uuid);
end;
$$;

-- Check-in com rostinho só depois de o idoso concordar em guardar como está se sentindo.
create or replace function public.registrar_rostinho(p_nivel int) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_paciente uuid;
  v_registro timestamptz;
  v_checkin uuid;
  v_alerta uuid;
  v_responsavel uuid;
begin
  if p_nivel is null or p_nivel not between 1 and 6 then
    raise exception 'Nível inválido';
  end if;
  select id, consente_registro_em into v_paciente, v_registro from public.pacientes where usuario_id = auth.uid();
  if v_paciente is null then
    raise exception 'Aparelho não vinculado';
  end if;
  if v_registro is null then
    raise exception 'Aguardando consentimento';
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

-- "Preciso de ajuda": o alerta registra como avisados só quem pode ver os dados.
create or replace function public.pedir_ajuda() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_paciente uuid;
  v_familia timestamptz;
  v_alerta uuid;
begin
  select id, consente_familia_em into v_paciente, v_familia from public.pacientes where usuario_id = auth.uid();
  if v_paciente is null then
    raise exception 'Aparelho não vinculado';
  end if;

  update public.pacientes set ultima_interacao_em = now() where id = v_paciente;

  select id into v_alerta
    from public.alertas
   where paciente_id = v_paciente
     and gatilho = 'geral.pedido_de_ajuda'
     and criado_em > now() - interval '2 minutes'
   order by criado_em desc
   limit 1;
  if v_alerta is not null then
    return jsonb_build_object('alerta_id', v_alerta, 'novo', false);
  end if;

  insert into public.alertas (paciente_id, gatilho, nivel, motivo, avisados)
  values (
    v_paciente,
    'geral.pedido_de_ajuda',
    'vermelho',
    'Apertou o botão "Preciso de ajuda".',
    coalesce((select array_agg(c.usuario_id) from public.cuidadores c
               where c.paciente_id = v_paciente and (c.papel = 'principal' or v_familia is not null)), '{}')
  )
  returning id into v_alerta;

  return jsonb_build_object('alerta_id', v_alerta, 'novo', true);
end;
$$;
