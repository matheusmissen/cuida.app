-- Cuida: limite diário de uso da IA (custo da API da Anthropic). Qualquer pessoa pode criar conta, então
-- sem limite alguém poderia gastar o crédito de propósito. Conta por usuário e por dia (horário de Brasília):
--   'conversa': mensagens do celular do idoso para a Lia (Edge Function agente);
--   'leitura':  receitas e pedidos médicos lidos (Edge Function ler-receita).
-- Passou do limite: a Lia responde uma frase fixa, mas a rede de segurança (palavras como "caí" ou
-- "tô quentinha") continua registrando e avisando a família. Alarmes, check-in e ajuda não usam IA.
-- Os limites ficam em supabase/functions/_shared/limites.ts. Só o servidor lê e grava esta tabela.

create table public.uso_ia (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  dia date not null,
  tipo text not null check (tipo in ('conversa', 'leitura')),
  quantidade integer not null default 0,
  primary key (usuario_id, dia, tipo)
);
alter table public.uso_ia enable row level security;

-- Soma 1 se ainda couber no limite do dia. Devolve true (pode usar a IA) ou false (passou do limite).
create function public.contar_uso_ia(p_usuario uuid, p_tipo text, p_limite integer) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_dia date := (now() at time zone 'America/Sao_Paulo')::date;
  v_qtd integer;
begin
  if p_usuario is null or p_limite is null or p_limite < 1 then
    raise exception 'Parâmetros inválidos';
  end if;
  insert into public.uso_ia (usuario_id, dia, tipo, quantidade)
  values (p_usuario, v_dia, p_tipo, 1)
  on conflict (usuario_id, dia, tipo) do update
    set quantidade = public.uso_ia.quantidade + 1
    where public.uso_ia.quantidade < p_limite
  returning quantidade into v_qtd;
  return v_qtd is not null;
end;
$$;

revoke all on function public.contar_uso_ia(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.contar_uso_ia(uuid, text, integer) to service_role;
