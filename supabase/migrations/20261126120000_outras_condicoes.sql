-- Condições de saúde no cadastro (17/11).
-- `condicoes` continua guardando só códigos do catálogo (packages/cliente/src/condicoes.ts), que são
-- os únicos que ligam modelos de alerta. O que a família escrever fora da lista vai para
-- `outras_condicoes`: fica registrado para a família e o médico e nunca gera alerta.

alter table public.pacientes
  add column outras_condicoes text check (char_length(outras_condicoes) <= 300);

comment on column public.pacientes.outras_condicoes is
  'Condições escritas pela família fora da lista. Só registro: as regras de alerta não leem este campo.';

-- criar_paciente passa a aceitar o texto livre (troca de assinatura: a antiga sai).
drop function public.criar_paciente(text, text, text[], text);

create function public.criar_paciente(
  p_nome text,
  p_apelido text default null,
  p_condicoes text[] default '{}',
  p_nome_exibicao text default null,
  p_outras_condicoes text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Login necessário';
  end if;
  insert into public.pacientes (nome, apelido, condicoes, outras_condicoes)
  values (p_nome, p_apelido, coalesce(p_condicoes, '{}'), nullif(trim(p_outras_condicoes), ''))
  returning id into v_id;
  insert into public.cuidadores (usuario_id, paciente_id, papel, ordem_escala, nome_exibicao)
  values (auth.uid(), v_id, 'principal', 1, p_nome_exibicao);
  return v_id;
end;
$$;

revoke all on function public.criar_paciente(text, text, text[], text, text) from public, anon;
grant execute on function public.criar_paciente(text, text, text[], text, text) to authenticated;
