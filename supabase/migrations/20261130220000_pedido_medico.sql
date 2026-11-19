-- Cuida: pedido médico (docs/PRD.md, seção 7). A Lia lê o pedido, a guia ou o cartão de retorno e
-- SUGERE data, médico, especialidade, local e preparo (Edge Function ler-receita, _shared/pedido.ts).
-- Nada vira consulta sozinho: a família confere e confirma em "Confira o pedido" (conferir_pedido).
-- Como a receita, o pedido entra com status 'enviado' e tem leitura da IA.
-- (O valor novo do enum é comparado como texto: ele só pode ser usado como enum depois desta transação.)

alter type public.tipo_documento add value if not exists 'pedido';

-- Qual consulta saiu deste pedido (para mostrar "Consulta marcada").
alter table public.documentos
  add column consulta_id uuid references public.consultas (id) on delete set null;

-- Leitura da IA: receitas e pedidos.
alter table public.documentos drop constraint documentos_check1;
alter table public.documentos add constraint documentos_leitura_so_receita_ou_pedido
  check (tipo::text in ('receita', 'pedido') or (leitura is null and status in ('enviado', 'conferida')));

-- Receitas e pedidos entram como 'enviado' (esperam a leitura); exames e relatórios, 'conferida'.
drop policy "documentos: família envia" on public.documentos;
create policy "documentos: família envia" on public.documentos for insert to authenticated
  with check (public.ve_saude(paciente_id) and enviado_por = auth.uid() and leitura is null and consulta_id is null
              and status = case when tipo::text in ('receita', 'pedido') then 'enviado'::public.status_documento
                                else 'conferida'::public.status_documento end);

-- O app não muda a consulta ligada ao pedido (só conferir_pedido).
create or replace function public._proteger_leitura() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated'
     and (new.leitura is distinct from old.leitura
          or new.status is distinct from old.status
          or new.arquivo_path is distinct from old.arquivo_path
          or new.paciente_id is distinct from old.paciente_id
          or new.tipo is distinct from old.tipo
          or new.consulta_id is distinct from old.consulta_id) then
    raise exception 'Só o título e a data podem ser alterados pelo app';
  end if;
  return new;
end;
$$;

-- A família confere o pedido: com p_consulta, cria a consulta (com os dados que ela conferiu);
-- sem p_consulta (null), só marca o pedido como conferido. Devolve o id da consulta criada (ou null).
-- p_consulta: { quando (ISO), medico, especialidade, local, observacao }.
create function public.conferir_pedido(p_documento uuid, p_consulta jsonb default null) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_doc public.documentos%rowtype;
  v_quando timestamptz;
  v_medico text;
  v_especialidade text;
  v_consulta uuid;
begin
  select * into v_doc from public.documentos where id = p_documento;
  if v_doc.id is null or not public.ve_saude(v_doc.paciente_id) then
    raise exception 'Documento não encontrado';
  end if;
  if v_doc.tipo::text <> 'pedido' then
    raise exception 'Só pedidos médicos viram consulta';
  end if;
  if v_doc.status = 'conferida' then
    raise exception 'Este pedido já foi conferido';
  end if;

  if p_consulta is not null then
    begin
      v_quando := (p_consulta->>'quando')::timestamptz;
    exception when others then
      raise exception 'Data ou horário inválido';
    end;
    if v_quando is null then
      raise exception 'Informe a data e o horário da consulta';
    end if;
    if v_quando < now() then
      raise exception 'A data da consulta já passou';
    end if;
    v_medico := nullif(btrim(p_consulta->>'medico'), '');
    v_especialidade := nullif(btrim(p_consulta->>'especialidade'), '');
    if v_medico is null and v_especialidade is null then
      raise exception 'Informe o médico ou a especialidade';
    end if;
    insert into public.consultas (paciente_id, quando, medico, especialidade, local, observacao, criado_por)
    values (v_doc.paciente_id, v_quando, left(v_medico, 80), left(v_especialidade, 60),
            left(nullif(btrim(p_consulta->>'local'), ''), 120), left(nullif(btrim(p_consulta->>'observacao'), ''), 300),
            auth.uid())
    returning id into v_consulta;
  end if;

  update public.documentos
     set status = 'conferida', conferido_por = auth.uid(), conferido_em = now(), consulta_id = v_consulta
   where id = p_documento;
  return v_consulta;
end;
$$;

revoke all on function public.conferir_pedido(uuid, jsonb) from public, anon;
grant execute on function public.conferir_pedido(uuid, jsonb) to authenticated;
