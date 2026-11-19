-- Teste manual do pedido médico (conferir_pedido). Dados fictícios.
-- Rode como superusuário num banco local depois de aplicar as migrations e o seed (psql).
-- Cada linha de resultado deve sair 't'; os blocos marcados 'deve dar erro' precisam falhar.
\set ON_ERROR_STOP 0

insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev'),
 ('22222222-2222-4222-8222-222222222222','estranho@ficticio.dev')
on conflict do nothing;
insert into public.cuidadores (usuario_id, paciente_id, papel) values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal')
on conflict do nothing;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

\echo '--- 1. Neto envia um pedido: entra como enviado, esperando a leitura'
insert into public.documentos (id, paciente_id, tipo, titulo, arquivo_path, mime) values
 ('e0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','pedido','Pedido médico · Hematologia',
  '00000000-0000-4000-8000-000000000001/pedido-1.jpg','image/jpeg'),
 ('e0000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','pedido','Pedido médico',
  '00000000-0000-4000-8000-000000000001/pedido-2.jpg','image/jpeg');
select status = 'enviado' as entrou_enviado from public.documentos where id = 'e0000000-0000-4000-8000-000000000001';

\echo '--- 2. deve dar erro: o app não liga o pedido a uma consulta sozinho'
update public.documentos set consulta_id = gen_random_uuid() where id = 'e0000000-0000-4000-8000-000000000001';

\echo '--- 3. O servidor grava a leitura (aguardando conferência)'
reset role;
update public.documentos set status = 'aguardando_conferencia', leitura = '{"pedido":{"especialidade":"Hematologia"}}'
 where tipo::text = 'pedido';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

\echo '--- 4. deve dar erro: sem médico nem especialidade'
select public.conferir_pedido('e0000000-0000-4000-8000-000000000001', jsonb_build_object('quando', (now() + interval '5 days')::text));
\echo '--- 5. deve dar erro: data que já passou'
select public.conferir_pedido('e0000000-0000-4000-8000-000000000001', jsonb_build_object('quando', (now() - interval '1 day')::text, 'especialidade', 'Hematologia'));

\echo '--- 6. Neto confere: cria a consulta e marca o pedido'
select public.conferir_pedido('e0000000-0000-4000-8000-000000000001', jsonb_build_object(
  'quando', (now() + interval '5 days')::text, 'medico', 'Dra. Fictícia', 'especialidade', 'Hematologia',
  'local', 'Clínica Exemplo', 'observacao', 'Levar exames')) is not null as criou_consulta;
select count(*) = 1 as consulta_existe from public.consultas where medico = 'Dra. Fictícia' and local = 'Clínica Exemplo';
select status = 'conferida' and consulta_id is not null as pedido_conferido
  from public.documentos where id = 'e0000000-0000-4000-8000-000000000001';

\echo '--- 7. deve dar erro: conferir de novo'
select public.conferir_pedido('e0000000-0000-4000-8000-000000000001', null);

\echo '--- 8. Guardar sem consulta: só marca como conferido'
select public.conferir_pedido('e0000000-0000-4000-8000-000000000002', null) is null as sem_consulta;
select status = 'conferida' and consulta_id is null as guardado from public.documentos where id = 'e0000000-0000-4000-8000-000000000002';

\echo '--- 9. deve dar erro: estranho não confere o pedido de outra família'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select public.conferir_pedido('e0000000-0000-4000-8000-000000000002', null);

\echo '--- 10. deve dar erro: receita não vira consulta'
reset role;
insert into public.documentos (id, paciente_id, tipo, titulo, arquivo_path, mime, enviado_por) values
 ('e0000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','receita','Receita',
  '00000000-0000-4000-8000-000000000001/r.jpg','image/jpeg','11111111-1111-4111-8111-111111111111');
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.conferir_pedido('e0000000-0000-4000-8000-000000000003', null);
reset role;
