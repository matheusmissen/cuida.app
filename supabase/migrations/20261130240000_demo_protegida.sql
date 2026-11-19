-- Cuida: a conta de demonstração dos jurados (docs/demo.md) não pode ser apagada pelo app.
-- Sem isso, um toque em "Apagar minha conta" durante a avaliação apagaria a conta e a Dona Maria.
-- O e-mail é o mesmo de supabase/demo/preparar_demo.sql e de packages/cliente/src/conta.ts.

create or replace function public.apagar_conta(p_usuario uuid) returns setof uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_grupo record;
  v_proximo uuid;
begin
  if p_usuario is null then
    raise exception 'Usuário obrigatório';
  end if;
  if exists (select 1 from auth.users where id = p_usuario and lower(email) = 'jurados@example.com') then
    raise exception 'A conta de demonstração não pode ser apagada';
  end if;
  if exists (select 1 from public.pacientes where usuario_id = p_usuario) then
    raise exception 'Esta conta é o celular de um idoso, não uma conta da família';
  end if;
  for v_grupo in select paciente_id, papel::text as papel from public.cuidadores where usuario_id = p_usuario loop
    select usuario_id into v_proximo
      from public.cuidadores
     where paciente_id = v_grupo.paciente_id and usuario_id <> p_usuario
     order by (papel = 'principal') desc, ordem_escala
     limit 1;
    if v_proximo is null then
      delete from public.pacientes where id = v_grupo.paciente_id;
      return next v_grupo.paciente_id;
    else
      if v_grupo.papel = 'principal' then
        update public.cuidadores set papel = 'principal', ordem_escala = 1
         where paciente_id = v_grupo.paciente_id and usuario_id = v_proximo;
      end if;
      delete from public.cuidadores where paciente_id = v_grupo.paciente_id and usuario_id = p_usuario;
    end if;
  end loop;
  return;
end;
$$;

revoke all on function public.apagar_conta(uuid) from public, anon, authenticated;
grant execute on function public.apagar_conta(uuid) to service_role;
