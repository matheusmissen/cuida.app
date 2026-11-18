-- Cuida: Etapa 3 do novo plano — notificações no navegador (web push), docs/PRD.md seções 2, 4, 5 e 9.
-- 1. inscricoes_push: cada navegador (celular) que aceitou receber notificações.
--    Liga ao usuário logado: cuidador (app da família) ou aparelho do idoso (login anônimo).
-- 2. Marcas para mandar cada lembrete uma vez: doses.lembrete_em e pacientes.lembrete_checkin_em.
-- As chaves VAPID ficam nos segredos das Edge Functions, nunca no banco nem no repositório.

create table public.inscricoes_push (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  app text not null check (app in ('idoso', 'familia')),
  endpoint text not null unique check (endpoint like 'https://%' and length(endpoint) <= 2048),
  p256dh text not null check (length(p256dh) between 80 and 100),
  auth text not null check (length(auth) between 16 and 32),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index inscricoes_push_usuario on public.inscricoes_push (usuario_id);

comment on table public.inscricoes_push is
  'Navegadores inscritos para web push (endpoint e chaves públicas do navegador). Gravado só por salvar_inscricao_push().';

alter table public.inscricoes_push enable row level security;

-- Cada pessoa vê e apaga só as próprias inscrições; gravar é só pela função abaixo.
create policy "inscricoes_push: ver as minhas" on public.inscricoes_push for select to authenticated
  using (usuario_id = auth.uid());
create policy "inscricoes_push: apagar as minhas" on public.inscricoes_push for delete to authenticated
  using (usuario_id = auth.uid());

-- Salva (ou atualiza) a inscrição deste navegador para o usuário logado.
-- O mesmo navegador pode trocar de conta: o endpoint passa para quem está logado agora.
create function public.salvar_inscricao_push(p_endpoint text, p_p256dh text, p_auth text, p_app text)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar conectado';
  end if;
  insert into public.inscricoes_push (usuario_id, app, endpoint, p256dh, auth)
  values (auth.uid(), p_app, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
     set usuario_id = excluded.usuario_id,
         app = excluded.app,
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         atualizado_em = now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.salvar_inscricao_push(text, text, text, text) from public, anon;
grant execute on function public.salvar_inscricao_push(text, text, text, text) to authenticated;

-- Lembretes mandados (uma vez cada).
alter table public.doses add column lembrete_em timestamptz;
comment on column public.doses.lembrete_em is 'Quando o lembrete "Hora do remédio" foi enviado ao idoso (web push).';

alter table public.pacientes add column lembrete_checkin_em timestamptz;
comment on column public.pacientes.lembrete_checkin_em is 'Último lembrete do check-in diário enviado ao idoso (um por dia).';
