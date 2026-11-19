import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aplicarEdicao,
  caminhoDoArquivo,
  consultaDoFormulario,
  formularioDoPedido,
  lidoPelaLia,
  contarAlarmesConferidos,
  descricaoDoItem,
  itensParaConferencia,
  itensParaCriar,
  mimeDoArquivo,
  oQueFalta,
  rodapeDeFora,
  situacaoDoDocumento,
  tituloDoDocumento,
  type ItemLeitura,
} from '../src/documentos.ts';

// Receita fictícia (mesma da tela de referência).
const leitura: ItemLeitura[] = [
  { nome: 'Remédio C', dose: '1 comprimido', frequencia: 'de 8 em 8 horas', horarios: ['06:00', '14:00', '22:00'], duracao_dias: 7, uso_continuo: false, precisa_revisao: false, motivos: [], observacao: null },
  { nome: 'Remédio D', dose: '20 gotas', frequencia: 'ao deitar', horarios: ['22:00'], duracao_dias: null, uso_continuo: true, precisa_revisao: false, motivos: [], observacao: null },
  { nome: 'Remédio E', dose: '1 comprimido', frequencia: '', horarios: [], duracao_dias: null, uso_continuo: false, precisa_revisao: true, motivos: ['Não foi possível ler a frequência.'], observacao: null },
];

test('itens seguros entram conferidos; "precisa de revisão" fica fora', () => {
  const itens = itensParaConferencia(leitura);
  assert.deepEqual(itens.map((i) => i.conferido), [true, true, false]);
  assert.equal(contarAlarmesConferidos(itens), 4); // "Criar 4 alarmes"
});

test('item com revisão e horários sugeridos também espera a família', () => {
  const [i] = itensParaConferencia([{ ...leitura[0], precisa_revisao: true, motivos: ['Leitura incerta: confira com a receita em papel.'] }]);
  assert.equal(i.conferido, false);
  assert.equal(oQueFalta(i), 'leitura incerta: confira com a receita em papel');
});

test('só os conferidos vão para criar_alarmes_da_receita', () => {
  const itens = itensParaConferencia(leitura);
  assert.deepEqual(itensParaCriar(itens), [
    { nome: 'Remédio C', dose: '1 comprimido', horarios: ['06:00', '14:00', '22:00'], duracao_dias: 7, critico: false },
    { nome: 'Remédio D', dose: '20 gotas', horarios: ['22:00'], duracao_dias: null, critico: false },
  ]);
});

test('definir horários confere o item e ele passa a contar', () => {
  const itens = itensParaConferencia(leitura);
  const r = aplicarEdicao(itens[2], { nome: 'Remédio E', dose: '1 comprimido', horarios: '8h, 20:00', critico: true });
  assert.ok('item' in r);
  assert.deepEqual(r.item.horarios, ['08:00', '20:00']);
  assert.equal(r.item.conferido, true);
  const novos = [itens[0], itens[1], r.item];
  assert.equal(contarAlarmesConferidos(novos), 6);
  assert.equal(itensParaCriar(novos)[2].critico, true);
});

test('edição inválida não confere', () => {
  const [, , e] = itensParaConferencia(leitura);
  assert.deepEqual(aplicarEdicao(e, { nome: 'Remédio E', dose: '1 comprimido', horarios: '', critico: false }), {
    erro: 'Defina pelo menos um horário, por exemplo 08:00.',
  });
  assert.ok('erro' in aplicarEdicao(e, { nome: 'Remédio E', dose: '1 comprimido', horarios: '25:00', critico: false }));
  assert.ok('erro' in aplicarEdicao(e, { nome: ' ', dose: '1 comprimido', horarios: '08:00', critico: false }));
  assert.ok('erro' in aplicarEdicao(e, { nome: 'Remédio E', dose: '', horarios: '08:00', critico: false }));
});

test('deixar de fora tira o item dos alarmes', () => {
  const itens = itensParaConferencia(leitura);
  itens[1] = { ...itens[1], deFora: true };
  assert.equal(contarAlarmesConferidos(itens), 3);
  assert.equal(itensParaCriar(itens).length, 1);
  assert.equal(rodapeDeFora(itens), 'O Remédio E fica de fora até você definir os horários. Remédio D: sem alarme, por sua escolha.');
});

test('rodapé com um e com vários pendentes; nada quando tudo conferido', () => {
  const itens = itensParaConferencia(leitura);
  assert.equal(rodapeDeFora(itens), 'O Remédio E fica de fora até você definir os horários.');
  const dois = itensParaConferencia([leitura[2], { ...leitura[2], nome: 'Remédio F' }]);
  assert.equal(rodapeDeFora(dois), 'Os remédios Remédio E e Remédio F ficam de fora até você definir os horários.');
  assert.equal(rodapeDeFora(itensParaConferencia([leitura[0]])), null);
});

test('descrição do item como na tela', () => {
  assert.equal(descricaoDoItem(leitura[0]), '1 comprimido · de 8 em 8 horas · por 7 dias');
  assert.equal(descricaoDoItem(leitura[1]), '20 gotas · ao deitar · uso contínuo');
  assert.equal(oQueFalta(leitura[2]), 'a Lia não conseguiu ler a frequência');
});

