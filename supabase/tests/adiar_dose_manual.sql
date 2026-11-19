-- Teste manual do "Lembrar em 10 minutos" no servidor (adiar_dose), com usuários fictícios.
-- Rode num banco local depois de 'supabase db reset' (psql), como superusuário.
-- Cada linha de resultado deve sair 't' (verdadeiro); os blocos marcados 'deve dar erro' precisam falhar.

\set ON_ERROR_STOP 0
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','responsavel@ficticio.dev'),
 ('33333333-3333-4333-8333-333333333333','aparelho-idosa@ficticio.dev');
insert into public.cuidadores (usuario_id, paciente_id, papel, ordem_escala) values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal', 1);
update public.pacientes set usuario_id = '33333333-3333-4333-8333-333333333333'
 where id = '00000000-0000-4000-8000-000000000001';
create temp table alvo as
  select id from public.doses where paciente_id = '00000000-0000-4000-8000-000000000001' and confirmado_em is null limit 1;
grant select on alvo to authenticated, anon;

\echo '--- 1. A idosa adia: a dose fica adiada por 10 minutos'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.adiar_dose((select id from alvo)) between now() + interval '9 minutes' and now() + interval '11 minutes' as dez_minutos;
reset role;
select adiada_ate is not null and lembrete_adiado_em is null as gravou from public.doses where id = (select id from alvo);

\echo '--- 2. Adiar de novo zera o lembrete já mandado'
update public.doses set lembrete_adiado_em = now() where id = (select id from alvo);
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.adiar_dose((select id from alvo), 5) is not null as adiou_de_novo;
reset role;
select lembrete_adiado_em is null as lembrete_zerado from public.doses where id = (select id from alvo);

\echo '--- 3. Dose já tomada: não adia'
update public.doses set confirmado_em = now(), status = 'tomado' where id = (select id from alvo);
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.adiar_dose((select id from alvo)) is null as nao_adia_tomada;

\echo '--- 4. deve dar erro: a família não adia pelo idoso'
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.adiar_dose((select id from alvo));
\echo '--- 5. deve dar erro: adiar mais de 60 minutos'
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.adiar_dose((select id from alvo), 120);
reset role;
