import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPOS_DEMONSTRACAO, TEMPOS_PADRAO } from '@cuida/regras';
import {
  inicioDaEscalada,
  lerTelefone,
  linkDeLigacao,
  situacaoDaEscalada,
  telefoneFormatado,
  textoDaResolucao,
  type PessoaDoGrupo,
} from '../src/alertas.ts';
import type { AlertaLinha } from '../src/tipos.ts';

const criado = '2026-11-20T11:00:00Z'; // 08:00 em Brasília
function alerta(p: Partial<AlertaLinha> = {}): AlertaLinha {
  return {
    id: 'a1', paciente_id: 'p1', gatilho: 'dose.nao_confirmada', nivel: 'laranja', motivo: 'Não confirmou Remédio A em 30 minutos.',
    criado_em: criado, visto_em: null, avisados: ['neto'], acao_em: null, resolucao: null, dose_id: 'd1', ...p,
  };
}
const neto: PessoaDoGrupo = { usuario_id: 'neto', nome_exibicao: 'Lucas', papel: 'principal' };
const filha: PessoaDoGrupo = { usuario_id: 'filha', nome_exibicao: 'Ana', papel: 'apoio' };

test('laranja aberto: o responsável foi avisado e o grupo será avisado 15 min depois', () => {
  const s = situacaoDaEscalada(alerta(), [filha, neto], TEMPOS_PADRAO, 'neto');
  assert.deepEqual(s.avisados, [{ nome: 'Você', principal: true, voce: true }]);
  assert.equal(s.faltam, 1);
  assert.equal(s.grupoEm?.toISOString(), '2026-11-20T11:15:00.000Z');
  assert.match(s.texto, /até 08:15/);
});

test('reenviar o lembrete adia o aviso ao grupo', () => {
  const a = alerta({ acao_em: '2026-11-20T11:10:00Z' });
  assert.equal(inicioDaEscalada(a), Date.parse('2026-11-20T11:10:00Z'));
  assert.equal(situacaoDaEscalada(a, [neto, filha], TEMPOS_DEMONSTRACAO, 'filha').grupoEm?.toISOString(), '2026-11-20T11:11:00.000Z');
});

test('quem não é você aparece pelo nome; grupo de uma pessoa; todos avisados', () => {
  assert.equal(situacaoDaEscalada(alerta(), [neto, filha], TEMPOS_PADRAO, 'filha').avisados[0].nome, 'Lucas');
  assert.match(situacaoDaEscalada(alerta(), [neto], TEMPOS_PADRAO, 'neto').texto, /única pessoa/);
  assert.equal(situacaoDaEscalada(alerta({ avisados: ['neto', 'filha'] }), [neto, filha], TEMPOS_PADRAO, 'neto').texto, 'Todo o grupo já foi avisado.');
});

test('vermelho avisa todos na hora; resolvido não escala', () => {
  assert.match(situacaoDaEscalada(alerta({ nivel: 'vermelho', avisados: ['neto', 'filha'] }), [neto, filha], TEMPOS_PADRAO, 'neto').texto, /todo o grupo foi avisado na hora/);
  const r = situacaoDaEscalada(alerta({ visto_em: '2026-11-20T11:05:00Z', resolucao: 'tomou' }), [neto, filha], TEMPOS_PADRAO, 'neto');
  assert.equal(r.grupoEm, null);
  assert.match(r.texto, /Resolvido/);
});

test('texto da resolução: tomou, check-in, família', () => {
  assert.equal(textoDaResolucao(alerta(), 'Dona Maria'), null);
  assert.equal(textoDaResolucao(alerta({ visto_em: '2026-11-20T11:12:00Z', resolucao: 'tomou' }), 'Dona Maria'), 'Dona Maria confirmou o remédio às 08:12.');
  assert.match(textoDaResolucao(alerta({ visto_em: '2026-11-20T11:12:00Z', resolucao: 'checkin' }), 'Dona Maria')!, /fez o check-in às 08:12/);
  assert.match(textoDaResolucao(alerta({ visto_em: '2026-11-20T11:12:00Z', resolucao: 'familia' }), 'Dona Maria')!, /está tudo bem, às 08:12/);
});

test('telefone: lê o que a família digita, liga com +55 e mostra formatado', () => {
  assert.equal(lerTelefone('(11) 98765-4321'), '11987654321');
  assert.equal(lerTelefone('+55 11 98765-4321'), '+5511987654321');
  assert.equal(lerTelefone('1234'), null);
  assert.equal(lerTelefone('abc'), null);
  assert.equal(linkDeLigacao('11987654321'), 'tel:+5511987654321');
  assert.equal(linkDeLigacao('+5511987654321'), 'tel:+5511987654321');
  assert.equal(telefoneFormatado('11987654321'), '(11) 98765-4321');
  assert.equal(telefoneFormatado('+5511987654321'), '(11) 98765-4321');
  assert.equal(telefoneFormatado('1132654321'), '(11) 3265-4321');
});
