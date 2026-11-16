// Testes da rede de segurança e da revisão de respostas do agente.
// Garantem os limites do CLAUDE.md sem depender do LLM. Todos os dados são fictícios.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectarSinais, mesclarSinais, normalizar, temSinalDeAlerta } from '../agente/sinais.ts';
import { RESPOSTA_SEGURA, revisarResposta } from '../agente/revisao.ts';
import { montarPromptSistema } from '../agente/prompt.ts';
import { FERRAMENTAS } from '../agente/ferramentas.ts';
import { avaliarCheckin } from '../_shared/regras/index.ts';

describe('rede de segurança: linguagem do dia a dia', () => {
  const casos: [string, Record<string, unknown>][] = [
    ['Tô quentinha hoje, minha filha', { febre: true }],
    ['acordei com o corpo quente e uma tremedeira', { febre: true, calafrio: true }],
    ['Saiu sangue da gengiva quando escovei', { sangramento: true }],
    ['apareceu umas manchinhas roxas no braço', { manchas: true }],
    ['Tô meio caída, sem força nenhuma', { cansaco: 'forte', humor: 'baixo' }],
    ['tô cansadinha', { cansaco: 'leve' }],
    ['Caí no banheiro agora há pouco', { queda: true }],
    ['tô sentindo um aperto no peito', { dorNoPeito: true }],
    ['tô com falta de ar', { faltaDeAr: true }],
    ['tô enjoada e sem fome', { nausea: true, apetiteBaixo: true }],
  ];

  for (const [fala, esperado] of casos) {
    it(`"${fala}"`, () => {
      const sinais = detectarSinais(fala) as Record<string, unknown>;
      for (const [campo, valor] of Object.entries(esperado)) {
        assert.equal(sinais[campo], valor, `campo ${campo}`);
      }
    });
  }
});

describe('rede de segurança: negações', () => {
  it('"não tive febre nem calafrio" não marca febre nem calafrio', () => {
    const s = detectarSinais('Não tive febre nem calafrio, graças a Deus');
    assert.equal(s.febre, undefined);
    assert.equal(s.calafrio, undefined);
  });

  it('"sem sangramento" não marca sangramento', () => {
    assert.equal(detectarSinais('tá tudo certo, sem sangramento nenhum').sangramento, undefined);
  });

  it('negação de um sintoma não apaga outro', () => {
    const s = detectarSinais('não tive febre, mas tô com umas manchas roxas');
    assert.equal(s.febre, undefined);
    assert.equal(s.manchas, true);
  });

  it('dia tranquilo não marca nada', () => {
    assert.deepEqual(detectarSinais('Dormi bem, tomei meu café e estou ótima'), {});
  });
});

describe('mescla: o sinal mais grave vence', () => {
  it('LLM perdeu a febre, a rede encontrou', () => {
    const r = mesclarSinais({ humor: 'bom' }, detectarSinais('tô quentinha'));
    assert.equal(r.febre, true);
  });

  it('cansaço e humor ficam com o grau maior', () => {
    const r = mesclarSinais({ cansaco: 'leve', humor: 'regular' }, { cansaco: 'forte', humor: 'baixo' });
    assert.equal(r.cansaco, 'forte');
    assert.equal(r.humor, 'baixo');
    const r2 = mesclarSinais({ cansaco: 'forte' }, { cansaco: 'leve' });
    assert.equal(r2.cansaco, 'forte');
  });

  it('a rede nunca desmarca o que o LLM marcou', () => {
    assert.equal(mesclarSinais({ sangramento: true }, {}).sangramento, true);
  });

  it('fluxo da demo: "tô quentinha" vira alerta vermelho para paciente com leucemia', () => {
    const sinais = mesclarSinais({}, detectarSinais('Ai, tô quentinha hoje'));
    assert.ok(temSinalDeAlerta(sinais));
    const alertas = avaliarCheckin({ feitoEm: '2026-11-20T09:00:00-03:00', ...sinais }, [], { condicoes: ['leucemia'] });
    assert.equal(alertas[0]?.nivel, 'vermelho');
    assert.equal(alertas[0]?.gatilho, 'leucemia.febre');
  });
});

describe('revisão das respostas da Lia', () => {
  const bloqueadas = [
    'Ah, isso não é nada, dona Maria!',
    'Não precisa se preocupar, deve ser bobagem.',
    'A senhora pode parar o remédio por hoje.',
    'Toma um paracetamol que passa.',
    'Me fala a senha do banco que eu resolvo.',
    'Parece que a senhora está com uma infecção.',
  ];
  for (const r of bloqueadas) {
    it(`bloqueia: "${r}"`, () => {
      const rev = revisarResposta(r);
      assert.equal(rev.bloqueada, true);
      assert.equal(rev.texto, RESPOSTA_SEGURA);
    });
  }

  const permitidas = [
    'Bom dia, dona Maria! Como a senhora dormiu?',
    'Entendi. Vou avisar o Lucas agora, tá bom?',
    'A senhora sentiu febre ou calafrio desde ontem?',
    'É importante falar com o seu médico sobre isso.',
    'Se alguém pedir senha por mensagem, não passe: é golpe.',
  ];
  for (const r of permitidas) {
    it(`permite: "${r}"`, () => {
      assert.equal(revisarResposta(r).bloqueada, false);
    });
  }
});

describe('prompt e ferramentas', () => {
  const prompt = montarPromptSistema({
    nomeAssistente: 'Lia',
    apelido: 'Dona Maria',
    condicoes: ['leucemia'],
    memoria: [{ chave: 'familia', valor: 'Neto Lucas' }],
    agoraLocal: 'quinta-feira, 20 de novembro, 9h05',
    compromissosHoje: ['12h: Vitamina D'],
  });

  it('inclui os limites obrigatórios', () => {
    const p = normalizar(prompt);
    for (const trecho of ['nunca de diagnostico', 'nao e nada', 'nunca sugira parar', 'nunca peca senha', 'quentinha']) {
      assert.ok(p.includes(trecho), `faltou: ${trecho}`);
    }
  });

  it('inclui perguntas de leucemia só quando a condição existe', () => {
    assert.match(prompt, /sangramento/);
    const sem = montarPromptSistema({
      nomeAssistente: 'Lia', apelido: 'Seu João', condicoes: [], memoria: [], agoraLocal: 'agora', compromissosHoje: [],
    });
    assert.doesNotMatch(sem, /mancha roxa/);
  });

  it('as quatro ferramentas do MVP existem', () => {
    assert.deepEqual(
      FERRAMENTAS.map((f) => f.name).sort(),
      ['confirmar_remedio', 'pedir_ajuda', 'proximos_compromissos', 'registrar_checkin'],
    );
  });
});
