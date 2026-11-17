-- Seed de demonstração. TODOS OS DADOS SÃO FICTÍCIOS (exigência do Hack Brasil para projetos de saúde).
-- Roda automaticamente em `supabase db reset`.
-- Documentos não entram no seed (precisam de arquivo no Storage): envie uma receita fictícia pelo app
-- da família durante a demo.
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

-- Doses de hoje. "Hoje" é sempre o dia de Brasília (o servidor roda em UTC: depois das 21h o
-- current_date já seria amanhã).
insert into public.doses (horario_id, paciente_id, previsto_em, confirmado_em, status) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000001',
   ((now() at time zone 'America/Sao_Paulo')::date + time '08:00') at time zone 'America/Sao_Paulo',
   ((now() at time zone 'America/Sao_Paulo')::date + time '08:04') at time zone 'America/Sao_Paulo', 'tomado'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000001',
   ((now() at time zone 'America/Sao_Paulo')::date + time '08:00') at time zone 'America/Sao_Paulo',
   ((now() at time zone 'America/Sao_Paulo')::date + time '08:05') at time zone 'America/Sao_Paulo', 'tomado'),
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-000000000001',
   ((now() at time zone 'America/Sao_Paulo')::date + time '12:00') at time zone 'America/Sao_Paulo', null, 'pendente'),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-000000000001',
   ((now() at time zone 'America/Sao_Paulo')::date + time '20:00') at time zone 'America/Sao_Paulo', null, 'pendente');

-- Últimos 7 dias de doses: quase todas tomadas; anteontem ela esqueceu o Remédio B da noite
-- (gerou o alerta laranja de dose perdida, mais abaixo) e há 3 dias tomou a vitamina atrasada.
insert into public.doses (horario_id, paciente_id, previsto_em, confirmado_em, realarmado_em, status)
select h.id, h.paciente_id,
       (((now() at time zone 'America/Sao_Paulo')::date - d) + h.hora) at time zone 'America/Sao_Paulo',
       case
         when d = 2 and h.hora = '20:00' then null
         when d = 3 and h.hora = '12:00' then (((now() at time zone 'America/Sao_Paulo')::date - d) + h.hora + interval '50 minutes') at time zone 'America/Sao_Paulo'
         else (((now() at time zone 'America/Sao_Paulo')::date - d) + h.hora + interval '3 minutes') at time zone 'America/Sao_Paulo'
       end,
       case when (d = 2 and h.hora = '20:00') or (d = 3 and h.hora = '12:00')
            then (((now() at time zone 'America/Sao_Paulo')::date - d) + h.hora + interval '30 minutes') at time zone 'America/Sao_Paulo' end,
       (case when d = 2 and h.hora = '20:00' then 'perdido' else 'tomado' end)::public.status_dose
  from public.horarios h
 cross join generate_series(1, 7) as d
 where h.paciente_id = '00000000-0000-4000-8000-000000000001';

-- Check-ins da última semana: dias tranquilos, um dia mais ou menos e hoje com cansaço
-- (o vídeo mostra o alerta de febre ao vivo, com a fala "tô quentinha").
insert into public.checkins (paciente_id, feito_em, febre, temperatura, sangramento, manchas, cansaco, humor, sono, notas) values
  ('00000000-0000-4000-8000-000000000001', now() - interval '6 days', false, 36.3, false, false, 'nenhum', 'bom', 'dormiu bem', 'Falou das plantas do quintal.'),
  ('00000000-0000-4000-8000-000000000001', now() - interval '5 days', false, 36.5, false, false, 'leve', 'bom', 'dormiu bem', null),
  ('00000000-0000-4000-8000-000000000001', now() - interval '4 days', false, 36.4, false, false, 'nenhum', 'bom', 'dormiu bem', 'O neto Lucas passou para almoçar.'),
  ('00000000-0000-4000-8000-000000000001', now() - interval '3 days', false, 36.7, false, false, 'leve', 'regular', 'demorou para dormir', null),
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

-- Histórico de alertas: a dose perdida de anteontem (já vista pela família) e o estoque baixo de hoje.
insert into public.alertas (paciente_id, gatilho, nivel, motivo, criado_em, visto_em) values
  ('00000000-0000-4000-8000-000000000001', 'dose.perdida', 'laranja', 'Não confirmou Remédio B (pressão) há mais de 1 hora.',
   (((now() at time zone 'America/Sao_Paulo')::date - 2) + time '21:00') at time zone 'America/Sao_Paulo',
   (((now() at time zone 'America/Sao_Paulo')::date - 2) + time '21:12') at time zone 'America/Sao_Paulo'),
  ('00000000-0000-4000-8000-000000000001', 'geral.estoque_baixo', 'amarelo', 'Remédio B (pressão): estoque para menos de 5 dias.', now() - interval '1 hour', null);

insert into public.memoria_paciente (paciente_id, chave, valor) values
  ('00000000-0000-4000-8000-000000000001', 'tratamento', 'Dona Maria'),
  ('00000000-0000-4000-8000-000000000001', 'familia', 'Neto Lucas (cuida dos remédios), filha Ana (mora em outra cidade)'),
  ('00000000-0000-4000-8000-000000000001', 'rotina', 'Acorda às 7h, gosta de conversar sobre as plantas do quintal');
