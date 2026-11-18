-- Cuida: Etapa 6 do novo plano — instalar o Cuida e primeiro acesso do idoso (docs/PRD.md, seção 3).
-- A família manda o link de instalação; no app instalado, o idoso digita um código de 4 números que
-- aparece no app da família (passado por telefone ou pessoalmente).
-- 1. gerar_codigo_vinculo: 4 números, vale 30 minutos; um código ativo por paciente (gerar outro apaga o anterior).
--    Códigos usados ou vencidos são apagados, para os 4 números poderem voltar a ser usados.
-- 2. vincular_aparelho: no máximo 5 tentativas erradas a cada 15 minutos por aparelho (contra adivinhação).
--    Código errado devolve null (em vez de erro), para a tentativa ficar registrada.

create table public.tentativas_vinculo (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  tentado_em timestamptz not null default now()
);

create index tentativas_vinculo_usuario on public.tentativas_vinculo (usuario_id, tentado_em desc);
alter table public.tentativas_vinculo enable row level security;
-- Sem políticas: só as funções abaixo leem e gravam.

alter table public.codigos_vinculo alter column expira_em set default now() + interval '30 minutes';

create or replace function public.gerar_codigo_vinculo(p_paciente uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_codigo text;
begin
  if not public.e_cuidador(p_paciente) then
    raise exception 'Sem permissão para este paciente';
  end if;
  -- Limpeza: códigos usados ou vencidos (de qualquer paciente) e o código anterior deste paciente.
  delete from public.codigos_vinculo
   where usado_em is not null or expira_em < now() or paciente_id = p_paciente;
  loop
    v_codigo := lpad((floor(random() * 10000))::int::text, 4, '0');
    begin
      insert into public.codigos_vinculo (codigo, paciente_id, criado_por, expira_em)
      values (v_codigo, p_paciente, auth.uid(), now() + interval '30 minutes');
      return v_codigo;
    exception when unique_violation then
      -- código em uso por outro paciente agora: tenta outro
    end;
  end loop;
end;
$$;

-- O app do idoso (já logado anonimamente) digita o código. Devolve o paciente, ou null se o código não vale.
create or replace function public.vincular_aparelho(p_codigo text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_paciente uuid;
begin
  if auth.uid() is null then
    raise exception 'Login necessário';
  end if;
  if (select count(*) from public.tentativas_vinculo
       where usuario_id = auth.uid() and tentado_em > now() - interval '15 minutes') >= 5 then
    raise exception 'Muitas tentativas. Espere alguns minutos.';
  end if;
  update public.codigos_vinculo
     set usado_em = now()
   where codigo = btrim(p_codigo) and usado_em is null and expira_em > now()
  returning paciente_id into v_paciente;
  if v_paciente is null then
    insert into public.tentativas_vinculo (usuario_id) values (auth.uid());
    return null;
  end if;
  delete from public.tentativas_vinculo where usuario_id = auth.uid();
  update public.pacientes
     set usuario_id = auth.uid(), ultima_interacao_em = now()
   where id = v_paciente;
  return v_paciente;
end;
$$;

revoke all on function public.gerar_codigo_vinculo(uuid), public.vincular_aparelho(text) from public, anon;
grant execute on function public.gerar_codigo_vinculo(uuid), public.vincular_aparelho(text) to authenticated;
