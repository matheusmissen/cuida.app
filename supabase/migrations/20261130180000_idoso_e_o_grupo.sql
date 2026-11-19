-- Cuida: o idoso vê quem acompanha e tira alguém do grupo (docs/PRD.md, "Dados e LGPD", item 3:
-- "Minha privacidade": ver quem acompanha, tirar alguém do grupo ou revogar).
-- Só o celular do idoso usa estas funções. Ele vê só o nome e o papel de cada pessoa (nada de e-mail).
-- Tirar o responsável: a próxima pessoa da escala vira responsável na hora, para os remédios e os
-- alertas continuarem funcionando. Se o responsável for a única pessoa do grupo, não dá para tirar.

create function public.grupo_do_idoso() returns table (usuario_id uuid, nome text, papel text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_paciente uuid;
begin
  select id into v_paciente from public.pacientes where pacientes.usuario_id = auth.uid();
  if v_paciente is null then
    raise exception 'Aparelho não vinculado';
  end if;
  return query
    select c.usuario_id, coalesce(nullif(btrim(c.nome_exibicao), ''), 'Pessoa da família'), c.papel::text
      from public.cuidadores c
     where c.paciente_id = v_paciente
     order by (c.papel = 'principal') desc, c.ordem_escala;
end;
$$;

create function public.idoso_tirar_do_grupo(p_usuario uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_paciente uuid;
  v_papel text;
  v_proximo uuid;
begin
  select id into v_paciente from public.pacientes where usuario_id = auth.uid();
  if v_paciente is null then
    raise exception 'Aparelho não vinculado';
  end if;
  select papel::text into v_papel from public.cuidadores where paciente_id = v_paciente and usuario_id = p_usuario;
  if v_papel is null then
    raise exception 'Essa pessoa não está no grupo';
  end if;
  if v_papel = 'principal' then
    select usuario_id into v_proximo
      from public.cuidadores
     where paciente_id = v_paciente and usuario_id <> p_usuario
     order by ordem_escala
     limit 1;
    if v_proximo is null then
      raise exception 'É a única pessoa do grupo: alguém precisa cuidar dos remédios';
    end if;
    update public.cuidadores set papel = 'principal', ordem_escala = 1
     where paciente_id = v_paciente and usuario_id = v_proximo;
  end if;
  delete from public.cuidadores where paciente_id = v_paciente and usuario_id = p_usuario;
  update public.pacientes set ultima_interacao_em = now() where id = v_paciente;
end;
$$;

revoke all on function public.grupo_do_idoso(), public.idoso_tirar_do_grupo(uuid) from public, anon;
grant execute on function public.grupo_do_idoso(), public.idoso_tirar_do_grupo(uuid) to authenticated;
