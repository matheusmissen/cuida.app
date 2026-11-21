-- Teste manual do limite diário de uso da IA (contar_uso_ia). Dados fictícios.
-- Rode como superusuário num banco local depois de aplicar as migrations e o seed (psql).
-- Cada linha de resultado deve sair 't'; os blocos marcados 'deve dar erro' precisam falhar.
\set ON_ERROR_STOP 0
insert into auth.users (id, email) values ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev') on conflict do nothing;

\echo '--- 1. Dentro do limite (3): as três primeiras passam, a quarta não'
select public.contar_uso_ia('11111111-1111-4111-8111-111111111111', 'leitura', 3) as primeira;
select public.contar_uso_ia('11111111-1111-4111-8111-111111111111', 'leitura', 3) as segunda;
select public.contar_uso_ia('11111111-1111-4111-8111-111111111111', 'leitura', 3) as terceira;
select not public.contar_uso_ia('11111111-1111-4111-8111-111111111111', 'leitura', 3) as quarta_bloqueada;
select quantidade = 3 as parou_em_3 from public.uso_ia where tipo = 'leitura';

\echo '--- 2. Cada tipo tem a sua conta'
select public.contar_uso_ia('11111111-1111-4111-8111-111111111111', 'conversa', 3) as conversa_livre;

\echo '--- 3. Ontem não conta para hoje'
update public.uso_ia set dia = dia - 1 where tipo = 'leitura';
select public.contar_uso_ia('11111111-1111-4111-8111-111111111111', 'leitura', 3) as novo_dia;

\echo '--- 4. deve dar erro: o app não chama a contagem (só o servidor)'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.contar_uso_ia('11111111-1111-4111-8111-111111111111', 'leitura', 999);
\echo '--- 5. O app também não lê a tabela (sem políticas: vê zero linhas)'
select count(*) = 0 as nao_ve from public.uso_ia;
reset role;

\echo '--- 6. deve dar erro: tipo desconhecido'
select public.contar_uso_ia('11111111-1111-4111-8111-111111111111', 'outro', 3);
