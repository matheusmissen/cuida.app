-- Teste manual das funções de doses (etapa 18–21/11), com usuários fictícios.
-- Rode num banco local depois de 'supabase db reset' (psql), como superusuário.
-- Cada linha de resultado deve sair 't' (verdadeiro).

\set ON_ERROR_STOP 1
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev'),
 ('22222222-2222-4222-8222-222222222222','estranho@ficticio.dev'),
 ('33333333-3333-4333-8333-333333333333','aparelho-idosa@ficticio.dev');
insert into public.cuidadores (usuario_id, paciente_id, papel) values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal');
update public.pacientes set usuario_id = '33333333-3333-4333-8333-333333333333', ultima_interacao_em = now() - interval '5 hours'
 where id = '00000000-0000-4000-8000-000000000001';
-- remédio inativo não gera dose; horário só às segundas não gera dose em outro dia
insert into public.remedios (id, paciente_id, nome, dose, ativo) values
 ('00000000-0000-4000-8000-0000000000a9','00000000-0000-4000-8000-000000000001','Remédio suspenso','1 comprimido', false);
insert into public.horarios (remedio_id, paciente_id, hora) values
 ('00000000-0000-4000-8000-0000000000a9','00000000-0000-4000-8000-000000000001','09:00');

\echo '--- 1. Servidor gera doses de hoje e amanhã; repetir não duplica'
select public.gerar_doses_dia() = 4 as gerou_amanha_so;      -- hoje já veio do seed (4); amanhã: 4
select public.gerar_doses_dia() = 0 as idempotente;
select count(*) = 0 as inativo_sem_dose from public.doses d join public.horarios h on h.id = d.horario_id
 where h.remedio_id = '00000000-0000-4000-8000-0000000000a9';
select bool_and(to_char(previsto_em at time zone 'America/Sao_Paulo', 'HH24:MI') in ('08:00','12:00','20:00')) as hora_local_certa
  from public.doses;

\echo '--- 2. Família e idosa podem pedir a geração; estranho não'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.gerar_doses_hoje('00000000-0000-4000-8000-000000000001') = 0 as familia_gera;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.gerar_doses_hoje('00000000-0000-4000-8000-000000000001') = 0 as idosa_gera;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
\set ON_ERROR_STOP 0
\echo '(deve dar erro: Sem permissão)'
select public.gerar_doses_hoje('00000000-0000-4000-8000-000000000001');
\echo '(deve dar erro: Dose não encontrada)'
select public.confirmar_dose((select id from public.doses limit 1));
\echo '(deve dar erro: permissão negada para função interna)'
select public.gerar_doses_dia();
\set ON_ERROR_STOP 1

\echo '--- 3. Idosa aperta "Tomei": dose tomada, estoque baixa 1, interação registrada'
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select id as dose_vitamina from public.doses d
 where horario_id = '00000000-0000-4000-8000-0000000000b4' and status = 'pendente' order by previsto_em limit 1 \gset
select public.confirmar_dose(:'dose_vitamina') is not null as confirmou;
select public.confirmar_dose(:'dose_vitamina') is not null as toque_duplo_ok;
reset role;
select status = 'tomado' and confirmado_em is not null as dose_tomada from public.doses where id = :'dose_vitamina';
select estoque_doses = 59 as estoque_baixou_uma_vez from public.remedios where id = '00000000-0000-4000-8000-0000000000a3';
select ultima_interacao_em > now() - interval '1 minute' as interacao_registrada from public.pacientes
 where id = '00000000-0000-4000-8000-000000000001';

\echo '--- 4. Dose marcada como perdida pelo servidor ainda pode ser confirmada depois'
select id as dose_noite from public.doses
 where horario_id = '00000000-0000-4000-8000-0000000000b3' and status = 'pendente' order by previsto_em limit 1 \gset
update public.doses set status = 'perdido' where id = :'dose_noite';
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.confirmar_dose(:'dose_noite') is not null as confirmou_atrasada;
reset role;
select status = 'tomado' as perdida_virou_tomada from public.doses where id = :'dose_noite';

\echo '--- 5. Família apaga doses futuras não tomadas (ao suspender remédio); histórico não'
insert into public.doses (horario_id, paciente_id, previsto_em) values
 ('00000000-0000-4000-8000-0000000000b1','00000000-0000-4000-8000-000000000001', now() + interval '3 days'),
 ('00000000-0000-4000-8000-0000000000b1','00000000-0000-4000-8000-000000000001', now() - interval '3 days');
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
delete from public.doses where horario_id = '00000000-0000-4000-8000-0000000000b1';
reset role;
select count(*) = 0 as futura_apagada from public.doses where horario_id = '00000000-0000-4000-8000-0000000000b1' and previsto_em > now() + interval '2 days';
select count(*) >= 2 as historico_mantido from public.doses where horario_id = '00000000-0000-4000-8000-0000000000b1' and previsto_em < now();
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
delete from public.doses;
reset role;
select count(*) > 0 as idosa_nao_apaga from public.doses;
