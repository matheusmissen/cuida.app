-- Teste manual do consentimento do idoso (registrar_consentimento e ve_saude), com usuários fictícios.
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

\echo '--- 1. Aguardando consentimento: o responsável vê; o acompanhante não vê nada de saúde'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select count(*) > 0 as responsavel_ve_checkins from public.checkins;
select count(*) > 0 as responsavel_ve_remedios from public.remedios;
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select count(*) = 0 as acompanhante_nao_ve_checkins from public.checkins;
select count(*) = 0 as acompanhante_nao_ve_alertas from public.alertas;
select count(*) = 0 as acompanhante_nao_ve_remedios from public.remedios;
select count(*) = 0 as acompanhante_nao_ve_doses from public.doses;
select count(*) = 1 as acompanhante_ve_o_nome from public.pacientes;
reset role;

\echo '--- 2. deve dar erro: check-in antes do consentimento'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.registrar_rostinho(2);
reset role;

\echo '--- 3. deve dar erro: recusar guardar os dados'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.registrar_consentimento(false, true, true);
reset role;

\echo '--- 4. Idosa aceita guardar e a Lia, recusa mostrar para a família'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.registrar_consentimento(true, false, true)::text = '' as respondeu;
select (public.registrar_rostinho(2) ->> 'checkin_id') is not null as checkin_liberado;
reset role;
select consente_registro_em is not null and consente_familia_em is null and consente_lia_em is not null
       and consentimento_respondido_em is not null as gravou_as_tres
  from public.pacientes where id = '00000000-0000-4000-8000-000000000001';
select count(*) = 3 as historico_tem_as_tres from public.consentimentos_historico;
set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select count(*) = 0 as acompanhante_continua_sem_ver from public.checkins;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select count(*) > 0 as responsavel_continua_vendo from public.checkins;
select count(*) = 3 as responsavel_ve_o_historico from public.consentimentos_historico;
reset role;

\echo '--- 5. Pedido de ajuda sem "familia": avisados só o responsável'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select (public.pedir_ajuda() ->> 'novo')::boolean as criou;
reset role;
select avisados = array['11111111-1111-4111-8111-111111111111']::uuid[] as so_responsavel
  from public.alertas where gatilho = 'geral.pedido_de_ajuda';

\echo '--- 6. Idosa muda de ideia e aceita "familia": o acompanhante passa a ver'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.registrar_consentimento(true, true, true)::text = '' as respondeu;
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select count(*) > 0 as acompanhante_ve_checkins from public.checkins;
select count(*) > 0 as acompanhante_ve_remedios from public.remedios;
select count(*) = 0 as acompanhante_nao_ve_historico from public.consentimentos_historico;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select count(*) = 0 as estranho_nao_ve from public.checkins;
reset role;

\echo '--- 7. deve dar erro: a família não responde pelo idoso'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.registrar_consentimento(true, true, true);
reset role;
\echo '--- 7b. deve dar erro: o responsável tenta marcar o consentimento editando o paciente'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
update public.pacientes set consente_lia_em = null where id = '00000000-0000-4000-8000-000000000001';
reset role;
select consente_lia_em is not null as continua_como_a_idosa_escolheu
  from public.pacientes where id = '00000000-0000-4000-8000-000000000001';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
update public.pacientes set telefone = '11999990000' where id = '00000000-0000-4000-8000-000000000001';
reset role;
select telefone = '11999990000' as familia_ainda_edita_o_resto
  from public.pacientes where id = '00000000-0000-4000-8000-000000000001';
\echo '--- 8. deve dar erro: anon não executa'
set role anon;
select public.registrar_consentimento(true, true, true);
reset role;
