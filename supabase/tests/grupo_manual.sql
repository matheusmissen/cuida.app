-- Teste manual do grupo de cuidado (Etapa 5), com usuários fictícios.
-- Rode num banco local depois de aplicar as migrations e o seed (psql), como superusuário.
-- Cada linha de resultado deve sair 't' (verdadeiro). Tudo é desfeito no fim (rollback).

\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email, is_anonymous) values
 ('11111111-1111-4111-8111-111111111111','neto@ficticio.dev', false),
 ('44444444-4444-4444-8444-444444444444','filha@ficticio.dev', false),
 ('22222222-2222-4222-8222-222222222222','estranho@ficticio.dev', false),
 ('33333333-3333-4333-8333-333333333333', null, true);
insert into public.cuidadores (usuario_id, paciente_id, papel, nome_exibicao) values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','principal','Lucas');
update public.pacientes set usuario_id = '33333333-3333-4333-8333-333333333333'
 where id = '00000000-0000-4000-8000-000000000001';
create temp table convite (codigo text);
grant all on convite to authenticated;

\echo '--- 1. Só o responsável gera convite'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
savepoint s1;
do $$ begin
  perform public.criar_convite('00000000-0000-4000-8000-000000000001');
  raise exception 'estranho não deveria convidar';
exception when raise_exception then
  if sqlerrm not like 'Só o responsável%' then raise; end if;
end $$;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
insert into convite select public.criar_convite('00000000-0000-4000-8000-000000000001');
select codigo ~ '^[A-HJ-NP-Z2-9]{6}$' as codigo_de_6 from convite;

\echo '--- 2. A filha aceita (minúsculas e espaços valem) e vira acompanhante, 2ª na escala'
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select public.aceitar_convite(' ' || lower((select codigo from convite)) || ' ', 'Ana') = '00000000-0000-4000-8000-000000000001' as entrou;
reset role;
select papel = 'apoio' and ordem_escala = 2 and nome_exibicao = 'Ana' as acompanhante_na_escala
  from public.cuidadores where usuario_id = '44444444-4444-4444-8444-444444444444';

\echo '--- 3. Convite usado não serve de novo; aparelho do idoso (anônimo) não aceita convite'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
savepoint s2;
do $$ begin
  perform public.aceitar_convite((select codigo from convite), 'Estranho');
  raise exception 'convite usado não deveria valer';
exception when raise_exception then
  if sqlerrm not like 'Convite inválido%' then raise; end if;
end $$;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
truncate convite;
insert into convite select public.criar_convite('00000000-0000-4000-8000-000000000001');
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
savepoint s3;
do $$ begin
  perform public.aceitar_convite((select codigo from convite), 'Idosa');
  raise exception 'anônimo não deveria aceitar';
exception when raise_exception then
  if sqlerrm not like 'Entre com a sua conta%' then raise; end if;
end $$;
select true as usado_e_anonimo_recusados;

\echo '--- 4. A acompanhante vê os remédios, mas não muda (nem pela receita)'
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select count(*) > 0 as acompanhante_ve_remedios from public.remedios;
savepoint s4;
do $$ begin
  update public.remedios set dose = '2 comprimidos' where paciente_id = '00000000-0000-4000-8000-000000000001';
  raise exception 'acompanhante não deveria mudar remédio';
exception when raise_exception then
  if sqlerrm <> 'Só o responsável principal muda os remédios' then raise; end if;
end $$;
do $$ begin
  insert into public.remedios (paciente_id, nome, dose) values ('00000000-0000-4000-8000-000000000001', 'Novo', '1');
  raise exception 'acompanhante não deveria criar remédio';
exception when raise_exception then
  if sqlerrm <> 'Só o responsável principal muda os remédios' then raise; end if;
end $$;
select true as acompanhante_nao_muda_remedios;

\echo '--- 5. A acompanhante confirma uma dose ("Tomei" pela família): o estoque baixa normalmente'
select public.confirmar_dose((select id from public.doses where paciente_id = '00000000-0000-4000-8000-000000000001'
  and confirmado_em is null order by previsto_em limit 1)) is not null as acompanhante_confirmou_dose;

\echo '--- 6. O responsável continua mudando remédios'
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
update public.remedios set dose = '1 comprimido' where paciente_id = '00000000-0000-4000-8000-000000000001';
select true as responsavel_muda;

\echo '--- 7. Passar a responsabilidade: a filha vira responsável e o neto, acompanhante'
select public.passar_responsabilidade('00000000-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444')::text = '' as passou;
reset role;
select (select papel from public.cuidadores where usuario_id = '44444444-4444-4444-8444-444444444444') = 'principal'
   and (select papel from public.cuidadores where usuario_id = '11111111-1111-4111-8111-111111111111') = 'apoio' as papeis_trocados;

\echo '--- 8. A responsável não sai sem passar o papel; o acompanhante sai; o estranho não remove ninguém'
set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
savepoint s8;
do $$ begin
  perform public.sair_ou_remover_do_grupo('00000000-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444');
  raise exception 'responsável não deveria sair';
exception when raise_exception then
  if sqlerrm not like 'Passe a responsabilidade%' then raise; end if;
end $$;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  perform public.sair_ou_remover_do_grupo('00000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111');
  raise exception 'estranho não deveria remover';
exception when raise_exception then
  if sqlerrm not like 'Só o responsável%' then raise; end if;
end $$;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.sair_ou_remover_do_grupo('00000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111')::text = '' as acompanhante_saiu;
reset role;
select count(*) = 1 as sobrou_a_responsavel from public.cuidadores where paciente_id = '00000000-0000-4000-8000-000000000001';

rollback;
