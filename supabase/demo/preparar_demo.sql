-- Prepara (ou recria do zero) a paciente de demonstração dos jurados. TODOS OS DADOS SÃO FICTÍCIOS.
-- Rode no SQL Editor do Supabase (ou pelo conector) antes de gravar o vídeo e antes da avaliação.
--
-- Antes: crie a conta de demonstração em Authentication → Users → Add user (marque "Auto Confirm User"),
-- com o e-mail abaixo. A senha fica só com você; este script não precisa dela.
--
-- O que faz, para a conta de demonstração:
-- 1. Apaga a paciente que essa conta acompanhava (e tudo dela: remédios, doses, check-ins, alertas).
-- 2. Cria "Dona Maria" (78 anos, leucemia), com a conta como responsável.
-- 3. Três remédios, uma semana de doses (uma esquecida, já resolvida) e de check-ins com rostinhos,
--    e uma consulta daqui a 2 dias.
-- 4. Doses de hoje que já passaram ficam como tomadas, para o painel começar limpo.
-- 5. Põe no grupo a "Bruna (neta)", acompanhante FICTÍCIA (conta sem senha: ninguém entra com ela).
--    Ela aparece em "Quem foi avisado" quando o alerta laranja sobe para o grupo.
-- 6. Registra o aceite dos termos atuais na conta de demonstração (os jurados não param nessa tela).
-- O celular da Dona Maria começa desconectado (quem testar faz o primeiro acesso com o código de 4 números).
-- Sem celular conectado, cada remédio vencido vira alerta sozinho: primeiro para o responsável e,
-- 1 minuto depois, para o grupo (a Bruna). Assim dá para ver o fluxo inteiro sem um segundo celular.
-- v_ja_consentiu = true: a Dona Maria já deu as 3 permissões (sem "mostrar para a família", a LGPD
-- não deixa o alerta chegar à acompanhante). Troque para false se quiser mostrar a tela de
-- consentimento no primeiro acesso; aí o alerta só sobe para o grupo depois que ela concordar.

do $$
declare
  v_email constant text := 'jurados@example.com';  -- troque se usar outro e-mail
  v_ja_consentiu constant boolean := true;         -- veja a explicação acima (v_ja_consentiu)
  v_versao_termos constant text := '2026-11-20';  -- igual a VERSAO_TERMOS em packages/cliente/src/termos.ts
  v_bruna constant uuid := 'b7a1c0de-0000-4000-8000-00000000b001';  -- acompanhante fictícia
  v_usuario uuid;
  v_paciente uuid;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  r_a uuid; r_b uuid; r_c uuid;
