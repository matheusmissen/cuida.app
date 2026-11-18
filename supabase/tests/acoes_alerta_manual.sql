-- Teste manual das ações do alerta (Etapa 4), com usuários fictícios.
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

-- Uma dose pendente de hoje e um alerta de dose ligado a ela (como o servidor cria).
create temp table t as
select d.id as dose_id from public.doses d
 where d.paciente_id = '00000000-0000-4000-8000-000000000001' and d.confirmado_em is null
 order by d.previsto_em desc limit 1;
insert into public.alertas (paciente_id, gatilho, nivel, motivo, avisados, dose_id)
select '00000000-0000-4000-8000-000000000001', 'dose.nao_confirmada', 'laranja', 'Não confirmou Remédio A em 30 minutos.',
       array['11111111-1111-4111-8111-111111111111']::uuid[], dose_id from t;
insert into public.alertas (paciente_id, gatilho, nivel, motivo)
values ('00000000-0000-4000-8000-000000000001', 'geral.checkin_sem_resposta', 'laranja', 'Não fez o check-in em 15 minutos.');
grant select on t to authenticated;

\echo '--- 1. A idosa confirma a dose: o alerta da dose se resolve sozinho ("tomou")'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.confirmar_dose((select dose_id from t)) is not null as confirmou;
reset role;
select visto_em is not null and resolucao = 'tomou' as alerta_da_dose_resolvido
  from public.alertas where dose_id = (select dose_id from t);
select visto_em is null as checkin_continua_aberto from public.alertas where gatilho = 'geral.checkin_sem_resposta';

\echo '--- 2. A idosa faz o check-in: o alerta de check-in se resolve sozinho ("checkin")'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
insert into public.checkins (paciente_id, humor) values ('00000000-0000-4000-8000-000000000001', 'bom');
reset role;
select visto_em is not null and resolucao = 'checkin' as alerta_do_checkin_resolvido
  from public.alertas where gatilho = 'geral.checkin_sem_resposta';

\echo '--- 3. A família resolve um alerta ("Já falei com ela, está tudo bem"); estranho não'
insert into public.alertas (paciente_id, gatilho, nivel, motivo)
values ('00000000-0000-4000-8000-000000000001', 'leucemia.manchas', 'laranja', 'Manchas roxas novas.');
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
update public.alertas set visto_em = now(), resolucao = 'familia' where gatilho = 'leucemia.manchas';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
reset role;
select visto_em is null as estranho_nao_resolveu from public.alertas where gatilho = 'leucemia.manchas';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
update public.alertas set visto_em = now(), visto_por = auth.uid(), resolucao = 'familia' where gatilho = 'leucemia.manchas';
reset role;
select resolucao = 'familia' and visto_por = '11111111-1111-4111-8111-111111111111' as familia_resolveu
  from public.alertas where gatilho = 'leucemia.manchas';

\echo '--- 4. Telefone: aceita só dígitos (10 a 13, com + opcional)'
update public.pacientes set telefone = '11987654321' where id = '00000000-0000-4000-8000-000000000001';
update public.pacientes set telefone = '+5511987654321' where id = '00000000-0000-4000-8000-000000000001';
savepoint s1;
do $$ begin
  update public.pacientes set telefone = '(11) 9876' where id = '00000000-0000-4000-8000-000000000001';
  raise exception 'deveria recusar';
exception when check_violation then null; end $$;
select telefone = '+5511987654321' as telefone_ok from public.pacientes where id = '00000000-0000-4000-8000-000000000001';

\echo '--- 5. Resolução "inventada" é recusada'
savepoint s2;
do $$ begin
  update public.alertas set resolucao = 'qualquer' where gatilho = 'leucemia.manchas';
  raise exception 'deveria recusar';
exception when check_violation then null; end $$;
select true as resolucao_validada;

rollback;
