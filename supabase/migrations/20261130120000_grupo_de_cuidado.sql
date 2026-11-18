-- Cuida: Etapa 5 do novo plano — grupo de cuidado (docs/PRD.md, seção 2 e seção 10, tela 7 da família).
-- Papéis: responsável principal (cuidadores.papel = 'principal') e acompanhante ('apoio').
-- 1. convites: o responsável gera um código (uso único, vale 7 dias); outro familiar entra no grupo com ele.
-- 2. Funções: criar_convite, aceitar_convite, passar_responsabilidade e sair_ou_remover_do_grupo.
-- 3. Só o responsável principal muda a rotina de remédios (remédios e horários), por qualquer caminho
--    (direto ou pela leitura de receita). O acompanhante vê tudo; o "Tomei" continua baixando o estoque.

create table public.convites (
  codigo text primary key check (codigo ~ '^[A-HJ-NP-Z2-9]{6}$'),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  criado_por uuid not null references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '7 days',
  usado_por uuid references auth.users (id) on delete set null,
  usado_em timestamptz
);

create index convites_paciente on public.convites (paciente_id, criado_em desc);

comment on table public.convites is 'Convites para o grupo de cuidado: código de 6 caracteres, uso único, vale 7 dias.';

alter table public.convites enable row level security;
-- O responsável vê os convites do paciente; criar e usar só pelas funções abaixo.
create policy "convites: responsável vê" on public.convites for select to authenticated
  using (public.e_cuidador_principal(paciente_id));

-- Gera um convite (só o responsável principal). Letras e números sem os que confundem (0/O, 1/I).
create function public.criar_convite(p_paciente uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
begin
  if not public.e_cuidador_principal(p_paciente) then
    raise exception 'Só o responsável principal convida pessoas para o grupo';
  end if;
  loop
    select string_agg(substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1), '')
      into v_codigo from generate_series(1, 6);
    begin
      insert into public.convites (codigo, paciente_id, criado_por) values (v_codigo, p_paciente, auth.uid());
      return v_codigo;
    exception when unique_violation then
      -- código repetido: tenta outro
    end;
  end loop;
end;
$$;

-- Entra no grupo com um convite (qualquer pessoa logada com conta de e-mail). Devolve o paciente.
create function public.aceitar_convite(p_codigo text, p_nome text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_convite public.convites%rowtype;
  v_nome text := nullif(left(btrim(coalesce(p_nome, '')), 60), '');
begin
  if auth.uid() is null then
    raise exception 'É preciso estar conectado';
  end if;
  if exists (select 1 from auth.users where id = auth.uid() and coalesce(is_anonymous, false)) then
    raise exception 'Entre com a sua conta da família para aceitar o convite';
  end if;
  select * into v_convite from public.convites
   where codigo = upper(btrim(p_codigo)) for update;
  if v_convite.codigo is null or v_convite.usado_em is not null or v_convite.expira_em < now() then
    raise exception 'Convite inválido ou vencido';
  end if;
  if not exists (select 1 from public.cuidadores where paciente_id = v_convite.paciente_id and usuario_id = auth.uid()) then
    insert into public.cuidadores (usuario_id, paciente_id, papel, ordem_escala, nome_exibicao)
    select auth.uid(), v_convite.paciente_id, 'apoio', coalesce(max(ordem_escala), 0) + 1, v_nome
      from public.cuidadores where paciente_id = v_convite.paciente_id;
  end if;
  update public.convites set usado_por = auth.uid(), usado_em = now() where codigo = v_convite.codigo;
  return v_convite.paciente_id;
end;
$$;

-- O responsável principal passa o papel para outra pessoa do grupo (e vira acompanhante).
create function public.passar_responsabilidade(p_paciente uuid, p_novo uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.e_cuidador_principal(p_paciente) then
    raise exception 'Só o responsável principal passa a responsabilidade';
  end if;
  if p_novo = auth.uid() then
    raise exception 'Você já é o responsável principal';
  end if;
  if not exists (select 1 from public.cuidadores where paciente_id = p_paciente and usuario_id = p_novo) then
    raise exception 'Essa pessoa não está no grupo';
  end if;
  update public.cuidadores set papel = 'apoio' where paciente_id = p_paciente and usuario_id = auth.uid();
  update public.cuidadores set papel = 'principal' where paciente_id = p_paciente and usuario_id = p_novo;
end;
$$;

-- Sair do grupo (acompanhante) ou remover alguém (responsável principal).
-- O responsável não sai sem antes passar a responsabilidade (o grupo não fica sem responsável).
create function public.sair_ou_remover_do_grupo(p_paciente uuid, p_usuario uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_usuario = auth.uid() then
    if public.e_cuidador_principal(p_paciente) then
      raise exception 'Passe a responsabilidade para outra pessoa antes de sair do grupo';
    end if;
  elsif not public.e_cuidador_principal(p_paciente) then
    raise exception 'Só o responsável principal remove pessoas do grupo';
  end if;
  delete from public.cuidadores where paciente_id = p_paciente and usuario_id = p_usuario;
end;
$$;

revoke all on function public.criar_convite(uuid), public.aceitar_convite(text, text),
  public.passar_responsabilidade(uuid, uuid), public.sair_ou_remover_do_grupo(uuid, uuid) from public, anon;
grant execute on function public.criar_convite(uuid), public.aceitar_convite(text, text),
  public.passar_responsabilidade(uuid, uuid), public.sair_ou_remover_do_grupo(uuid, uuid) to authenticated;

-- Só o responsável principal muda remédios e horários (o acompanhante só vê).
-- Vale para qualquer caminho com usuário logado, inclusive funções do banco (leitura de receita).
-- Exceções: o servidor (sem usuário), o aparelho do idoso nas funções dele, e a baixa de estoque
-- feita pelo "Tomei" (confirmar_dose), que muda só remedios.estoque_doses.
create function public._so_responsavel_muda_remedios() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_paciente uuid := coalesce(new.paciente_id, old.paciente_id);
begin
  if auth.uid() is null or public.e_cuidador_principal(v_paciente) or public.e_paciente(v_paciente) then
    return coalesce(new, old);
  end if;
  if tg_table_name = 'remedios' and tg_op = 'UPDATE'
     and (to_jsonb(new) - 'estoque_doses') = (to_jsonb(old) - 'estoque_doses') then
    return new;
  end if;
  raise exception 'Só o responsável principal muda os remédios';
end;
$$;

create trigger so_responsavel_muda_remedios
  before insert or update or delete on public.remedios
  for each row execute function public._so_responsavel_muda_remedios();

create trigger so_responsavel_muda_horarios
  before insert or update or delete on public.horarios
  for each row execute function public._so_responsavel_muda_remedios();

revoke all on function public._so_responsavel_muda_remedios() from public, anon, authenticated;
