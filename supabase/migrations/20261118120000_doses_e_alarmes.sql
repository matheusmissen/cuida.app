-- Cuida: etapa 18–21/11 — doses do dia, confirmação "Tomei" e aviso de dose perdida.
-- A decisão de alertar (30 min realarma, 60 min alerta) fica no motor de regras
-- (packages/regras, avaliarDose), chamado pela Edge Function verificar-doses.

-- Gera as doses de um dia (horário de Brasília) a partir dos horários dos remédios ativos.
-- Idempotente: doses já existentes são mantidas (unique (horario_id, previsto_em)).
create function public._gerar_doses(p_dia date, p_paciente uuid default null) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_qtd integer;
begin
  insert into public.doses (horario_id, paciente_id, previsto_em)
  select h.id, h.paciente_id, (p_dia + h.hora) at time zone 'America/Sao_Paulo'
    from public.horarios h
    join public.remedios r on r.id = h.remedio_id
   where r.ativo
     and extract(dow from p_dia)::smallint = any (h.dias_semana)
     and (p_paciente is null or h.paciente_id = p_paciente)
  on conflict (horario_id, previsto_em) do nothing;
  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

-- Para o servidor (cron e Edge Function): gera as doses de hoje e de amanhã de todos.
create function public.gerar_doses_dia() returns integer
language sql volatile security definer set search_path = '' as $$
  select public._gerar_doses((now() at time zone 'America/Sao_Paulo')::date)
       + public._gerar_doses((now() at time zone 'America/Sao_Paulo')::date + 1);
$$;

-- Para os apps: gera hoje e amanhã de um paciente (família ou o próprio aparelho do idoso).
create function public.gerar_doses_hoje(p_paciente uuid) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not (public.e_cuidador(p_paciente) or public.e_paciente(p_paciente)) then
    raise exception 'Sem permissão para este paciente';
  end if;
  return public._gerar_doses(v_hoje, p_paciente) + public._gerar_doses(v_hoje + 1, p_paciente);
end;
$$;

-- Botão "Tomei". Também conta como interação (regra de silêncio de 24 h) e baixa o estoque.
-- Pode ser chamado depois do alerta de dose perdida: a dose passa a "tomado" mesmo assim.
create function public.confirmar_dose(p_dose uuid) returns timestamptz
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_paciente uuid;
  v_remedio uuid;
  v_confirmado timestamptz;
begin
  select d.paciente_id, h.remedio_id, d.confirmado_em
    into v_paciente, v_remedio, v_confirmado
    from public.doses d
    join public.horarios h on h.id = d.horario_id
   where d.id = p_dose;
  if v_paciente is null
     or not (public.e_paciente(v_paciente) or public.e_cuidador(v_paciente)) then
    raise exception 'Dose não encontrada';
  end if;
  if v_confirmado is not null then
    return v_confirmado; -- toque duplo no botão: não baixa o estoque duas vezes
  end if;

  update public.doses
     set confirmado_em = now(), status = 'tomado'
   where id = p_dose
  returning confirmado_em into v_confirmado;

  update public.remedios
     set estoque_doses = greatest(estoque_doses - 1, 0)
   where id = v_remedio and estoque_doses is not null;

  if public.e_paciente(v_paciente) then
    update public.pacientes set ultima_interacao_em = now() where id = v_paciente;
  end if;
  return v_confirmado;
end;
$$;

revoke all on function public._gerar_doses, public.gerar_doses_dia from public, anon, authenticated;
revoke all on function public.gerar_doses_hoje, public.confirmar_dose from public, anon;
grant execute on function public.gerar_doses_hoje, public.confirmar_dose to authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public._gerar_doses, public.gerar_doses_dia to service_role;
  end if;
end;
$$;

-- O idoso confirma pela função acima; a família pode marcar pela mesma função.
-- Atualização direta de doses deixa de ser permitida (evita mudar previsto_em pelo app).
drop policy "doses: confirmar" on public.doses;

-- Ao suspender um remédio, a família apaga as doses futuras ainda não tomadas.
-- O histórico (doses confirmadas ou já passadas) não pode ser apagado pelo app.
create policy "doses: família remove futuras" on public.doses for delete to authenticated
  using (public.e_cuidador(paciente_id) and confirmado_em is null and previsto_em > now());

-- Alertas da escala: índice para os laranjas ainda não vistos.
create index on public.alertas (criado_em) where visto_em is null and nivel = 'laranja';

-- Realtime: o app da família recebe alertas e doses na hora (respeita RLS).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.alertas, public.doses;
  end if;
end;
$$;

-- Agendamentos (pg_cron + pg_net, disponíveis no Supabase) ---------------------
-- A URL do projeto e a service role ficam no Vault, nunca no repositório:
--   select vault.create_secret('https://<projeto>.supabase.co', 'project_url');
--   select vault.create_secret('<service role key>', 'service_role_key');
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    raise notice 'pg_cron/pg_net indisponíveis: agendamentos não criados';
    return;
  end if;
  create extension if not exists pg_cron with schema pg_catalog;
  create extension if not exists pg_net with schema extensions;

  -- Doses do dia seguinte, todo dia às 00:05 de Brasília (03:05 UTC). Não depende da Edge Function.
  perform cron.schedule('gerar-doses', '5 3 * * *', 'select public.gerar_doses_dia()');

  -- A cada 5 minutos: doses atrasadas (realarme, dose perdida) e escala dos alertas laranja.
  perform cron.schedule('verificar-doses', '*/5 * * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
             || '/functions/v1/verificar-doses',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 20000
    );
  $job$);
end;
$$;
