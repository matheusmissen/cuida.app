-- Teste manual de "Apagar minha conta" (apagar_conta, resumo_para_apagar_conta). Dados fictícios.
-- Rode como superusuário num banco local depois de aplicar as migrations e o seed (psql).
-- Cada linha de resultado deve sair 't'; os blocos marcados 'deve dar erro' precisam falhar.
\set ON_ERROR_STOP 0

-- Paciente do seed (0001): neto responsável + filha acompanhante. Paciente 0002: só o neto.
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev'),
 ('22222222-2222-4222-8222-222222222222','filha@ficticio.dev'),
 ('33333333-3333-4333-8333-333333333333','aparelho-idosa@ficticio.dev')
on conflict do nothing;
insert into public.pacientes (id, nome) values ('00000000-0000-4000-8000-000000000002', 'Seu José Fictício');
insert into public.cuidadores (usuario_id, paciente_id, papel, ordem_escala) values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal', 1),
 ('22222222-2222-4222-8222-222222222222','00000000-0000-4000-8000-000000000001','apoio', 2),
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000002','principal', 1);
update public.pacientes set usuario_id = '33333333-3333-4333-8333-333333333333' where id = '00000000-0000-4000-8000-000000000001';
insert into public.documentos (paciente_id, tipo, titulo, arquivo_path, mime, status, enviado_por) values
 ('00000000-0000-4000-8000-000000000001','exame','Hemograma','00000000-0000-4000-8000-000000000001/e.pdf','application/pdf','conferida','11111111-1111-4111-8111-111111111111');

\echo '--- 1. O resumo mostra os dois grupos do neto: num ele não está sozinho, no outro está'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select count(*) = 2 as dois_grupos,
       bool_or(sozinho and nome = 'Seu José Fictício') as sozinho_com_jose,
       bool_or(not sozinho and papel = 'principal') as acompanhado_na_outra
  from public.resumo_para_apagar_conta();

\echo '--- 2. deve dar erro: o app não chama apagar_conta (só o servidor)'
select * from public.apagar_conta('11111111-1111-4111-8111-111111111111');
reset role;

\echo '--- 3. deve dar erro: o celular do idoso não é conta da família'
select * from public.apagar_conta('33333333-3333-4333-8333-333333333333');

\echo '--- 4. O servidor apaga a conta do neto'
create temp table apagados as select * from public.apagar_conta('11111111-1111-4111-8111-111111111111') as id;
select array_agg(id) = array['00000000-0000-4000-8000-000000000002'::uuid] as so_jose_apagado from apagados;
select not exists (select 1 from public.pacientes where id = '00000000-0000-4000-8000-000000000002') as jose_sem_dados;
select exists (select 1 from public.pacientes where id = '00000000-0000-4000-8000-000000000001') as maria_continua;
select papel = 'principal' as filha_virou_responsavel from public.cuidadores
 where usuario_id = '22222222-2222-4222-8222-222222222222' and paciente_id = '00000000-0000-4000-8000-000000000001';
select not exists (select 1 from public.cuidadores where usuario_id = '11111111-1111-4111-8111-111111111111') as neto_fora_de_tudo;

\echo '--- 5. Apagar o usuário do Auth funciona e o documento que ele enviou fica no grupo'
delete from auth.users where id = '11111111-1111-4111-8111-111111111111';
select enviado_por is null as documento_continua from public.documentos where titulo = 'Hemograma';

\echo '--- 6. deve dar erro: a conta de demonstração dos jurados não é apagada'
insert into auth.users (id, email) values ('44444444-4444-4444-8444-444444444444','jurados@example.com');
select * from public.apagar_conta('44444444-4444-4444-8444-444444444444');
