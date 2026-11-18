-- Cuida: Etapa 4 do novo plano — tela do alerta da família (docs/PRD.md, seções 2, 4, 5 e 10).
-- 1. alertas.dose_id: a dose que gerou o alerta (para reenviar o lembrete certo e resolver sozinho).
-- 2. alertas.acao_em: última ação do responsável ("Reenviar lembrete"); a escalada recomeça a contar dela.
-- 3. alertas.resolucao: como o alerta foi resolvido — 'familia' ("Já falei com ela, está tudo bem"),
--    'tomou' (o idoso confirmou a dose) ou 'checkin' (o idoso fez o check-in).
-- 4. Resolução automática: confirmar a dose ou fazer o check-in resolve o alerta aberto e para a escalada,
--    para o grupo não ser avisado à toa.
-- 5. pacientes.telefone: para o botão "Ligar para o idoso".

alter table public.alertas
  add column dose_id uuid references public.doses (id) on delete set null,
  add column acao_em timestamptz,
  add column resolucao text check (resolucao in ('familia', 'tomou', 'checkin'));

create index alertas_dose on public.alertas (dose_id) where dose_id is not null;

comment on column public.alertas.dose_id is 'Dose que gerou o alerta (gatilho dose.*).';
comment on column public.alertas.acao_em is 'Última ação do responsável (reenviar lembrete): a escalada conta a partir daqui.';
comment on column public.alertas.resolucao is 'Como foi resolvido: familia, tomou ou checkin (com visto_em).';

alter table public.pacientes
  add column telefone text check (telefone ~ '^\+?[0-9]{10,13}$');

comment on column public.pacientes.telefone is 'Telefone do idoso, só dígitos (com DDD; pode ter +55), para "Ligar para o idoso".';

-- Confirmou a dose (pelo "Tomei", pela Lia ou pela família): resolve o alerta daquela dose.
create function public._resolver_alerta_da_dose() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.confirmado_em is not null and old.confirmado_em is null then
    update public.alertas
       set visto_em = coalesce(new.confirmado_em, now()), resolucao = 'tomou'
     where dose_id = new.id and visto_em is null;
  end if;
  return new;
end;
$$;

create trigger resolver_alerta_da_dose
  after update of confirmado_em on public.doses
  for each row execute function public._resolver_alerta_da_dose();

-- Fez o check-in: resolve o alerta de check-in sem resposta (do mesmo dia) que estiver aberto.
create function public._resolver_alerta_do_checkin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.alertas
     set visto_em = coalesce(new.feito_em, now()), resolucao = 'checkin'
   where paciente_id = new.paciente_id
     and gatilho = 'geral.checkin_sem_resposta'
     and visto_em is null
     and criado_em > coalesce(new.feito_em, now()) - interval '1 day';
  return new;
end;
$$;

create trigger resolver_alerta_do_checkin
  after insert on public.checkins
  for each row execute function public._resolver_alerta_do_checkin();

revoke all on function public._resolver_alerta_da_dose(), public._resolver_alerta_do_checkin() from public, anon, authenticated;
