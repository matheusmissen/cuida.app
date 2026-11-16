-- Teste manual de documentos e criação de alarmes a partir da receita. Dados fictícios.
-- Rode como superusuário num banco local depois de aplicar as migrations e o seed (psql).
-- Linhas "deve dar erro" precisam falhar; as demais mostram o resultado esperado ao lado.
\set ON_ERROR_STOP 0

insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev'),
 ('22222222-2222-4222-8222-222222222222','estranho@ficticio.dev'),
 ('33333333-3333-4333-8333-333333333333','aparelho-idosa@ficticio.dev')
on conflict do nothing;
insert into public.cuidadores (usuario_id, paciente_id, papel) values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal')
on conflict do nothing;
update public.pacientes set usuario_id = '33333333-3333-4333-8333-333333333333'
 where id = '00000000-0000-4000-8000-000000000001';

set role authenticated;

\echo '--- 1. Neto envia uma receita e um exame'
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
insert into public.documentos (id, paciente_id, tipo, titulo, arquivo_path, mime) values
 ('d0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','receita','Receita · Dra. Fictícia',
  '00000000-0000-4000-8000-000000000001/receita-1.jpg','image/jpeg');
insert into public.documentos (paciente_id, tipo, titulo, arquivo_path, mime, status) values
 ('00000000-0000-4000-8000-000000000001','exame','Hemograma',
  '00000000-0000-4000-8000-000000000001/exame-1.pdf','application/pdf','conferida');
select count(*) as documentos_do_neto from public.documentos;  -- 2

\echo '--- 2. Arquivo no Storage: na pasta da paciente funciona; em outra pasta deve dar erro'
insert into storage.objects (bucket_id, name) values ('documentos','00000000-0000-4000-8000-000000000001/receita-1.jpg');
insert into storage.objects (bucket_id, name) values ('documentos','99999999-9999-4999-8999-999999999999/x.jpg');

\echo '--- 3. Neto não pode escrever a leitura da IA nem mudar o status (deve dar erro)'
update public.documentos set leitura = '{"itens":[]}' where id = 'd0000000-0000-4000-8000-000000000001';

\echo '--- 4. Estranho e aparelho da idosa não veem documentos nem arquivos'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select count(*) as docs_estranho, (select count(*) from storage.objects) as arquivos_estranho from public.documentos;  -- 0 | 0
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select count(*) as docs_idosa from public.documentos;  -- 0

\echo '--- 5. Estranho não cria alarmes na receita dos outros (deve dar erro)'
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select public.criar_alarmes_da_receita('d0000000-0000-4000-8000-000000000001', '[{"nome":"X","dose":"1","horarios":["08:00"]}]');

\echo '--- 6. Servidor grava a leitura (como a Edge Function ler-receita)'
reset role;
update public.documentos set status = 'aguardando_conferencia',
  leitura = '{"itens":[{"nome":"Remédio C"},{"nome":"Remédio D"},{"nome":"Remédio E"}]}'
 where id = 'd0000000-0000-4000-8000-000000000001';
set role authenticated;

\echo '--- 7. Horário inválido e item sem horário (devem dar erro, nada é criado)'
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.criar_alarmes_da_receita('d0000000-0000-4000-8000-000000000001', '[{"nome":"Remédio C","dose":"1 comprimido","horarios":["25:00"]}]');
select public.criar_alarmes_da_receita('d0000000-0000-4000-8000-000000000001', '[{"nome":"Remédio E","dose":"1 comprimido","horarios":[]}]');
select count(*) as remedios_c_criados from public.remedios where nome = 'Remédio C';  -- 0

\echo '--- 8. Neto confere: cria 4 horários (Remédio E fica de fora)'
select public.criar_alarmes_da_receita('d0000000-0000-4000-8000-000000000001',
  '[{"nome":"Remédio C","dose":"1 comprimido","horarios":["06:00","14:00","22:00"],"duracao_dias":7},
    {"nome":"Remédio D","dose":"20 gotas","horarios":["22:00"]}]') as horarios_criados;  -- 4
select nome, termina_em - (now() at time zone 'America/Sao_Paulo')::date as dias_restantes
  from public.remedios where nome in ('Remédio C','Remédio D') order by nome;  -- C: 6 | D: (vazio)
select status, conferido_por is not null as conferido from public.documentos where id = 'd0000000-0000-4000-8000-000000000001';  -- conferida | t
select count(*) > 0 as doses_geradas from public.doses d join public.horarios h on h.id = d.horario_id
  join public.remedios r on r.id = h.remedio_id where r.nome = 'Remédio C';  -- t

\echo '--- 9. Receita já conferida não cria de novo (deve dar erro)'
select public.criar_alarmes_da_receita('d0000000-0000-4000-8000-000000000001', '[{"nome":"Remédio C","dose":"1","horarios":["08:00"]}]');

\echo '--- 10. Exame não cria alarmes (deve dar erro)'
select public.criar_alarmes_da_receita((select id from public.documentos where tipo = 'exame' limit 1), '[{"nome":"X","dose":"1","horarios":["08:00"]}]');

\echo '--- 11. Fim de tratamento: nenhuma dose depois de termina_em'
reset role;
select public._gerar_doses((now() at time zone 'America/Sao_Paulo')::date + 10) >= 0 as gerou;
select count(*) as doses_do_c_no_dia_10 from public.doses d join public.horarios h on h.id = d.horario_id
  join public.remedios r on r.id = h.remedio_id
 where r.nome = 'Remédio C' and (d.previsto_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date + 10;  -- 0
select count(*) > 0 as doses_do_d_no_dia_10 from public.doses d join public.horarios h on h.id = d.horario_id
  join public.remedios r on r.id = h.remedio_id
 where r.nome = 'Remédio D' and (d.previsto_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date + 10;  -- t
