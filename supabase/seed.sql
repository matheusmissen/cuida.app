-- Seed de demonstração. TODOS OS DADOS SÃO FICTÍCIOS (exigência do Hack Brasil para projetos de saúde).
-- Roda automaticamente em `supabase db reset`.
-- Para ver os dados no app da família: crie sua conta e rode
--   insert into public.cuidadores (usuario_id, paciente_id, papel, nome_exibicao)
--   values ('<seu auth.users.id>', '00000000-0000-4000-8000-000000000001', 'principal', 'Neto');

insert into public.pacientes (id, nome, apelido, data_nascimento, condicoes, limite_febre, medico_contato, consentimento_em, ultima_interacao_em)
values (
  '00000000-0000-4000-8000-000000000001',
  'Maria Aparecida Souza', 'Dona Maria', '1948-03-12',
  '{leucemia}', 37.8, 'Dra. Fictícia — Hematologia (11) 0000-0000',
  now() - interval '7 days', now() - interval '20 minutes'
);

insert into public.remedios (id, paciente_id, nome, dose, critico, estoque_doses) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'Remédio A (oral)', '1 comprimido', true, 28),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', 'Remédio B (pressão)', '1 comprimido', false, 8),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-000000000001', 'Vitamina D', '10 gotas', false, 60);

insert into public.horarios (id, remedio_id, paciente_id, hora) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', '08:00'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', '08:00'),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', '20:00'),
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-000000000001', '12:00');

-- Doses de hoje (horário de Brasília)
insert into public.doses (horario_id, paciente_id, previsto_em, confirmado_em, status) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000001',
   (current_date + time '08:00') at time zone 'America/Sao_Paulo',
   (current_date + time '08:04') at time zone 'America/Sao_Paulo', 'tomado'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000001',
   (current_date + time '08:00') at time zone 'America/Sao_Paulo',
   (current_date + time '08:05') at time zone 'America/Sao_Paulo', 'tomado'),
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-000000000001',
   (current_date + time '12:00') at time zone 'America/Sao_Paulo', null, 'pendente'),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-000000000001',
   (current_date + time '20:00') at time zone 'America/Sao_Paulo', null, 'pendente');

-- Últimos check-ins: dois dias tranquilos e hoje com cansaço (o vídeo mostra o alerta de febre ao vivo)
insert into public.checkins (paciente_id, feito_em, febre, temperatura, sangramento, manchas, cansaco, humor, sono, notas) values
  ('00000000-0000-4000-8000-000000000001', now() - interval '2 days', false, 36.4, false, false, 'leve', 'bom', 'dormiu bem', 'Contou da visita da vizinha.'),
  ('00000000-0000-4000-8000-000000000001', now() - interval '1 day', false, 36.6, false, false, 'leve', 'regular', 'acordou uma vez', null),
  ('00000000-0000-4000-8000-000000000001', now() - interval '3 hours', false, null, false, false, 'forte', 'regular', 'acordou cansada', 'Disse que está "meio caída".');

insert into public.regras (paciente_id, gatilho, nivel) values
  ('00000000-0000-4000-8000-000000000001', 'leucemia.febre', 'vermelho'),
  ('00000000-0000-4000-8000-000000000001', 'leucemia.sangramento', 'vermelho'),
  ('00000000-0000-4000-8000-000000000001', 'leucemia.manchas', 'laranja'),
  ('00000000-0000-4000-8000-000000000001', 'leucemia.infeccao', 'laranja'),
  ('00000000-0000-4000-8000-000000000001', 'leucemia.cansaco', 'laranja'),
  ('00000000-0000-4000-8000-000000000001', 'leucemia.apetite', 'amarelo');

insert into public.alertas (paciente_id, gatilho, nivel, motivo, criado_em) values
  ('00000000-0000-4000-8000-000000000001', 'geral.estoque_baixo', 'amarelo', 'Remédio B (pressão): estoque para menos de 5 dias.', now() - interval '1 hour');

insert into public.memoria_paciente (paciente_id, chave, valor) values
  ('00000000-0000-4000-8000-000000000001', 'tratamento', 'Dona Maria'),
  ('00000000-0000-4000-8000-000000000001', 'familia', 'Neto Lucas (cuida dos remédios), filha Ana (mora em outra cidade)'),
  ('00000000-0000-4000-8000-000000000001', 'rotina', 'Acorda às 7h, gosta de conversar sobre as plantas do quintal');
