-- Teste manual do botão "Preciso de ajuda" (pedir_ajuda), com usuários fictícios.
-- Rode num banco local depois de 'supabase db reset' (psql), como superusuário.
-- Cada linha de resultado deve sair 't' (verdadeiro); os blocos marcados 'deve dar erro' precisam falhar.

\set ON_ERROR_STOP 0
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev'),
 ('22222222-2222-4222-8222-222222222222','estranho@ficticio.dev'),
 ('33333333-3333-4333-8333-333333333333','aparelho-idosa@ficticio.dev'),
 ('44444444-4444-4444-8444-444444444444','filha@ficticio.dev');
insert into public.cuidadores (usuario_id, paciente_id, papel, ordem_escala) values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal', 1),
 ('44444444-4444-4444-8444-444444444444','00000000-0000-4000-8000-000000000001','apoio', 2);
update public.pacientes set usuario_id = '33333333-3333-4333-8333-333333333333', ultima_interacao_em = now() - interval '5 hours'
 where id = '00000000-0000-4000-8000-000000000001';

set role authenticated;

\echo '--- 1. Aparelho da idosa aperta o botão: alerta vermelho para todo o círculo'
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select (public.pedir_ajuda() ->> 'novo')::boolean as criou_alerta;
reset role;
select count(*) = 1 as um_alerta,
       bool_and(nivel = 'vermelho') as vermelho,
       bool_and(avisados @> array['11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444']::uuid[]) as avisou_os_dois
  from public.alertas where gatilho = 'geral.pedido_de_ajuda';
select ultima_interacao_em > now() - interval '1 minute' as contou_como_interacao
  from public.pacientes where id = '00000000-0000-4000-8000-000000000001';

\echo '--- 2. Toque repetido em 2 minutos devolve o mesmo alerta'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select (public.pedir_ajuda() ->> 'novo')::boolean = false as nao_duplicou;
reset role;
select count(*) = 1 as continua_um from public.alertas where gatilho = 'geral.pedido_de_ajuda';

\echo '--- 3. Depois de 2 minutos, um novo toque cria outro alerta'
update public.alertas set criado_em = now() - interval '3 minutes' where gatilho = 'geral.pedido_de_ajuda';
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select (public.pedir_ajuda() ->> 'novo')::boolean as criou_outro;

\echo '--- 4. A família vê o alerta (RLS)'
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select count(*) = 2 as neto_ve from public.alertas where gatilho = 'geral.pedido_de_ajuda';

\echo '--- 5. Quem não é aparelho de paciente não pede ajuda (deve dar erro)'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select public.pedir_ajuda();
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.pedir_ajuda();

\echo '--- 6. Usuário anônimo sem login não chama a função (deve dar erro)'
reset role;
set role anon;
select public.pedir_ajuda();
