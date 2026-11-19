-- Teste manual da tela "Hora do remédio": cor, formato e quem vê/envia a foto da caixa.
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

\echo '--- 1. O responsável marca cor e formato'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
update public.remedios set cor = 'branco', formato = 'redondo', foto_url = '00000000-0000-4000-8000-000000000001/caixa.jpg'
 where id = '00000000-0000-4000-8000-0000000000a1';
reset role;
select cor = 'branco' and formato = 'redondo' as gravou from public.remedios where id = '00000000-0000-4000-8000-0000000000a1';

\echo '--- 2. deve dar erro: cor fora do catálogo'
update public.remedios set cor = 'roxo-neon' where id = '00000000-0000-4000-8000-0000000000a1';

\echo '--- 3. Foto da caixa: idoso e responsável veem; responsável envia'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.pode_ver_foto_remedio('00000000-0000-4000-8000-000000000001/caixa.jpg') as idoso_ve;
select not public.pode_enviar_foto_remedio('00000000-0000-4000-8000-000000000001/caixa.jpg') as idoso_nao_envia;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.pode_ver_foto_remedio('00000000-0000-4000-8000-000000000001/caixa.jpg') as responsavel_ve;
select public.pode_enviar_foto_remedio('00000000-0000-4000-8000-000000000001/caixa.jpg') as responsavel_envia;
select not public.pode_enviar_foto_remedio('99999999-0000-4000-8000-000000000001/caixa.jpg') as nao_envia_em_outra_pasta;
select not public.pode_ver_foto_remedio('../caixa.jpg') as pasta_invalida;

\echo '--- 4. Acompanhante: sem "mostrar para a família" não vê; com, vê; nunca envia'
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select not public.pode_ver_foto_remedio('00000000-0000-4000-8000-000000000001/caixa.jpg') as acompanhante_nao_ve;
reset role;
reset request.jwt.claim.sub;
update public.pacientes set consente_familia_em = now() where id = '00000000-0000-4000-8000-000000000001';
set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select public.pode_ver_foto_remedio('00000000-0000-4000-8000-000000000001/caixa.jpg') as acompanhante_ve;
select not public.pode_enviar_foto_remedio('00000000-0000-4000-8000-000000000001/caixa.jpg') as acompanhante_nao_envia;

\echo '--- 5. Estranho não vê nada'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select not public.pode_ver_foto_remedio('00000000-0000-4000-8000-000000000001/caixa.jpg') as estranho_nao_ve;
reset role;
select public = false as bucket_privado from storage.buckets where id = 'remedios';
