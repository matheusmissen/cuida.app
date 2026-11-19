-- Cuida: tela "Hora do remédio" (docs/PRD.md, seções 5 e 10): foto da caixa, cor e formato do comprimido.
-- 1. remedios.cor e remedios.formato: códigos do catálogo de packages/cliente/src/comprimido.ts.
-- 2. Bucket privado `remedios`, com as fotos das caixas em <paciente_id>/<arquivo>; remedios.foto_url guarda
--    esse caminho (o app gera um link temporário para mostrar a foto).
--    Veem: o celular do idoso e quem da família vê os dados de saúde (ve_saude). Enviam e apagam: só o
--    responsável (a mesma regra da rotina de remédios).

alter table public.remedios
  add column cor text check (cor in ('branco', 'amarelo', 'laranja', 'rosa', 'vermelho', 'azul', 'verde', 'marrom', 'colorido')),
  add column formato text check (formato in ('redondo', 'oval', 'capsula', 'gotas', 'liquido', 'outro'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('remedios', 'remedios', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create function public._pasta_do_paciente(p_nome text) returns uuid
language plpgsql immutable set search_path = '' as $$
declare
  v_pasta text := split_part(p_nome, '/', 1);
begin
  if v_pasta !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return v_pasta::uuid;
end;
$$;

create function public.pode_ver_foto_remedio(p_nome text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.ve_saude(public._pasta_do_paciente(p_nome))
               or public.e_paciente(public._pasta_do_paciente(p_nome)), false);
$$;

create function public.pode_enviar_foto_remedio(p_nome text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.e_cuidador_principal(public._pasta_do_paciente(p_nome)), false);
$$;

revoke all on function public._pasta_do_paciente(text), public.pode_ver_foto_remedio(text),
  public.pode_enviar_foto_remedio(text) from public, anon;
grant execute on function public._pasta_do_paciente(text), public.pode_ver_foto_remedio(text),
  public.pode_enviar_foto_remedio(text) to authenticated;

create policy "remedios: fotos veem idoso e família" on storage.objects for select to authenticated
  using (bucket_id = 'remedios' and public.pode_ver_foto_remedio(name));
create policy "remedios: responsável envia fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'remedios' and public.pode_enviar_foto_remedio(name));
create policy "remedios: responsável troca fotos" on storage.objects for update to authenticated
  using (bucket_id = 'remedios' and public.pode_enviar_foto_remedio(name))
  with check (bucket_id = 'remedios' and public.pode_enviar_foto_remedio(name));
create policy "remedios: responsável apaga fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'remedios' and public.pode_enviar_foto_remedio(name));
