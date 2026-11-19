-- Teste manual dos termos do familiar (aceitar_termos), com usuários fictícios.
-- Rode num banco local depois de 'supabase db reset' (psql), como superusuário.
-- Cada linha de resultado deve sair 't' (verdadeiro); os blocos marcados 'deve dar erro' precisam falhar.

\set ON_ERROR_STOP 0
insert into auth.users (id, email, is_anonymous) values
 ('11111111-1111-4111-8111-111111111111','familia@ficticio.dev', false),
 ('22222222-2222-4222-8222-222222222222','outra@ficticio.dev', false),
 ('33333333-3333-4333-8333-333333333333', null, true);

\echo '--- 1. A família aceita; aceitar de novo não duplica nem muda a hora'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.aceitar_termos('2026-11-20') is not null as aceitou;
select public.aceitar_termos('2026-11-20') = (select aceito_em from public.termos_aceitos) as mesma_hora;
select count(*) = 1 as ve_o_seu from public.termos_aceitos;
\echo '--- 2. Outra conta não vê o aceite dos outros'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select count(*) = 0 as nao_ve_dos_outros from public.termos_aceitos;
reset role;
select count(*) = 1 as um_registro from public.termos_aceitos;

\echo '--- 3. deve dar erro: versão fora do formato'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.aceitar_termos('qualquer');
\echo '--- 4. deve dar erro: o celular do idoso (anônimo) não aceita os termos da família'
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.aceitar_termos('2026-11-20');
\echo '--- 5. deve dar erro: gravar direto na tabela'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
insert into public.termos_aceitos (usuario_id, versao) values ('22222222-2222-4222-8222-222222222222', '2026-11-20');
reset role;
\echo '--- 6. deve dar erro: anon não executa'
set role anon;
select public.aceitar_termos('2026-11-20');
reset role;
