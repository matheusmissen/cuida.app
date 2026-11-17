-- Teste manual das condições de saúde (outras_condicoes), com usuários fictícios.
-- Rode num banco local depois de 'supabase db reset' (psql), como superusuário.
-- Cada linha de resultado deve sair 't'; os blocos marcados 'deve dar erro' precisam falhar.

\set ON_ERROR_STOP 0
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev'),
 ('22222222-2222-4222-8222-222222222222','estranho@ficticio.dev');

set role authenticated;

\echo '--- 1. Cadastro com condições do catálogo e texto livre'
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.criar_paciente('Paciente Teste', 'Teste', '{leucemia,hipertensao}', 'Neto', '  artrose  ') as novo \gset
select condicoes = '{leucemia,hipertensao}' as guardou_codigos, outras_condicoes = 'artrose' as guardou_texto_limpo
  from public.pacientes where id = :'novo';

\echo '--- 2. Cadastro antigo (sem o texto livre) continua funcionando'
select public.criar_paciente('Paciente Dois', null, '{}') is not null as chamada_antiga_ok;

\echo '--- 3. A família edita as condições em Ajustes'
update public.pacientes set condicoes = '{diabetes}', outras_condicoes = null where id = :'novo';
select condicoes = '{diabetes}' and outras_condicoes is null as editou from public.pacientes where id = :'novo';

\echo '--- 4. Texto livre acima de 300 caracteres (deve dar erro)'
update public.pacientes set outras_condicoes = repeat('a', 301) where id = :'novo';

\echo '--- 5. Estranho não edita (0 linhas)'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
with r as (update public.pacientes set outras_condicoes = 'x' where id = :'novo' returning 1)
select count(*) = 0 as estranho_bloqueado from r;
