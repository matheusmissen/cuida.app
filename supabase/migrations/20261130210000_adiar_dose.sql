-- Cuida: "Lembrar em 10 minutos" também com o app fechado (tela 7 do idoso).
-- O celular do idoso grava o adiamento aqui; a verificar-doses manda o lembrete do remédio de novo por
-- web push quando passa a hora (uma vez por adiamento). Adiar não é tomar: a regra da dose não muda e a
-- família continua sendo avisada na tolerância.

alter table public.doses
  add column adiada_ate timestamptz,
  add column lembrete_adiado_em timestamptz;

create index doses_adiadas on public.doses (adiada_ate) where adiada_ate is not null and confirmado_em is null;

create function public.adiar_dose(p_dose uuid, p_minutos int default 10) returns timestamptz
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_paciente uuid;
  v_confirmado timestamptz;
  v_ate timestamptz;
begin
  if p_minutos is null or p_minutos not between 1 and 60 then
    raise exception 'Adiamento de 1 a 60 minutos';
  end if;
  select paciente_id, confirmado_em into v_paciente, v_confirmado from public.doses where id = p_dose;
  if v_paciente is null or not public.e_paciente(v_paciente) then
    raise exception 'Dose não encontrada';
  end if;
  if v_confirmado is not null then
    return null; -- já tomou: nada a lembrar
  end if;
  update public.doses
     set adiada_ate = now() + make_interval(mins => p_minutos), lembrete_adiado_em = null
   where id = p_dose
  returning adiada_ate into v_ate;
  update public.pacientes set ultima_interacao_em = now() where id = v_paciente;
  return v_ate;
end;
$$;

revoke all on function public.adiar_dose(uuid, int) from public, anon;
grant execute on function public.adiar_dose(uuid, int) to authenticated;
