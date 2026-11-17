-- Botão "Preciso de ajuda" do app do idoso.
--
-- O alerta vermelho é gravado por esta função do banco, chamada com o token do aparelho, para que o
-- pedido de ajuda não dependa da IA nem de nenhuma Edge Function: se a função `pedir-ajuda` (que
-- também manda o push) falhar, o app chama esta função direto e a família ainda vê o alerta em tempo
-- real no painel.
--
-- Nível, gatilho e motivo são os mesmos de `pedidoDeAjuda()` em packages/regras/src/avaliar.ts
-- (um teste em packages/regras confere). Vermelho avisa todo o círculo de cuidado.
-- Toques repetidos em 2 minutos não criam outro alerta: devolvem o mesmo.

create function public.pedir_ajuda() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_paciente uuid;
  v_alerta uuid;
begin
  select id into v_paciente from public.pacientes where usuario_id = auth.uid();
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
    coalesce((select array_agg(c.usuario_id) from public.cuidadores c where c.paciente_id = v_paciente), '{}')
  )
  returning id into v_alerta;

  return jsonb_build_object('alerta_id', v_alerta, 'novo', true);
end;
$$;

revoke all on function public.pedir_ajuda from public, anon;
grant execute on function public.pedir_ajuda to authenticated;
