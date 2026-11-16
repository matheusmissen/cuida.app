-- Teste manual de RLS com usuários fictícios.
-- Rode num banco local depois de 'supabase db reset' (psql), como superusuário.
-- Os blocos marcados 'deve dar erro' precisam falhar.

\set ON_ERROR_STOP 0
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev'),
 ('22222222-2222-4222-8222-222222222222','estranho@ficticio.dev'),
 ('33333333-3333-4333-8333-333333333333','aparelho-idosa@ficticio.dev');
insert into public.cuidadores (usuario_id, paciente_id, papel) values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal');

set role authenticated;

\echo '--- 1. Neto (cuidador) vê a paciente e os check-ins'
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select count(*) as pacientes_visiveis from public.pacientes;
select count(*) as checkins_visiveis from public.checkins;

\echo '--- 2. Estranho não vê nada'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select count(*) as pacientes_visiveis from public.pacientes;
select count(*) as checkins_visiveis from public.checkins;
select count(*) as alertas_visiveis from public.alertas;

\echo '--- 3. Estranho não consegue registrar check-in (deve dar erro de RLS)'
insert into public.checkins (paciente_id, febre) values ('00000000-0000-4000-8000-000000000001', true);

\echo '--- 4. Neto gera código, aparelho da idosa vincula'
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.gerar_codigo_vinculo('00000000-0000-4000-8000-000000000001') as codigo \gset
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.vincular_aparelho(:'codigo') = '00000000-0000-4000-8000-000000000001' as vinculou;

\echo '--- 5. Código não pode ser reutilizado (deve dar erro)'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select public.vincular_aparelho(:'codigo');

\echo '--- 6. Idosa registra check-in, confirma dose e lê remédios; não edita remédios'
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
insert into public.checkins (paciente_id, febre, temperatura) values ('00000000-0000-4000-8000-000000000001', true, 38.2);
select count(*) as checkins_agora from public.checkins;
update public.doses set confirmado_em = now(), status = 'tomado' where status = 'pendente' and previsto_em = (select min(previsto_em) from public.doses where status='pendente');
select count(*) filter (where status='tomado') as doses_tomadas from public.doses;
select count(*) as remedios_visiveis from public.remedios;
update public.remedios set dose = '5 comprimidos';
select count(*) filter (where dose = '5 comprimidos') as remedios_alterados_pela_idosa from public.remedios;

\echo '--- 7. Estranho não cria paciente direto na tabela (deve dar erro), mas cria pela função'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
insert into public.pacientes (nome) values ('Teste');
select public.criar_paciente('Paciente Teste', 'Teste', '{}') is not null as criou_pela_funcao;
select count(*) as pacientes_do_estranho from public.pacientes;

\echo '--- 8. Usuário anônimo (sem login) não vê nada'
reset role; set role anon; reset request.jwt.claim.sub;
select count(*) from public.pacientes;
