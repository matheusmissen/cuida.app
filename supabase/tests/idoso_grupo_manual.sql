-- Teste manual: o idoso vê quem acompanha e tira alguém do grupo (grupo_do_idoso, idoso_tirar_do_grupo).
-- Rode num banco local depois de 'supabase db reset' (psql), como superusuário.
-- Cada linha de resultado deve sair 't' (verdadeiro); os blocos marcados 'deve dar erro' precisam falhar.

\set ON_ERROR_STOP 0
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','responsavel@ficticio.dev'),
 ('22222222-2222-4222-8222-222222222222','estranho@ficticio.dev'),
 ('33333333-3333-4333-8333-333333333333','aparelho-idosa@ficticio.dev'),
 ('44444444-4444-4444-8444-444444444444','filha@ficticio.dev'),
 ('55555555-5555-4555-8555-555555555555','vizinha@ficticio.dev');
insert into public.cuidadores (usuario_id, paciente_id, papel, ordem_escala, nome_exibicao) values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal', 1, 'Lucas (neto)'),
 ('44444444-4444-4444-8444-444444444444','00000000-0000-4000-8000-000000000001','apoio', 2, 'Ana (filha)'),
 ('55555555-5555-4555-8555-555555555555','00000000-0000-4000-8000-000000000001','apoio', 3, null);
update public.pacientes set usuario_id = '33333333-3333-4333-8333-333333333333'
 where id = '00000000-0000-4000-8000-000000000001';

\echo '--- 1. A idosa vê o grupo: responsável primeiro, só nome e papel'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select count(*) = 3 as tres_pessoas from public.grupo_do_idoso();
select (select nome from public.grupo_do_idoso() limit 1) = 'Lucas (neto)' as responsavel_primeiro;
select exists (select 1 from public.grupo_do_idoso() where nome = 'Pessoa da família') as sem_nome_tem_texto;

\echo '--- 2. Tira uma acompanhante'
select public.idoso_tirar_do_grupo('55555555-5555-4555-8555-555555555555')::text = '' as tirou;
select count(*) = 2 as ficaram_dois from public.grupo_do_idoso();

\echo '--- 3. Tira o responsável: a filha vira responsável'
select public.idoso_tirar_do_grupo('11111111-1111-4111-8111-111111111111')::text = '' as tirou_responsavel;
select (select papel from public.grupo_do_idoso() limit 1) = 'principal'
   and (select nome from public.grupo_do_idoso() limit 1) = 'Ana (filha)' as filha_virou_responsavel;
reset role;
select count(*) = 0 as lucas_nao_esta_mais from public.cuidadores where usuario_id = '11111111-1111-4111-8111-111111111111';

\echo '--- 4. Quem saiu não vê mais os dados'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select count(*) = 0 as lucas_nao_ve_checkins from public.checkins;
select count(*) = 0 as lucas_nao_ve_a_paciente from public.pacientes;

\echo '--- 5. deve dar erro: tirar a única pessoa do grupo'
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.idoso_tirar_do_grupo('44444444-4444-4444-8444-444444444444');
\echo '--- 6. deve dar erro: alguém da família usando a função do idoso'
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select public.idoso_tirar_do_grupo('44444444-4444-4444-8444-444444444444');
\echo '--- 7. deve dar erro: estranho tenta ver o grupo'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select * from public.grupo_do_idoso();
reset role;
\echo '--- 8. deve dar erro: anon não executa'
set role anon;
select * from public.grupo_do_idoso();
reset role;
