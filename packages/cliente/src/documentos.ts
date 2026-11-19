// Documentos da família (receitas, pedidos médicos, exames, relatórios) — lógica pura, testada em Node.
// A leitura da receita é feita pela Edge Function ler-receita (só sugestões). Aqui fica o
// estado da conferência: só itens conferidos pela família viram alarmes
// (criar_alarmes_da_receita). Na dúvida, o item fica "Precisa de você" e fora da lista.
import { instanteDaConsulta, lerDataDaConsulta } from './consultas.ts';
import { lerHora } from './formato.ts';

export type TipoDocumento = 'receita' | 'pedido' | 'exame' | 'relatorio';
export type StatusDocumento = 'enviado' | 'lendo' | 'aguardando_conferencia' | 'conferida' | 'erro';

/** Item como a ler-receita grava em documentos.leitura.itens (supabase/functions/_shared/receita.ts). */
export interface ItemLeitura {
  nome: string;
  dose: string;
  frequencia: string;
  horarios: string[];
  duracao_dias: number | null;
  uso_continuo: boolean;
  precisa_revisao: boolean;
  motivos: string[];
  observacao: string | null;
}

export interface DocumentoLinha {
  id: string;
  paciente_id: string;
  tipo: TipoDocumento;
  titulo: string;
  data_documento: string | null;
  arquivo_path: string;
  mime: string | null;
  status: StatusDocumento;
  leitura: { itens?: ItemLeitura[]; pedido?: LeituraPedido } | null;
  criado_em: string;
  conferido_em: string | null;
  /** Consulta criada a partir do pedido médico (conferir_pedido). */
  consulta_id?: string | null;
}

export const SELECT_DOCUMENTO =
  'id, paciente_id, tipo, titulo, data_documento, arquivo_path, mime, status, leitura, criado_em, conferido_em, consulta_id';

/** Item na tela "Confira a receita". */
export interface ItemConferencia extends ItemLeitura {
  /** A família conferiu (ou a leitura foi segura): entra nos alarmes. */
  conferido: boolean;
  /** A família decidiu não criar alarme para este item. */
  deFora: boolean;
  critico: boolean;
}

export const NOME_TIPO: Record<TipoDocumento, string> = {
  receita: 'Receita',
  pedido: 'Pedido médico',
  exame: 'Exame',
  relatorio: 'Relatório médico',
};

export const MIMES_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'] as const;
export type MimeAceito = (typeof MIMES_ACEITOS)[number];
/** A ler-receita só lê estes (e até 5 MB). */
export const MIMES_LEITURA: MimeAceito[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const TAMANHO_MAXIMO_LEITURA = 5 * 1024 * 1024;

const EXTENSAO: Record<MimeAceito, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
};
const POR_EXTENSAO: Record<string, MimeAceito> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  pdf: 'application/pdf',
};

/** Tipo do arquivo aceito pela tabela documentos, pelo mime informado ou pela extensão. */
export function mimeDoArquivo(nome: string | null | undefined, informado: string | null | undefined): MimeAceito | null {
  const m = (informado ?? '').toLowerCase();
  if ((MIMES_ACEITOS as readonly string[]).includes(m)) return m as MimeAceito;
  if (m === 'image/jpg') return 'image/jpeg';
  const ext = (nome ?? '').toLowerCase().split('.').pop() ?? '';
  return POR_EXTENSAO[ext] ?? null;
}

/** Caminho no bucket 'documentos': '<paciente_id>/<data>-<aleatório>.<ext>' (sem o nome original). */
export function caminhoDoArquivo(pacienteId: string, mime: MimeAceito, agora: Date, aleatorio: string): string {
  const carimbo = agora.toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
  const sufixo = aleatorio.replace(/[^a-z0-9]/gi, '').slice(0, 12).toLowerCase() || 'arquivo';
  return `${pacienteId}/${carimbo}-${sufixo}.${EXTENSAO[mime]}`;
}

