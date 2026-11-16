// Ferramentas do agente (formato de tool use da API da Anthropic: name, description, input_schema).

export const FERRAMENTAS = [
  {
    name: 'registrar_checkin',
    description:
      'Registra como a pessoa está se sentindo. Chame ao final do check-in ou assim que ouvir qualquer sintoma. ' +
      'Preencha só o que foi dito; deixe de fora o que não foi falado. Na dúvida sobre um sintoma, marque-o.',
    input_schema: {
      type: 'object',
      properties: {
        febre: { type: 'boolean', description: 'Relatou febre, "quentinha", corpo quente.' },
        temperatura: { type: 'number', description: 'Temperatura em °C, se ela mediu e disse o valor.' },
        calafrio: { type: 'boolean' },
        sangramento: { type: 'boolean', description: 'Gengiva, nariz, urina ou fezes com sangue.' },
        manchas: { type: 'boolean', description: 'Manchas roxas novas.' },
        sinais_infeccao: { type: 'boolean', description: 'Tosse com catarro, ardência ao urinar, ferida que não fecha.' },
        cansaco: { type: 'string', enum: ['nenhum', 'leve', 'forte'] },
        humor: { type: 'string', enum: ['bom', 'regular', 'baixo'] },
        apetite_baixo: { type: 'boolean' },
        nausea: { type: 'boolean' },
        queda: { type: 'boolean' },
        dor_no_peito: { type: 'boolean' },
        falta_de_ar: { type: 'boolean' },
        confuso: { type: 'boolean', description: 'Respostas desconexas ou desorientação.' },
        sono: { type: 'string', description: 'Como dormiu, em poucas palavras.' },
        notas: { type: 'string', description: 'Outra informação útil para a família, em uma frase.' },
      },
    },
  },
  {
    name: 'confirmar_remedio',
    description: 'Registra que a pessoa tomou um remédio agora. Use o nome como ela falou.',
    input_schema: {
      type: 'object',
      properties: { remedio: { type: 'string', description: 'Nome ou descrição do remédio.' } },
      required: ['remedio'],
    },
  },
  {
    name: 'pedir_ajuda',
    description:
      'Avisa toda a família imediatamente. Use se a pessoa pedir ajuda, disser que caiu, sentir dor no peito ou falta de ar.',
    input_schema: {
      type: 'object',
      properties: { motivo: { type: 'string', description: 'O que aconteceu, em uma frase.' } },
      required: ['motivo'],
    },
  },
  {
    name: 'proximos_compromissos',
    description: 'Lista os remédios que ainda faltam hoje e os próximos compromissos.',
    input_schema: { type: 'object', properties: {} },
  },
] as const;

export type NomeFerramenta = (typeof FERRAMENTAS)[number]['name'];
