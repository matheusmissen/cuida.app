-- Teste manual do check-in com rostinhos (registrar_rostinho), com usuários fictícios.
-- Rode num banco local depois de 'supabase db reset' (psql), como superusuário.
-- Cada linha de resultado deve sair 't' (verdadeiro); os blocos marcados 'deve dar erro' precisam falhar.

\set ON_ERROR_STOP 0
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev'),
 ('22222222-2222-4222-8222-222222222222','estranho@ficticio.dev'),
 ('33333333-3333-4333-8333-333333333333','aparelho-idosa@ficticio.dev'),
 ('44444444-4444-4444-8444-444444444444','filha@ficticio.dev');
insert into public.cuidadores (usuario_id, paciente_id, papel, ordem_escala) values
 ('44444444-4444-4444-8444-444444444444','00000000-0000-4000-8000-000000000001','apoio', 2),
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal', 1);
update public.pacientes set usuario_id = '33333333-3333-4333-8333-333333333333', ultima_interacao_em = now() - interval '5 hours'
 where id = '00000000-0000-4000-8000-000000000001';
-- Um alerta aberto de check-in sem resposta, para ver o rostinho resolver.
insert into public.alertas (paciente_id, gatilho, nivel, motivo)
values ('00000000-0000-4000-8000-000000000001', 'geral.checkin_sem_resposta', 'laranja', 'Não fez o check-in.');

\echo '--- 1. "Bem" (nível 2): grava o check-in, sem alerta, conta como interação e resolve o "sem resposta"'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select (public.registrar_rostinho(2) ->> 'novo_alerta')::boolean = false as sem_alerta;
reset role;
select count(*) = 1 as um_checkin, bool_and(nivel = 2) as nivel_2
  from public.checkins where paciente_id = '00000000-0000-4000-8000-000000000001' and nivel is not null;
select ultima_interacao_em > now() - interval '1 minute' as contou_como_interacao
  from public.pacientes where id = '00000000-0000-4000-8000-000000000001';
select resolucao = 'checkin' as resolveu_sem_resposta from public.alertas where gatilho = 'geral.checkin_sem_resposta';

\echo '--- 2. Toque repetido em 2 minutos não duplica'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select (public.registrar_rostinho(6) ->> 'novo_alerta')::boolean = false as nao_duplicou;
reset role;
select count(*) = 1 as continua_um from public.checkins where nivel is not null;
select count(*) = 0 as nenhum_alerta_muito_mal from public.alertas where gatilho = 'geral.checkin_muito_mal';

\echo '--- 3. "Muito mal" (nível 6): alerta laranja só para o responsável principal'
update public.checkins set feito_em = now() - interval '3 hours';
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select (public.registrar_rostinho(6) ->> 'novo_alerta')::boolean as criou_alerta;
reset role;
select count(*) = 1 as um_alerta,
       bool_and(nivel = 'laranja') as laranja,
       bool_and(avisados = array['11111111-1111-4111-8111-111111111111']::uuid[]) as so_o_responsavel
  from public.alertas where gatilho = 'geral.checkin_muito_mal';

\echo '--- 4. A família vê o nível; o estranho não vê nada'
set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select count(*) = 2 as acompanhante_ve from public.checkins where nivel is not null;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select count(*) = 0 as estranho_nao_ve from public.checkins;
reset role;

\echo '--- 5. deve dar erro: nível fora de 1 a 6'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.registrar_rostinho(7);
\echo '--- 6. deve dar erro: quem não é o aparelho da idosa'
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.registrar_rostinho(3);
reset role;
\echo '--- 7. deve dar erro: anon não executa'
set role anon;
select public.registrar_rostinho(3);
reset role;