/** Título do documento: 'Receita · Hematologia' ou só 'Receita' (máx. 120 caracteres). */
export function tituloDoDocumento(tipo: TipoDocumento, complemento: string): string {
  const extra = complemento.replace(/\s+/g, ' ').trim();
  return (extra ? `${NOME_TIPO[tipo]} · ${extra}` : NOME_TIPO[tipo]).slice(0, 120);
}

/** Estado inicial da conferência a partir da leitura da IA. */
export function itensParaConferencia(itens: ItemLeitura[] | undefined): ItemConferencia[] {
  return (itens ?? []).map((i) => ({
    ...i,
    conferido: !i.precisa_revisao && i.horarios.length > 0 && Boolean(i.nome.trim()) && Boolean(i.dose.trim()),
    deFora: false,
    critico: false,
  }));
}

const entra = (i: ItemConferencia) => i.conferido && !i.deFora;

/** Quantos alarmes (horários) os itens conferidos vão criar — texto do botão "Criar N alarmes". */
export function contarAlarmesConferidos(itens: ItemConferencia[]): number {
  return itens.filter(entra).reduce((total, i) => total + new Set(i.horarios).size, 0);
}

/** Corpo de criar_alarmes_da_receita: só os itens conferidos e não deixados de fora. */
export function itensParaCriar(itens: ItemConferencia[]) {
  return itens.filter(entra).map((i) => ({
    nome: i.nome.trim(),
    dose: i.dose.trim(),
    horarios: [...new Set(i.horarios)].sort(),
    duracao_dias: i.duracao_dias,
    critico: i.critico,
  }));
}

/** '1 comprimido · de 8 em 8 horas · por 7 dias'. */
export function descricaoDoItem(i: ItemLeitura): string {
  const partes = [i.dose, i.frequencia];
  if (i.duracao_dias) partes.push(i.duracao_dias === 1 ? 'por 1 dia' : `por ${i.duracao_dias} dias`);
  else if (i.uso_continuo) partes.push('uso contínuo');
  return partes.filter((p) => p && p.trim()).join(' · ');
}

/** O que falta para a família resolver, em linguagem simples. */
export function oQueFalta(i: ItemLeitura): string {
  if (!i.nome.trim() || i.nome === 'Remédio sem nome') return 'a Lia não conseguiu ler o nome';
  if (!i.dose.trim()) return 'a Lia não conseguiu ler a dose';
  if (i.horarios.length === 0) return 'a Lia não conseguiu ler a frequência';
  return 'leitura incerta: confira com a receita em papel';
}

/** Rodapé com os itens que ficam de fora dos alarmes. */
export function rodapeDeFora(itens: ItemConferencia[]): string | null {
  const pendentes = itens.filter((i) => !i.conferido && !i.deFora).map((i) => i.nome);
  const excluidos = itens.filter((i) => i.deFora).map((i) => i.nome);
  const lista = (nomes: string[]) =>
    nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
  const frases: string[] = [];
  if (pendentes.length) {
    frases.push(
      `${pendentes.length === 1 ? 'O' : 'Os remédios'} ${lista(pendentes)} ${pendentes.length === 1 ? 'fica' : 'ficam'} de fora até você definir os horários.`,
    );
  }
  if (excluidos.length) frases.push(`${lista(excluidos)}: sem alarme, por sua escolha.`);
  return frases.length ? frases.join(' ') : null;
}

export interface Edicao {
  nome: string;
  dose: string;
  horarios: string;
  critico: boolean;
}

/** Aplica a edição da família. Com nome, dose e ao menos um horário válido, o item fica conferido. */
export function aplicarEdicao(item: ItemConferencia, e: Edicao): { item: ItemConferencia } | { erro: string } {
  const nome = e.nome.replace(/\s+/g, ' ').trim();
  const dose = e.dose.replace(/\s+/g, ' ').trim();
  if (!nome) return { erro: 'Informe o nome do remédio.' };
  if (!dose) return { erro: 'Informe a dose (por exemplo, 1 comprimido).' };
  const partes = e.horarios.split(/[,;\s]+/).filter(Boolean);
  const lidos = partes.map(lerHora);
  if (partes.length === 0) return { erro: 'Defina pelo menos um horário, por exemplo 08:00.' };
  if (lidos.some((h) => h === null)) return { erro: 'Horário inválido. Use, por exemplo: 08:00, 20:00' };
  if (lidos.length > 6) return { erro: 'No máximo 6 horários por remédio.' };
  return {
    item: {
      ...item,
      nome: nome.slice(0, 120),
      dose: dose.slice(0, 120),
      horarios: [...new Set(lidos as string[])].sort(),
      critico: e.critico,
      conferido: true,
      deFora: false,
      precisa_revisao: false,
    },
  };
}

