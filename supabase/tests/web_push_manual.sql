-- Teste manual das inscrições de web push (Etapa 3), com usuários fictícios.
-- Rode num banco local depois de aplicar as migrations e o seed (psql), como superusuário.
-- Cada linha de resultado deve sair 't' (verdadeiro). Tudo é desfeito no fim (rollback).

\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev'),
 ('22222222-2222-4222-8222-222222222222','estranho@ficticio.dev');

\set p256dh '''BHEed36FTbL5x4wSJvv2rJs6HMGPtc7LzFEDG4rszdb1IcbxQ2EbpuR4Nz3NuQ_fPOscQrVrEqKv2XLtzKUlBfM'''

\echo '--- 1. O neto salva a inscrição do navegador; salvar de novo não duplica'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.salvar_inscricao_push('https://push.exemplo/abc', :p256dh, 'BTBZMqHH6r4Tts7J_aSIgg', 'familia') is not null as salvou;
select public.salvar_inscricao_push('https://push.exemplo/abc', :p256dh, 'BTBZMqHH6r4Tts7J_aSIgg', 'familia') is not null as salvou_de_novo;
select count(*) = 1 as uma_so from public.inscricoes_push;

\echo '--- 2. O estranho não vê nem apaga a inscrição do neto'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select count(*) = 0 as estranho_nao_ve from public.inscricoes_push;
delete from public.inscricoes_push;
reset role;
select count(*) = 1 as continua_la from public.inscricoes_push;

\echo '--- 3. Não dá para gravar direto na tabela (só pela função)'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
savepoint s1;
do $$ begin
  insert into public.inscricoes_push (usuario_id, app, endpoint, p256dh, auth)
  values ('11111111-1111-4111-8111-111111111111', 'familia', 'https://push.exemplo/x', repeat('a', 87), repeat('b', 22));
  raise exception 'deveria recusar';
exception when insufficient_privilege then null; end $$;
select true as insert_direto_recusado;

\echo '--- 4. Mesmo navegador, outra conta: a inscrição passa para quem está logado'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select public.salvar_inscricao_push('https://push.exemplo/abc', :p256dh, 'BTBZMqHH6r4Tts7J_aSIgg', 'familia') is not null as trocou;
reset role;
select usuario_id = '22222222-2222-4222-8222-222222222222' as agora_e_do_outro from public.inscricoes_push;

\echo '--- 5. Endereço que não é https e app desconhecido são recusados'
set role authenticated;
savepoint s2;
do $$ begin
  perform public.salvar_inscricao_push('http://inseguro/abc', repeat('a', 87), repeat('b', 22), 'familia');
  raise exception 'deveria recusar http';
exception when check_violation then null; end $$;
do $$ begin
  perform public.salvar_inscricao_push('https://push.exemplo/y', repeat('a', 87), repeat('b', 22), 'outro');
  raise exception 'deveria recusar app';
exception when check_violation then null; end $$;
select true as validacoes_ok;

\echo '--- 6. Anônimo (sem login) não salva'
reset role;
set role anon;
savepoint s3;
do $$ begin
  perform public.salvar_inscricao_push('https://push.exemplo/z', repeat('a', 87), repeat('b', 22), 'familia');
  raise exception 'deveria recusar anon';
exception when insufficient_privilege then null; end $$;
select true as anon_recusado;
reset role;

\echo '--- 7. Colunas dos lembretes existem'
select count(*) = 2 as colunas_de_lembrete from information_schema.columns
 where (table_name, column_name) in (('doses', 'lembrete_em'), ('pacientes', 'lembrete_checkin_em'));

rollback;
