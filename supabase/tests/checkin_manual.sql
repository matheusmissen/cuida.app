-- Teste manual do horário do check-in diário (etapa 22–25/11), com usuários fictícios.
-- Rode num banco local depois de 'supabase db reset' (psql), como superusuário.
-- Cada linha de resultado deve sair 't' (verdadeiro).

\set ON_ERROR_STOP 1
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev'),
 ('33333333-3333-4333-8333-333333333333','aparelho-idosa@ficticio.dev');
insert into public.cuidadores (usuario_id, paciente_id, papel) values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal');
update public.pacientes set usuario_id = '33333333-3333-4333-8333-333333333333'
 where id = '00000000-0000-4000-8000-000000000001';

\echo '--- 1. Padrão 09:00'
select horario_checkin = '09:00' as padrao_nove_horas from public.pacientes;

set role authenticated;
\echo '--- 2. Família muda o horário e pode desligar'
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
update public.pacientes set horario_checkin = '10:30';
select horario_checkin = '10:30' as familia_mudou from public.pacientes;

\echo '--- 3. Aparelho da idosa lê o horário e o último check-in, mas não muda o horário'
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select horario_checkin = '10:30' as idosa_le from public.pacientes;
select count(*) > 0 as idosa_le_checkins from public.checkins;
update public.pacientes set horario_checkin = null;
reset role;
select horario_checkin = '10:30' as idosa_nao_muda from public.pacientes;