begin
  select id into v_usuario from auth.users where email = v_email;
  if v_usuario is null then
    raise exception 'Crie antes a conta % em Authentication → Users', v_email;
  end if;

  delete from public.pacientes
   where id in (select paciente_id from public.cuidadores where usuario_id = v_usuario);

  insert into public.pacientes (nome, apelido, data_nascimento, condicoes, limite_febre, medico_contato,
                                consentimento_em, ultima_interacao_em, horario_checkin,
                                tolerancia_dose_min, tolerancia_checkin_min, escalada_min,
                                consente_registro_em, consente_familia_em, consente_lia_em, consentimento_respondido_em)
  values ('Maria Aparecida Souza', 'Dona Maria', (v_hoje - interval '78 years 3 months')::date, '{leucemia}', 37.8,
          'Dra. Fictícia — Hematologia', now() - interval '7 days', null, '08:00',
          1, 1, 1,  -- modo demonstração: tudo em 1 minuto (troque em Ajustes, no app da família)
          case when v_ja_consentiu then now() - interval '7 days' end,
          case when v_ja_consentiu then now() - interval '7 days' end,
          case when v_ja_consentiu then now() - interval '7 days' end,
          case when v_ja_consentiu then now() - interval '7 days' end)
  returning id into v_paciente;

  if v_ja_consentiu then
    insert into public.consentimentos_historico (paciente_id, finalidade, aceito, em)
    select v_paciente, f, true, now() - interval '7 days' from unnest(array['registro', 'familia', 'lia']) as f;
  end if;

  -- Acompanhante fictícia: conta sem senha e sem login, só para aparecer no grupo e receber a escalada.
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v_bruna, 'authenticated', 'authenticated', 'bruna.demo@example.com',
          '{"provider":"email","providers":["email"]}', '{}', now(), now())
  on conflict (id) do nothing;

  insert into public.cuidadores (usuario_id, paciente_id, papel, ordem_escala, nome_exibicao)
  values (v_usuario, v_paciente, 'principal', 1, 'Lucas (neto)'),
         (v_bruna, v_paciente, 'apoio', 2, 'Bruna (neta)');

  insert into public.termos_aceitos (usuario_id, versao) values (v_usuario, v_versao_termos)
  on conflict do nothing;

  insert into public.remedios (paciente_id, nome, dose, critico, estoque_doses)
  values (v_paciente, 'Remédio A (quimioterapia oral)', '1 comprimido', true, 28) returning id into r_a;
  insert into public.remedios (paciente_id, nome, dose, critico, estoque_doses)
  values (v_paciente, 'Remédio B (pressão)', '1 comprimido', false, 30) returning id into r_b;
  insert into public.remedios (paciente_id, nome, dose, critico, estoque_doses)
  values (v_paciente, 'Vitamina D', '10 gotas', false, 60) returning id into r_c;

  insert into public.horarios (remedio_id, paciente_id, hora) values
    (r_a, v_paciente, '08:00'), (r_b, v_paciente, '08:00'), (r_b, v_paciente, '20:00'), (r_c, v_paciente, '12:00');

  -- Última semana: tudo tomado em poucos minutos, menos o Remédio B da noite de anteontem (esquecido).
  insert into public.doses (horario_id, paciente_id, previsto_em, confirmado_em, status)
  select h.id, v_paciente,
         ((v_hoje - d) + h.hora) at time zone 'America/Sao_Paulo',
         case when d = 2 and h.hora = '20:00' then null
              else ((v_hoje - d) + h.hora + interval '4 minutes') at time zone 'America/Sao_Paulo' end,
         (case when d = 2 and h.hora = '20:00' then 'perdido' else 'tomado' end)::public.status_dose
    from public.horarios h cross join generate_series(1, 7) as d
   where h.paciente_id = v_paciente;

  -- Hoje e amanhã; o que já passou hoje fica como tomado (o painel começa sem alertas).
  perform public._gerar_doses(v_hoje, v_paciente);
  perform public._gerar_doses(v_hoje + 1, v_paciente);
  update public.doses set status = 'tomado', confirmado_em = previsto_em + interval '3 minutes'
   where paciente_id = v_paciente and previsto_em < now() - interval '2 minutes' and confirmado_em is null
     and previsto_em >= (v_hoje::timestamp at time zone 'America/Sao_Paulo');

  -- Check-ins da semana com rostinhos (1 = muito bem … 6 = muito mal); hoje ainda não respondeu.
  insert into public.checkins (paciente_id, feito_em, nivel, cansaco, humor, sono, notas)
  select v_paciente, ((v_hoje - d) + time '08:06') at time zone 'America/Sao_Paulo', n, c, h, s, t
    from (values (6, 1, 'nenhum', 'bom', 'dormiu bem', 'Falou das plantas do quintal.'),
                 (5, 2, 'leve', 'bom', 'dormiu bem', null),
                 (4, 1, 'nenhum', 'bom', 'dormiu bem', 'O neto Lucas passou para almoçar.'),
                 (3, 3, 'leve', 'regular', 'demorou para dormir', null),
                 (2, 2, 'leve', 'bom', 'dormiu bem', 'Contou da visita da vizinha.'),
                 (1, 2, 'leve', 'regular', 'acordou uma vez', null)) as x(d, n, c, h, s, t);

  -- A dose esquecida de anteontem: alerta laranja, já resolvido pela família.
  insert into public.alertas (paciente_id, gatilho, nivel, motivo, criado_em, visto_em, visto_por, resolucao, avisados)
  values (v_paciente, 'dose.nao_confirmada', 'laranja', 'Não confirmou Remédio B (pressão) em 30 minutos.',
          ((v_hoje - 2) + time '20:30') at time zone 'America/Sao_Paulo',
          ((v_hoje - 2) + time '20:41') at time zone 'America/Sao_Paulo', v_usuario, 'familia', array[v_usuario, v_bruna]);

  -- Uma consulta daqui a 2 dias (aparece no painel e, no celular, como "Próxima consulta").
  insert into public.consultas (paciente_id, quando, medico, especialidade, local, observacao, criado_por)
  values (v_paciente, ((v_hoje + 2) + time '14:00') at time zone 'America/Sao_Paulo', 'Dra. Fictícia', 'Hematologia',
          'Clínica Exemplo, sala 3', 'Levar os exames de sangue', v_usuario);

  insert into public.memoria_paciente (paciente_id, chave, valor) values
    (v_paciente, 'tratamento', 'Dona Maria'),
    (v_paciente, 'familia', 'Neto Lucas (cuida dos remédios), neta Bruna (acompanha), filha Ana (mora em outra cidade)'),
    (v_paciente, 'rotina', 'Acorda às 7h, gosta de conversar sobre as plantas do quintal');

  raise notice 'Pronto: Dona Maria criada (%), responsável %, acompanhante Bruna (fictícia), permissões: %',
    v_paciente, v_email, v_ja_consentiu;
end $$;
