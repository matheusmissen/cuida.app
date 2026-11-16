-- Cuida: esquema inicial
-- Dados de saúde são sensíveis (LGPD): Row Level Security em todas as tabelas.
-- O servidor (Edge Functions com service role) ignora RLS; os apps usam só a chave anon.

-- Tipos -----------------------------------------------------------------------

create type public.nivel_alerta as enum ('vermelho', 'laranja', 'amarelo', 'informativo');
create type public.papel_cuidador as enum ('principal', 'apoio');
create type public.status_dose as enum ('pendente', 'tomado', 'perdido');

-- Tabelas ---------------------------------------------------------------------

create table public.pacientes (
  id uuid primary key default gen_random_uuid(),
  -- usuário do aparelho do idoso, vinculado por QR code (ver vincular_aparelho)
  usuario_id uuid unique references auth.users (id) on delete set null,
  nome text not null,
  apelido text,
  data_nascimento date,
  condicoes text[] not null default '{}',
  -- limite de febre em °C, definido com o médico
  limite_febre numeric(3, 1) not null default 37.8 check (limite_febre between 36.5 and 40),
  medico_contato text,
  consentimento_em timestamptz,
  ultima_interacao_em timestamptz,
  criado_em timestamptz not null default now()
);

create table public.cuidadores (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  papel public.papel_cuidador not null default 'apoio',
  ordem_escala smallint not null default 1 check (ordem_escala >= 1),
  nome_exibicao text,
  expo_push_token text,
  criado_em timestamptz not null default now(),
  unique (usuario_id, paciente_id)
);