test('tipo do arquivo: aceita imagens e PDF, pelo mime ou pela extensão', () => {
  assert.equal(mimeDoArquivo('foto.jpg', 'image/jpeg'), 'image/jpeg');
  assert.equal(mimeDoArquivo('receita.PDF', null), 'application/pdf');
  assert.equal(mimeDoArquivo('x', 'image/jpg'), 'image/jpeg');
  assert.equal(mimeDoArquivo('planilha.xlsx', 'application/vnd.ms-excel'), null);
});

test('caminho no bucket começa pelo paciente e não usa o nome original', () => {
  const p = caminhoDoArquivo('00000000-0000-4000-8000-000000000001', 'application/pdf', new Date('2026-11-23T12:34:56Z'), 'a1B2-c3');
  assert.equal(p, '00000000-0000-4000-8000-000000000001/20261123T123456-a1b2c3.pdf');
});

test('título do documento', () => {
  assert.equal(tituloDoDocumento('receita', '  Hematologia '), 'Receita · Hematologia');
  assert.equal(tituloDoDocumento('relatorio', ''), 'Relatório médico');
  assert.equal(tituloDoDocumento('exame', 'x'.repeat(200)).length, 120);
});

test('situação na lista de documentos', () => {
  assert.equal(situacaoDoDocumento({ tipo: 'receita', status: 'aguardando_conferencia' }), 'conferir');
  assert.equal(situacaoDoDocumento({ tipo: 'receita', status: 'conferida' }), 'ativa');
  assert.equal(situacaoDoDocumento({ tipo: 'receita', status: 'lendo' }), 'lendo');
  assert.equal(situacaoDoDocumento({ tipo: 'receita', status: 'enviado' }), 'lendo');
  assert.equal(situacaoDoDocumento({ tipo: 'receita', status: 'erro' }), 'erro');
  assert.equal(situacaoDoDocumento({ tipo: 'exame', status: 'conferida' }), 'guardado');
});

test('pedido médico: selo na lista conforme a conferência', () => {
  assert.equal(situacaoDoDocumento({ tipo: 'pedido', status: 'enviado' }), 'lendo');
  assert.equal(situacaoDoDocumento({ tipo: 'pedido', status: 'aguardando_conferencia' }), 'conferir');
  assert.equal(situacaoDoDocumento({ tipo: 'pedido', status: 'conferida', consulta_id: 'c1' }), 'marcada');
  assert.equal(situacaoDoDocumento({ tipo: 'pedido', status: 'conferida', consulta_id: null }), 'guardado');
  assert.equal(situacaoDoDocumento({ tipo: 'pedido', status: 'erro' }), 'erro');
  assert.equal(lidoPelaLia('pedido'), true);
  assert.equal(lidoPelaLia('exame'), false);
});

test('pedido médico: a sugestão da Lia preenche o formulário', () => {
  const f = formularioDoPedido({
    tipo_pedido: 'consulta',
    descricao: 'Avaliação',
    medico: 'Dra. Ana',
    especialidade: 'Hematologia',
    data: '2026-12-03',
    data_pelo_prazo: false,
    hora: '14:30',
    local: 'Clínica Exemplo',
    observacao: 'Levar exames',
    precisa_revisao: false,
    motivos: [],
  });
  assert.deepEqual(f, {
    data: '03/12/2026',
    hora: '14:30',
    medico: 'Dra. Ana',
    especialidade: 'Hematologia',
    local: 'Clínica Exemplo',
    observacao: 'Levar exames',
  });
  assert.deepEqual(formularioDoPedido(null), { data: '', hora: '', medico: '', especialidade: '', local: '', observacao: '' });
});

test('pedido médico: o formulário conferido vira o corpo de conferir_pedido', () => {
  const agora = new Date('2026-11-20T10:00:00-03:00');
  const base = { data: '03/12/2026', hora: '14:30', medico: ' Dra.  Ana ', especialidade: '', local: '', observacao: '' };
  const ok = consultaDoFormulario(base, agora);
  assert.ok('consulta' in ok);
  if ('consulta' in ok) {
    assert.equal(ok.consulta.quando, '2026-12-03T17:30:00.000Z');
    assert.equal(ok.consulta.medico, 'Dra. Ana');
    assert.equal(ok.consulta.especialidade, null);
    assert.equal(ok.consulta.local, null);
  }
  assert.deepEqual(consultaDoFormulario({ ...base, data: '' }, agora), { erro: 'Escreva a data da consulta, por exemplo 28/11/2026.' });
  assert.deepEqual(consultaDoFormulario({ ...base, hora: '25:00' }, agora), { erro: 'Escreva o horário, por exemplo 14:30.' });
  assert.deepEqual(consultaDoFormulario({ ...base, data: '20/11/2026', hora: '09:00' }, agora), { erro: 'Essa data e horário já passaram.' });
  assert.deepEqual(consultaDoFormulario({ ...base, medico: '' }, agora), { erro: 'Escreva o médico ou a especialidade.' });
});
