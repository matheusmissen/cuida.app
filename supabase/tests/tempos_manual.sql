-- Teste manual dos tempos de tolerância e escalada (Etapa 1), com usuários fictícios.
-- Rode num banco local depois de aplicar as migrations e o seed (psql), como superusuário.
-- Cada linha de resultado deve sair 't' (verdadeiro). Tudo é desfeito no fim (rollback).

\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev'),
 ('22222222-2222-4222-8222-222222222222','estranho@ficticio.dev'),
 ('33333333-3333-4333-8333-333333333333','aparelho-idosa@ficticio.dev');
insert into public.cuidadores (usuario_id, paciente_id, papel) values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal');
update public.pacientes set usuario_id = '33333333-3333-4333-8333-333333333333'
 where id = '00000000-0000-4000-8000-000000000001';

\echo '--- 1. Padrões do PRD: dose 30, check-in 15, escalada 15; check-in novo às 08:00'
select tolerancia_dose_min = 30 and tolerancia_checkin_min = 15 and escalada_min = 15 as padroes_do_prd
  from public.pacientes where id = '00000000-0000-4000-8000-000000000001';
select column_default like '''08:00%' as checkin_padrao_8h
  from information_schema.columns where table_name = 'pacientes' and column_name = 'horario_checkin';

\echo '--- 2. Limites: 0 e 241 são recusados'
savepoint s1;
do $$ begin
  update public.pacientes set escalada_min = 0 where id = '00000000-0000-4000-8000-000000000001';
  raise exception 'deveria recusar 0';
exception when check_violation then null; end $$;
do $$ begin
  update public.pacientes set tolerancia_dose_min = 241 where id = '00000000-0000-4000-8000-000000000001';
  raise exception 'deveria recusar 241';
exception when check_violation then null; end $$;
select true as limites_ok;

\echo '--- 3. A família liga o modo demonstração (tudo em 1 minuto)'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
update public.pacientes set tolerancia_dose_min = 1, tolerancia_checkin_min = 1, escalada_min = 1
 where id = '00000000-0000-4000-8000-000000000001';
select tolerancia_dose_min = 1 and tolerancia_checkin_min = 1 and escalada_min = 1 as familia_ligou_demonstracao
  from public.pacientes where id = '00000000-0000-4000-8000-000000000001';

\echo '--- 4. Estranho e o aparelho da idosa não mudam os tempos'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
update public.pacientes set escalada_min = 200 where id = '00000000-0000-4000-8000-000000000001';
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
update public.pacientes set escalada_min = 200 where id = '00000000-0000-4000-8000-000000000001';
reset role;
select escalada_min = 1 as so_a_familia_muda
  from public.pacientes where id = '00000000-0000-4000-8000-000000000001';

rollback;
