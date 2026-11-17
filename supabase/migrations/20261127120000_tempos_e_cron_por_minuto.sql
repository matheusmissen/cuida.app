-- Cuida: Etapa 1 do novo plano (docs/PRD.md, seções 2, 4 e 5).
-- 1. Tempos de tolerância e de escalada por paciente, para encurtar a 1 minuto na demonstração.
--    A regra continua no código (packages/regras: temposDoPaciente, avaliarDose, situacaoDoCheckin);
--    o banco só guarda os números, sempre entre 1 e 240 minutos.
-- 2. Check-in diário às 08:00 por padrão (só para pacientes novos; os existentes mantêm o horário).
-- 3. verificar-doses passa a rodar a cada minuto (antes, a cada 5).

alter table public.pacientes
  add column tolerancia_dose_min smallint not null default 30
    check (tolerancia_dose_min between 1 and 240),
  add column tolerancia_checkin_min smallint not null default 15
    check (tolerancia_checkin_min between 1 and 240),
  add column escalada_min smallint not null default 15
    check (escalada_min between 1 and 240);

comment on column public.pacientes.tolerancia_dose_min is
  'Minutos sem "Tomei" até avisar o responsável principal (PRD: 30; demonstração: 1).';
comment on column public.pacientes.tolerancia_checkin_min is
  'Minutos sem check-in, depois do horário, até avisar o responsável principal (PRD: 15; demonstração: 1).';
comment on column public.pacientes.escalada_min is
  'Minutos sem o responsável agir até avisar todo o grupo (PRD: 15; demonstração: 1).';

alter table public.pacientes alter column horario_checkin set default '08:00';

-- Agendamento a cada minuto. Só mexe no job se o pg_cron e o job existirem
-- (num Postgres sem pg_cron, como o de teste local, não faz nada).
do $$
declare
  v_job bigint;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron ausente: agendamento não alterado';
    return;
  end if;
  select jobid into v_job from cron.job where jobname = 'verificar-doses';
  if v_job is null then
    raise notice 'job verificar-doses não encontrado: agendamento não alterado';
    return;
  end if;
  perform cron.alter_job(job_id := v_job, schedule := '* * * * *');
end;
$$;
