-- Cuida: "Apagar minha conta" do familiar (LGPD: direito de eliminar os dados; termos do familiar).
-- Em cada grupo de que a pessoa faz parte:
--   - se há outras pessoas, ela sai; se era a responsável, a próxima da escala vira responsável
--     (como em idoso_tirar_do_grupo), para os remédios e os alertas continuarem funcionando;
--   - se era a única pessoa do grupo, os dados de quem ela cuida são apagados (remédios, histórico,
--     alertas, consultas, documentos) e o celular do idoso é desconectado.
-- Quem apaga é a Edge Function apagar-conta (com a chave de servidor): ela chama apagar_conta,
-- remove os arquivos dos pacientes apagados e por último apaga o usuário do Auth.

-- Documentos enviados por quem apagou a conta continuam no grupo (o "enviado por" fica vazio).
alter table public.documentos alter column enviado_por drop not null;

-- O que vai acontecer, para a tela de confirmação (só o próprio usuário logado).
create function public.resumo_para_apagar_conta()
returns table (paciente_id uuid, nome text, papel text, sozinho boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, coalesce(nullif(p.apelido, ''), p.nome), c.papel::text,
         not exists (select 1 from public.cuidadores o where o.paciente_id = c.paciente_id and o.usuario_id <> c.usuario_id)
    from public.cuidadores c
    join public.pacientes p on p.id = c.paciente_id
   where c.usuario_id = auth.uid()
   order by p.nome;
$$;

-- Tira a pessoa de todos os grupos e apaga os pacientes em que ela era a única. Devolve os pacientes
-- apagados (para a Edge Function remover os arquivos deles). Só o servidor chama.
create function public.apagar_conta(p_usuario uuid) returns setof uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_grupo record;
  v_proximo uuid;
begin
  if p_usuario is null then
    raise exception 'Usuário obrigatório';
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

revoke all on function public.resumo_para_apagar_conta() from public, anon;
grant execute on function public.resumo_para_apagar_conta() to authenticated;
revoke all on function public.apagar_conta(uuid) from public, anon, authenticated;
grant execute on function public.apagar_conta(uuid) to service_role;
