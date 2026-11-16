-- Token de push do aparelho do idoso (para repetir o alarme de dose pelo servidor).
alter table public.pacientes add column expo_push_token text;

-- O próprio aparelho do idoso grava o seu token, sem poder alterar outros campos.
create function public.salvar_push_idoso(p_token text) returns void
language sql volatile security definer set search_path = '' as $$
  update public.pacientes set expo_push_token = p_token where usuario_id = auth.uid();
$$;
revoke all on function public.salvar_push_idoso from public, anon;
grant execute on function public.salvar_push_idoso to authenticated;

-- Agendamento (rodar uma vez no SQL Editor do projeto, trocando os valores entre <>):
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--   select cron.schedule('avaliar-regras', '* * * * *', $$
--     select net.http_post(
--       url := 'https://<ref-do-projeto>.supabase.co/functions/v1/avaliar-regras',
--       headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
--       body := '{}'::jsonb
--     );
--   $$);
-- O agendamento fica fora da migration porque leva a URL e o segredo de cada projeto.
