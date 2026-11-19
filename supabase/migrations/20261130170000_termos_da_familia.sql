-- Cuida: termos do familiar (docs/PRD.md, "Dados e LGPD", item 2; tela 1 da família).
-- O familiar aceita os termos dele ao criar a conta: dados de contato e sigilo sobre as informações do idoso.
-- Cada aceite fica registrado com a versão do texto (packages/cliente/src/termos.ts) e a hora do servidor.
-- Quando o texto mudar, a versão muda e todos aceitam de novo.

create table public.termos_aceitos (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  versao text not null check (versao ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  aceito_em timestamptz not null default now(),
  primary key (usuario_id, versao)
);
alter table public.termos_aceitos enable row level security;
create policy "termos: cada um vê os seus" on public.termos_aceitos for select to authenticated
  using (usuario_id = auth.uid());
-- Sem políticas de escrita: só aceitar_termos grava (com a hora do servidor).

create function public.aceitar_termos(p_versao text) returns timestamptz
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_em timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Login necessário';
  end if;
  -- O celular do idoso entra anonimamente e não é familiar: ele tem o próprio consentimento.
  if coalesce((select is_anonymous from auth.users where id = auth.uid()), false) then
    raise exception 'Os termos da família são para contas de e-mail';
  end if;
  insert into public.termos_aceitos (usuario_id, versao) values (auth.uid(), p_versao)
  on conflict (usuario_id, versao) do nothing;
  select aceito_em into v_em from public.termos_aceitos where usuario_id = auth.uid() and versao = p_versao;
  return v_em;
end;
$$;
revoke all on function public.aceitar_termos(text) from public, anon;
grant execute on function public.aceitar_termos(text) to authenticated;
