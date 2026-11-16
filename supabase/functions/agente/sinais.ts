// Rede de segurança determinística do check-in.
// O LLM extrai os sintomas da fala; esta rede procura palavras-chave na mesma fala.
// As duas extrações são mescladas e o sinal mais grave vence ("na dúvida, sobe o nível").
// Assim, se o LLM deixar passar um "tô quentinha", o alerta de febre sai mesmo assim.

import type { Cansaco, Checkin, Humor } from '../_shared/regras/index.ts';

export type Sinais = Omit<Partial<Checkin>, 'feitoEm' | 'temperatura'>;

/** Minúsculas, sem acentos, espaços simples. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9,.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type Campo = keyof Sinais;

interface Padrao {
  campo: Campo;
  valor: boolean | Cansaco | Humor;
  regex: RegExp;
}

const PADROES: Padrao[] = [
  { campo: 'febre', valor: true, regex: /\b(febre|febril|quentinh[ao]|esquentad[ao]|corpo quente|testa quente|pelando)\b/ },
  { campo: 'calafrio', valor: true, regex: /\b(calafrios?|tremedeira|tremendo de frio)\b/ },
  { campo: 'sangramento', valor: true, regex: /\b(sangr\w*|sangue)\b/ },
  { campo: 'manchas', valor: true, regex: /\b(manchas?|roxos?|roxas?|roxinh[ao]s?|hematomas?)\b/ },
  { campo: 'queda', valor: true, regex: /\b(cai|caiu|tombo|escorreguei|levei uma queda)\b/ },
  { campo: 'dorNoPeito', valor: true, regex: /\b(dor no peito|aperto no peito|peito doendo|peito apertado)\b/ },
  { campo: 'faltaDeAr', valor: true, regex: /\b(falta de ar|sem ar|faltando ar|nao consigo respirar|dificil respirar)\b/ },
  { campo: 'nausea', valor: true, regex: /\b(enjo\w*|nausea|vomit\w*|ansia)\b/ },
  { campo: 'apetiteBaixo', valor: true, regex: /\b(sem fome|sem apetite|nao tenho fome|nao comi|perdi a fome)\b/ },
  { campo: 'sinaisInfeccao', valor: true, regex: /\b(catarro|ardendo pra urinar|ardencia|ferida que nao fecha|pus)\b/ },
  { campo: 'cansaco', valor: 'forte', regex: /\b(muito cansad[ao]|exaust[ao]|sem forca|meio caid[ao]|caidinh[ao]|moid[ao]|acabad[ao]|derrubad[ao])\b/ },
  { campo: 'cansaco', valor: 'leve', regex: /\b(cansad[ao]|cansadinh[ao]|indisposta|indisposto)\b/ },
  { campo: 'humor', valor: 'baixo', regex: /\b(triste|tristinh[ao]|desanimad[ao]|pra baixo|chorando|chorei|meio caid[ao]|sozinha demais|sozinho demais)\b/ },
  { campo: 'confuso', valor: true, regex: /\b(confus[ao]|esqueci onde estou|nao sei que dia|perdid[ao] em casa)\b/ },
];

/** "não", "nem", "sem", "nenhum" logo antes da palavra anulam o sinal ("não tive febre"). */
const NEGACAO = /\b(nao|nem|sem|nenhum|nenhuma|nunca)\b(\s+\S+){0,2}\s*$/;

function negado(texto: string, inicio: number): boolean {
  return NEGACAO.test(texto.slice(Math.max(0, inicio - 30), inicio));
}

const GRAU_CANSACO: Record<Cansaco, number> = { nenhum: 0, leve: 1, forte: 2 };
const GRAU_HUMOR: Record<Humor, number> = { bom: 0, regular: 1, baixo: 2 };

/** Procura sinais de alerta na fala. Só marca o que encontrou; o resto fica indefinido. */
export function detectarSinais(fala: string): Sinais {
  const texto = normalizar(fala);
  const sinais: Sinais = {};
  for (const p of PADROES) {
    const regex = new RegExp(p.regex.source, 'g');
    for (const m of texto.matchAll(regex)) {
      if (negado(texto, m.index ?? 0)) continue;
      const atual = sinais[p.campo];
      if (p.campo === 'cansaco') {
        if (atual === undefined || GRAU_CANSACO[p.valor as Cansaco] > GRAU_CANSACO[atual as Cansaco]) {
          sinais.cansaco = p.valor as Cansaco;
        }
      } else if (p.campo === 'humor') {
        sinais.humor = 'baixo';
      } else {
        (sinais as Record<string, unknown>)[p.campo] = true;
      }
      break;
    }
  }
  return sinais;
}

/** Junta o que o LLM extraiu com a rede de segurança. O mais grave vence. */
export function mesclarSinais(doLlm: Partial<Checkin>, daRede: Sinais): Partial<Checkin> {
  const r: Partial<Checkin> = { ...doLlm };
  for (const [campo, valor] of Object.entries(daRede) as [keyof Sinais, unknown][]) {
    if (campo === 'cansaco') {
      const a = r.cansaco, b = valor as Cansaco;
      r.cansaco = a === undefined || GRAU_CANSACO[b] > GRAU_CANSACO[a] ? b : a;
    } else if (campo === 'humor') {
      const a = r.humor, b = valor as Humor;
      r.humor = a === undefined || GRAU_HUMOR[b] > GRAU_HUMOR[a] ? b : a;
    } else if (valor === true) {
      (r as Record<string, unknown>)[campo] = true;
    }
  }
  return r;
}

/** Tem algum sinal que justifique registrar o check-in mesmo sem o LLM pedir? */
export function temSinalDeAlerta(s: Sinais): boolean {
  return Boolean(
    s.febre || s.calafrio || s.sangramento || s.manchas || s.queda || s.dorNoPeito ||
      s.faltaDeAr || s.sinaisInfeccao || s.confuso || s.cansaco === 'forte',
  );
}
