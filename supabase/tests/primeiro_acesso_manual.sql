-- Teste manual do primeiro acesso do idoso (Etapa 6), com usuários fictícios.
-- Rode num banco local depois de aplicar as migrations e o seed (psql), como superusuário.
-- Cada linha de resultado deve sair 't' (verdadeiro). Tudo é desfeito no fim (rollback).

\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email, is_anonymous) values
 ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev', false),
 ('33333333-3333-4333-8333-333333333333', null, true),
 ('55555555-5555-4555-8555-555555555555', null, true);
insert into public.cuidadores (usuario_id, paciente_id, papel) values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal');
create temp table c (codigo text);
grant all on c to authenticated;

\echo '--- 1. A família gera um código de 4 números, válido por 30 minutos'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
insert into c select public.gerar_codigo_vinculo('00000000-0000-4000-8000-000000000001');
reset role;
select codigo ~ '^[0-9]{4}$' as quatro_numeros from c;
select expira_em between now() + interval '29 minutes' and now() + interval '31 minutes' as vale_30_min
  from public.codigos_vinculo where codigo = (select codigo from c);

\echo '--- 2. Gerar outro apaga o anterior (um código ativo por paciente)'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
truncate c;
insert into c select public.gerar_codigo_vinculo('00000000-0000-4000-8000-000000000001');
reset role;
select count(*) = 1 as um_codigo_ativo from public.codigos_vinculo where paciente_id = '00000000-0000-4000-8000-000000000001';

\echo '--- 3. Código errado devolve null e conta como tentativa'
set role authenticated;
set request.jwt.claim.sub = '55555555-5555-4555-8555-555555555555';
select public.vincular_aparelho(case when (select codigo from c) = '0000' then '1111' else '0000' end) is null as errado_e_null;
reset role;
select count(*) = 1 as tentativa_registrada from public.tentativas_vinculo where usuario_id = '55555555-5555-4555-8555-555555555555';

\echo '--- 4. Depois de 5 erros em 15 minutos, bloqueia (mesmo com o código certo)'
insert into public.tentativas_vinculo (usuario_id) select '55555555-5555-4555-8555-555555555555' from generate_series(1, 4);
set role authenticated;
set request.jwt.claim.sub = '55555555-5555-4555-8555-555555555555';
savepoint s1;
do $$ begin
  perform public.vincular_aparelho((select codigo from c));
  raise exception 'deveria bloquear';
exception when raise_exception then
  if sqlerrm not like 'Muitas tentativas%' then raise; end if;
end $$;
select true as bloqueou_depois_de_5;

\echo '--- 5. Outro aparelho com o código certo conecta à paciente; o código não serve de novo'
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.vincular_aparelho(' ' || (select codigo from c) || ' ') = '00000000-0000-4000-8000-000000000001' as conectou;
select public.vincular_aparelho((select codigo from c)) is null as codigo_usado_nao_vale;
reset role;
select usuario_id = '33333333-3333-4333-8333-333333333333' as paciente_ligada_ao_aparelho
  from public.pacientes where id = '00000000-0000-4000-8000-000000000001';

\echo '--- 6. Código vencido não vale; anônimo sem login não chama'
update public.codigos_vinculo set expira_em = now() - interval '1 minute';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
truncate c;
insert into c select public.gerar_codigo_vinculo('00000000-0000-4000-8000-000000000001');
reset role;
update public.codigos_vinculo set expira_em = now() - interval '1 minute' where codigo = (select codigo from c);
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.vincular_aparelho((select codigo from c)) is null as vencido_nao_vale;
reset role;
set role anon;
savepoint s2;
do $$ begin
  perform public.vincular_aparelho('1234');
  raise exception 'anon não deveria chamar';
exception when insufficient_privilege then null; end $$;
select true as anon_bloqueado;

rollback;
