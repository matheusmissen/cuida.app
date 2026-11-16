-- Cuida: etapa 22–25/11 — check-in diário iniciado pela Lia.
-- Horário local (Brasília) em que a Lia chama para o check-in; null desliga o check-in diário.
-- As tentativas e o alerta de "sem resposta" são calculados por situacaoDoCheckin (packages/regras):
-- tentativa no horário e 30 min depois; sem check-in 1 h depois do horário → alerta laranja.
alter table public.pacientes add column horario_checkin time default '09:00';

comment on column public.pacientes.horario_checkin is
  'Horário local do check-in diário da Lia (null = desligado). Definido pela família.';

-- Consulta do servidor: último check-in de cada paciente.
-- (o índice checkins (paciente_id, feito_em desc) da migration inicial já atende)
