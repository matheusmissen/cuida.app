-- Cuida: documentos no app da família (decidido em 16/11).
-- Receitas lidas por IA (Edge Function ler-receita) viram SUGESTÕES de alarme;
-- os alarmes só nascem quando a família confere e chama criar_alarmes_da_receita.
-- Exames e relatórios são só guardados (foto ou PDF), sem leitura por IA.

-- Tipos ------------------------------------------------------------------------

create type public.tipo_documento as enum ('receita', 'exame', 'relatorio');
create type public.status_documento as enum ('enviado', 'lendo', 'aguardando_conferencia', 'conferida', 'erro');

-- Remédio com fim de tratamento ("por 7 dias") ----------------------------------

alter table public.remedios add column termina_em date;

-- Mesma função da etapa 18–21/11, agora sem gerar doses depois do fim do tratamento.
create or replace function public._gerar_doses(p_dia date, p_paciente uuid default null) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_qtd integer;
begin
  insert into public.doses (horario_id, paciente_id, previsto_em)
  select h.id, h.paciente_id, (p_dia + h.hora) at time zone 'America/Sao_Paulo'
    from public.horarios h
    join public.remedios r on r.id = h.remedio_id
   where r.ativo
     and (r.termina_em is null or p_dia <= r.termina_em)
     and extract(dow from p_dia)::smallint = any (h.dias_semana)
     and (p_paciente is null or h.paciente_id = p_paciente)
  on conflict (horario_id, previsto_em) do nothing;
  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

-- Documentos ---------------------------------------------------------------------

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  tipo public.tipo_documento not null,
  titulo text not null check (char_length(titulo) between 1 and 120),
  data_documento date,
  -- caminho no bucket 'documentos': '<paciente_id>/<arquivo>'
  arquivo_path text not null,
  mime text check (mime in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf')),
  status public.status_documento not null default 'enviado',
  -- leitura da IA (só receitas), já normalizada pela Edge Function
  leitura jsonb,
  enviado_por uuid not null default auth.uid() references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  conferido_por uuid references auth.users (id) on delete set null,
  conferido_em timestamptz,
  check (arquivo_path like paciente_id::text || '/%'),
  check (tipo = 'receita' or (leitura is null and status in ('enviado', 'conferida')))
);

create index on public.documentos (paciente_id, tipo, criado_em desc);

alter table public.documentos enable row level security;

-- Só o círculo de cuidado vê e envia documentos (o aparelho do idoso não).
create policy "documentos: família vê" on public.documentos for select to authenticated
  using (public.e_cuidador(paciente_id));
create policy "documentos: família envia" on public.documentos for insert to authenticated
  with check (public.e_cuidador(paciente_id) and enviado_por = auth.uid() and leitura is null
              and status = case when tipo = 'receita' then 'enviado'::public.status_documento else 'conferida'::public.status_documento end);
create policy "documentos: família edita título e data" on public.documentos for update to authenticated
  using (public.e_cuidador(paciente_id)) with check (public.e_cuidador(paciente_id));
create policy "documentos: família apaga" on public.documentos for delete to authenticated
  using (public.e_cuidador(paciente_id));

-- A leitura da IA e o status só mudam pelo servidor ou por criar_alarmes_da_receita.
create function public._proteger_leitura() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated'
     and (new.leitura is distinct from old.leitura
          or new.status is distinct from old.status
          or new.arquivo_path is distinct from old.arquivo_path
          or new.paciente_id is distinct from old.paciente_id
          or new.tipo is distinct from old.tipo) then
    raise exception 'Só o título e a data podem ser alterados pelo app';
  end if;
  return new;
end;
$$;
create trigger documentos_proteger_leitura before update on public.documentos
  for each row execute function public._proteger_leitura();

-- Armazenamento (Supabase Storage) ---------------------------------------------

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- O primeiro segmento do caminho é o paciente; só seus cuidadores acessam.
create function public.pode_acessar_arquivo(p_nome text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_pasta text := split_part(p_nome, '/', 1);
begin
  if v_pasta !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.e_cuidador(v_pasta::uuid);
end;
$$;

create policy "documentos: família lê arquivos" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.pode_acessar_arquivo(name));
create policy "documentos: família envia arquivos" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.pode_acessar_arquivo(name));
create policy "documentos: família apaga arquivos" on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and public.pode_acessar_arquivo(name));

-- Conferência da receita → alarmes ---------------------------------------------
-- p_itens: [{ "nome": "Remédio C", "dose": "1 comprimido", "horarios": ["06:00","14:00","22:00"],
--             "duracao_dias": 7 | null, "critico": false }]
-- Só os itens enviados viram alarmes; a família decide quais (os "Precisa de você" ficam de fora).

create function public.criar_alarmes_da_receita(p_documento uuid, p_itens jsonb) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_doc public.documentos%rowtype;
  v_item jsonb;
  v_hora text;
  v_remedio uuid;
  v_dias integer;
  v_qtd integer := 0;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select * into v_doc from public.documentos where id = p_documento;
  if v_doc.id is null or not public.e_cuidador(v_doc.paciente_id) then
    raise exception 'Documento não encontrado';
  end if;
  if v_doc.tipo <> 'receita' then
    raise exception 'Só receitas criam alarmes';
  end if;
  if v_doc.status = 'conferida' then
    raise exception 'Esta receita já foi conferida';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Nenhum remédio para criar';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    if coalesce(trim(v_item->>'nome'), '') = '' or coalesce(trim(v_item->>'dose'), '') = '' then
      raise exception 'Cada remédio precisa de nome e dose';
    end if;
    if jsonb_typeof(v_item->'horarios') <> 'array' or jsonb_array_length(v_item->'horarios') = 0 then
      raise exception 'Defina os horários de %', v_item->>'nome';
    end if;
    v_dias := nullif(v_item->>'duracao_dias', '')::integer;
    if v_dias is not null and (v_dias < 1 or v_dias > 365) then
      raise exception 'Duração inválida para %', v_item->>'nome';
    end if;

    insert into public.remedios (paciente_id, nome, dose, critico, termina_em)
    values (v_doc.paciente_id, left(trim(v_item->>'nome'), 120), left(trim(v_item->>'dose'), 120),
            coalesce((v_item->>'critico')::boolean, false),
            case when v_dias is null then null else v_hoje + v_dias - 1 end)
    returning id into v_remedio;

    for v_hora in select distinct jsonb_array_elements_text(v_item->'horarios') loop
      if v_hora !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
        raise exception 'Horário inválido: %', v_hora;
      end if;
      insert into public.horarios (remedio_id, paciente_id, hora)
      values (v_remedio, v_doc.paciente_id, v_hora::time);
      v_qtd := v_qtd + 1;
    end loop;
  end loop;

  update public.documentos
     set status = 'conferida', conferido_por = auth.uid(), conferido_em = now()
   where id = p_documento;

  perform public._gerar_doses(v_hoje, v_doc.paciente_id);
  perform public._gerar_doses(v_hoje + 1, v_doc.paciente_id);
  return v_qtd;
end;
$$;

revoke all on function public.criar_alarmes_da_receita, public.pode_acessar_arquivo from public, anon;
grant execute on function public.criar_alarmes_da_receita to authenticated;
grant execute on function public.pode_acessar_arquivo to authenticated;