export type SituacaoDocumento = 'lendo' | 'conferir' | 'ativa' | 'marcada' | 'erro' | 'guardado';

/** Receitas e pedidos médicos são lidos pela Lia; exames e relatórios só são guardados. */
export const lidoPelaLia = (tipo: TipoDocumento): boolean => tipo === 'receita' || tipo === 'pedido';

/** O que mostrar no selo da lista de documentos. */
export function situacaoDoDocumento(d: Pick<DocumentoLinha, 'tipo' | 'status'> & { consulta_id?: string | null }): SituacaoDocumento {
  if (!lidoPelaLia(d.tipo)) return 'guardado';
  if (d.status === 'aguardando_conferencia') return 'conferir';
  if (d.status === 'conferida') return d.tipo === 'receita' ? 'ativa' : d.consulta_id ? 'marcada' : 'guardado';
  if (d.status === 'erro') return 'erro';
  return 'lendo';
}

// Pedido médico ------------------------------------------------------------------

/** Como a ler-receita grava em documentos.leitura.pedido (supabase/functions/_shared/pedido.ts). */
export interface LeituraPedido {
  tipo_pedido: 'consulta' | 'retorno' | 'exame' | 'outro';
  descricao: string;
  medico: string;
  especialidade: string;
  data: string | null;
  data_pelo_prazo: boolean;
  hora: string | null;
  local: string;
  observacao: string;
  precisa_revisao: boolean;
  motivos: string[];
}

/** Campos da tela "Confira o pedido" (texto, como a família digita). */
export interface FormularioPedido {
  data: string;
  hora: string;
  medico: string;
  especialidade: string;
  local: string;
  observacao: string;
}

/** Preenche o formulário com a sugestão da Lia (data em DD/MM/AAAA; vazio onde ela não leu). */
export function formularioDoPedido(p: LeituraPedido | null | undefined): FormularioPedido {
  const data = p?.data && /^\d{4}-\d{2}-\d{2}$/.test(p.data) ? `${p.data.slice(8, 10)}/${p.data.slice(5, 7)}/${p.data.slice(0, 4)}` : '';
  return {
    data,
    hora: p?.hora ?? '',
    medico: p?.medico ?? '',
    especialidade: p?.especialidade ?? '',
    local: p?.local ?? '',
    observacao: p?.observacao ?? '',
  };
}

const limpo = (t: string, max: number) => t.replace(/\s+/g, ' ').trim().slice(0, max);

/** Confere o formulário e monta o corpo de conferir_pedido. A data não pode ter passado. */
export function consultaDoFormulario(
  f: FormularioPedido,
  agora: Date,
): { consulta: { quando: string; medico: string | null; especialidade: string | null; local: string | null; observacao: string | null } } | { erro: string } {
  const data = lerDataDaConsulta(f.data, agora);
  if (!data) return { erro: 'Escreva a data da consulta, por exemplo 28/11/2026.' };
  const hora = lerHora(f.hora);
  if (!hora) return { erro: 'Escreva o horário, por exemplo 14:30.' };
  const quando = instanteDaConsulta(data, hora);
  if (Date.parse(quando) < agora.getTime()) return { erro: 'Essa data e horário já passaram.' };
  const medico = limpo(f.medico, 80);
  const especialidade = limpo(f.especialidade, 60);
  if (!medico && !especialidade) return { erro: 'Escreva o médico ou a especialidade.' };
  return {
    consulta: {
      quando,
      medico: medico || null,
      especialidade: especialidade || null,
      local: limpo(f.local, 120) || null,
      observacao: limpo(f.observacao, 300) || null,
    },
  };
}
