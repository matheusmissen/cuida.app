-- Cuida: consultas (docs/PRD.md, seção 7 e telas: "próxima consulta em destaque" no idoso; "o familiar vê
-- a consulta no painel"; "o idoso recebe lembrete de consulta no dia anterior e algumas horas antes").
-- Quem vê os dados de saúde (ve_saude) vê e cadastra; o celular do idoso só lê.
-- Os lembretes são mandados pela verificar-doses (uma vez cada): lembrete_vespera_em e lembrete_horas_em.

create table public.consultas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  quando timestamptz not null,
  medico text check (char_length(medico) <= 80),
  especialidade text check (char_length(especialidade) <= 60),
  local text check (char_length(local) <= 120),
  observacao text check (char_length(observacao) <= 300),
  criado_por uuid default auth.uid() references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  lembrete_vespera_em timestamptz,
  lembrete_horas_em timestamptz,
  check (coalesce(btrim(medico), '') <> '' or coalesce(btrim(especialidade), '') <> '')
);
create index consultas_paciente_quando on public.consultas (paciente_id, quando);
alter table public.consultas enable row level security;

create policy "consultas: família e idoso veem" on public.consultas for select to authenticated
  using (public.ve_saude(paciente_id) or public.e_paciente(paciente_id));
create policy "consultas: família cadastra" on public.consultas for insert to authenticated
  with check (public.ve_saude(paciente_id) and lembrete_vespera_em is null and lembrete_horas_em is null);
create policy "consultas: família edita" on public.consultas for update to authenticated
  using (public.ve_saude(paciente_id)) with check (public.ve_saude(paciente_id));
create policy "consultas: família apaga" on public.consultas for delete to authenticated
  using (public.ve_saude(paciente_id));

-- Mudou a data ou a hora: os lembretes voltam a valer para a nova data.
create function public._consulta_remarcada() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.quando is distinct from old.quando then
    new.lembrete_vespera_em := null;
    new.lembrete_horas_em := null;
  end if;
  return new;
end;
$$;
create trigger consulta_remarcada before update on public.consultas
  for each row execute function public._consulta_remarcada();
