-- Teste manual das consultas, com usuários fictícios.
-- Rode num banco local depois de 'supabase db reset' (psql), como superusuário.
-- Cada linha de resultado deve sair 't' (verdadeiro); os blocos marcados 'deve dar erro' precisam falhar.

\set ON_ERROR_STOP 0
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','responsavel@ficticio.dev'),
 ('22222222-2222-4222-8222-222222222222','estranho@ficticio.dev'),
 ('33333333-3333-4333-8333-333333333333','aparelho-idosa@ficticio.dev'),
 ('44444444-4444-4444-8444-444444444444','acompanhante@ficticio.dev');
insert into public.cuidadores (usuario_id, paciente_id, papel, ordem_escala) values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal', 1),
 ('44444444-4444-4444-8444-444444444444','00000000-0000-4000-8000-000000000001','apoio', 2);
update public.pacientes set usuario_id = '33333333-3333-4333-8333-333333333333'
 where id = '00000000-0000-4000-8000-000000000001';

\echo '--- 1. O responsável cadastra; a idosa vê'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
insert into public.consultas (paciente_id, quando, medico, especialidade, local)
values ('00000000-0000-4000-8000-000000000001', now() + interval '2 days', 'Dra. Fictícia', 'Hematologia', 'Clínica Exemplo');
select count(*) = 1 as responsavel_ve from public.consultas;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select count(*) = 1 as idosa_ve from public.consultas;

\echo '--- 2. Acompanhante: sem "mostrar para a família" não vê; o estranho nunca vê'
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select count(*) = 0 as acompanhante_nao_ve from public.consultas;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select count(*) = 0 as estranho_nao_ve from public.consultas;
reset role;

\echo '--- 3. Remarcar zera os lembretes já mandados'
update public.consultas set lembrete_vespera_em = now(), lembrete_horas_em = now();
update public.consultas set quando = quando + interval '1 day';
select lembrete_vespera_em is null and lembrete_horas_em is null as lembretes_zerados from public.consultas;
update public.consultas set lembrete_vespera_em = now();
update public.consultas set local = 'Outro lugar';
select lembrete_vespera_em is not null as mudar_local_nao_zera from public.consultas;

\echo '--- 4. deve dar erro: a idosa não cadastra consulta'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
insert into public.consultas (paciente_id, quando, medico) values ('00000000-0000-4000-8000-000000000001', now(), 'X');
\echo '--- 5. deve dar erro: consulta sem médico nem especialidade'
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
insert into public.consultas (paciente_id, quando) values ('00000000-0000-4000-8000-000000000001', now());
\echo '--- 6. deve dar erro: a família não marca o lembrete como já mandado'
insert into public.consultas (paciente_id, quando, medico, lembrete_horas_em) values ('00000000-0000-4000-8000-000000000001', now(), 'Y', now());
reset role;