create table public.remedios (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  nome text not null,
  dose text not null,
  foto_url text,
  critico boolean not null default false,
  estoque_doses integer check (estoque_doses >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.horarios (
  id uuid primary key default gen_random_uuid(),
  remedio_id uuid not null references public.remedios (id) on delete cascade,
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  hora time not null,
  -- 0 = domingo ... 6 = sábado
  dias_semana smallint[] not null default '{0,1,2,3,4,5,6}'
    check (dias_semana <@ '{0,1,2,3,4,5,6}'::smallint[] and cardinality(dias_semana) > 0)
);

create table public.doses (
  id uuid primary key default gen_random_uuid(),
  horario_id uuid not null references public.horarios (id) on delete cascade,
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  previsto_em timestamptz not null,
  confirmado_em timestamptz,
  realarmado_em timestamptz,
  status public.status_dose not null default 'pendente',
  unique (horario_id, previsto_em)
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  feito_em timestamptz not null default now(),
  febre boolean,
  temperatura numeric(3, 1) check (temperatura between 30 and 45),
  calafrio boolean,
  sangramento boolean,
  manchas boolean,
  sinais_infeccao boolean,
  cansaco text check (cansaco in ('nenhum', 'leve', 'forte')),
  humor text check (humor in ('bom', 'regular', 'baixo')),
  apetite_baixo boolean,
  nausea boolean,
  queda boolean,
  dor_no_peito boolean,
  falta_de_ar boolean,
  confuso boolean,
  sono text,
  notas text,
  audio_url text
);

create table public.regras (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  gatilho text not null,
  condicao jsonb not null default '{}',
  nivel public.nivel_alerta not null,
  ativa boolean not null default true,
  unique (paciente_id, gatilho)
);

create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  regra_id uuid references public.regras (id) on delete set null,
  gatilho text not null,
  nivel public.nivel_alerta not null,
  motivo text not null,
  criado_em timestamptz not null default now(),
  avisados uuid[] not null default '{}',
  visto_por uuid references auth.users (id) on delete set null,
  visto_em timestamptz
);

create table public.memoria_paciente (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  chave text not null,
  valor text not null,
  atualizado_em timestamptz not null default now(),
  unique (paciente_id, chave)
);

create table public.codigos_vinculo (
  codigo text primary key,
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  criado_por uuid not null references auth.users (id) on delete cascade,
  expira_em timestamptz not null default now() + interval '15 minutes',
  usado_em timestamptz
);

-- Índices para as consultas do motor de regras
create index on public.cuidadores (paciente_id);
create index on public.remedios (paciente_id);
create index on public.horarios (remedio_id);
create index on public.doses (paciente_id, previsto_em desc);
create index on public.doses (status, previsto_em) where status = 'pendente';
create index on public.checkins (paciente_id, feito_em desc);
create index on public.alertas (paciente_id, criado_em desc);

-- Funções de acesso (security definer evita recursão nas políticas) ------------

create function public.e_cuidador(p_paciente uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.cuidadores c
    where c.paciente_id = p_paciente and c.usuario_id = auth.uid()
  );
$$;

create function public.e_cuidador_principal(p_paciente uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.cuidadores c
    where c.paciente_id = p_paciente and c.usuario_id = auth.uid() and c.papel = 'principal'
  );
$$;

create function public.e_paciente(p_paciente uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.pacientes p
    where p.id = p_paciente and p.usuario_id = auth.uid()
  );
$$;

-- Cria o paciente e já registra quem criou como cuidador principal.
create function public.criar_paciente(
  p_nome text,
  p_apelido text default null,
  p_condicoes text[] default '{}',
  p_nome_exibicao text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Login necessário';
  end if;
  insert into public.pacientes (nome, apelido, condicoes)
  values (p_nome, p_apelido, coalesce(p_condicoes, '{}'))
  returning id into v_id;
  insert into public.cuidadores (usuario_id, paciente_id, papel, ordem_escala, nome_exibicao)
  values (auth.uid(), v_id, 'principal', 1, p_nome_exibicao);
  return v_id;
end;
$$;

-- Gera um código de 6 dígitos para o QR code de vínculo do aparelho do idoso.
create function public.gerar_codigo_vinculo(p_paciente uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_codigo text;
begin
  if not public.e_cuidador(p_paciente) then
    raise exception 'Sem permissão para este paciente';
  end if;
  loop
    v_codigo := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into public.codigos_vinculo (codigo, paciente_id, criado_por)
      values (v_codigo, p_paciente, auth.uid());
      return v_codigo;
    exception when unique_violation then
      -- código repetido: tenta outro
    end;
  end loop;
end;
$$;

-- Chamado pelo app do idoso (já logado anonimamente) ao ler o QR code.
create function public.vincular_aparelho(p_codigo text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_paciente uuid;
begin
  if auth.uid() is null then
    raise exception 'Login necessário';
  end if;
  update public.codigos_vinculo
     set usado_em = now()
   where codigo = p_codigo and usado_em is null and expira_em > now()
  returning paciente_id into v_paciente;
  if v_paciente is null then
    raise exception 'Código inválido ou expirado';
  end if;
  update public.pacientes
     set usuario_id = auth.uid(), ultima_interacao_em = now()
   where id = v_paciente;
  return v_paciente;
end;
$$;

-- Atualiza a última interação do idoso (usado pela regra de silêncio de 24 h).
create function public.registrar_interacao() returns void
language sql volatile security definer set search_path = '' as $$
  update public.pacientes set ultima_interacao_em = now() where usuario_id = auth.uid();
$$;

revoke all on function public.criar_paciente, public.gerar_codigo_vinculo,
  public.vincular_aparelho, public.registrar_interacao from public, anon;
grant execute on function public.criar_paciente, public.gerar_codigo_vinculo,
  public.vincular_aparelho, public.registrar_interacao to authenticated;

-- Row Level Security -----------------------------------------------------------

alter table public.pacientes enable row level security;
alter table public.cuidadores enable row level security;
alter table public.remedios enable row level security;
alter table public.horarios enable row level security;
alter table public.doses enable row level security;
alter table public.checkins enable row level security;
alter table public.regras enable row level security;
alter table public.alertas enable row level security;
alter table public.memoria_paciente enable row level security;
alter table public.codigos_vinculo enable row level security;
-- codigos_vinculo: sem políticas; só as funções acima acessam.

-- pacientes: criação só via criar_paciente()
create policy "pacientes: ver" on public.pacientes for select to authenticated
  using (public.e_cuidador(id) or usuario_id = auth.uid());
create policy "pacientes: editar" on public.pacientes for update to authenticated
  using (public.e_cuidador(id)) with check (public.e_cuidador(id));
create policy "pacientes: excluir" on public.pacientes for delete to authenticated
  using (public.e_cuidador_principal(id));

-- cuidadores: o círculo se vê; só o principal gerencia
create policy "cuidadores: ver" on public.cuidadores for select to authenticated
  using (public.e_cuidador(paciente_id));
create policy "cuidadores: principal adiciona" on public.cuidadores for insert to authenticated
  with check (public.e_cuidador_principal(paciente_id));
create policy "cuidadores: principal edita" on public.cuidadores for update to authenticated
  using (public.e_cuidador_principal(paciente_id) or usuario_id = auth.uid())
  with check (public.e_cuidador_principal(paciente_id) or usuario_id = auth.uid());
create policy "cuidadores: principal remove" on public.cuidadores for delete to authenticated
  using (public.e_cuidador_principal(paciente_id));

-- remédios, horários, regras e memória: a família gerencia; o idoso só lê
create policy "remedios: família gerencia" on public.remedios for all to authenticated
  using (public.e_cuidador(paciente_id)) with check (public.e_cuidador(paciente_id));
create policy "remedios: idoso lê" on public.remedios for select to authenticated
  using (public.e_paciente(paciente_id));

create policy "horarios: família gerencia" on public.horarios for all to authenticated
  using (public.e_cuidador(paciente_id)) with check (public.e_cuidador(paciente_id));
create policy "horarios: idoso lê" on public.horarios for select to authenticated
  using (public.e_paciente(paciente_id));

create policy "regras: família gerencia" on public.regras for all to authenticated
  using (public.e_cuidador(paciente_id)) with check (public.e_cuidador(paciente_id));

create policy "memoria: família gerencia" on public.memoria_paciente for all to authenticated
  using (public.e_cuidador(paciente_id)) with check (public.e_cuidador(paciente_id));
create policy "memoria: idoso lê" on public.memoria_paciente for select to authenticated
  using (public.e_paciente(paciente_id));

-- doses: geradas pelo servidor; idoso e família leem e confirmam
create policy "doses: ver" on public.doses for select to authenticated
  using (public.e_cuidador(paciente_id) or public.e_paciente(paciente_id));
create policy "doses: confirmar" on public.doses for update to authenticated
  using (public.e_cuidador(paciente_id) or public.e_paciente(paciente_id))
  with check (public.e_cuidador(paciente_id) or public.e_paciente(paciente_id));

-- check-ins: o idoso registra; família lê
create policy "checkins: ver" on public.checkins for select to authenticated
  using (public.e_cuidador(paciente_id) or public.e_paciente(paciente_id));
create policy "checkins: idoso registra" on public.checkins for insert to authenticated
  with check (public.e_paciente(paciente_id));

-- alertas: criados pelo servidor; família lê e marca como visto
create policy "alertas: ver" on public.alertas for select to authenticated
  using (public.e_cuidador(paciente_id) or public.e_paciente(paciente_id));
create policy "alertas: marcar visto" on public.alertas for update to authenticated
  using (public.e_cuidador(paciente_id)) with check (public.e_cuidador(paciente_id));
