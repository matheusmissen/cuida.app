// Quem pode chamar funções só de servidor (verificar-doses, pelo pg_cron).
//
// O Supabase injeta nas Edge Functions a service_role antiga (SUPABASE_SERVICE_ROLE_KEY, uma string)
// e, em projetos novos, as chaves secretas novas (SUPABASE_SECRET_KEYS, um JSON { nome: 'sb_secret_...' }).
// Aceitamos qualquer uma delas, recebida em `Authorization: Bearer ...` ou no cabeçalho `apikey`
// (onde o Supabase recomenda mandar as chaves novas). Comparação exata; nada é decodificado.

export interface AmbienteChaves {
  serviceRole?: string | null;
  /** Conteúdo bruto de SUPABASE_SECRET_KEYS (JSON). */
  secretKeysJson?: string | null;
}

export function chavesDeServidor(amb: AmbienteChaves): string[] {
  const chaves: string[] = [];
  if (amb.serviceRole) chaves.push(amb.serviceRole);
  if (amb.secretKeysJson) {
    try {
      const obj = JSON.parse(amb.secretKeysJson) as Record<string, unknown>;
      for (const v of Object.values(obj ?? {})) if (typeof v === 'string' && v) chaves.push(v);
    } catch {
      // JSON inválido: segue só com a service_role
    }
  }
  return chaves;
}

export function credenciaisRecebidas(cabecalhos: { authorization?: string | null; apikey?: string | null }): string[] {
  const bearer = (cabecalhos.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  return [bearer, (cabecalhos.apikey ?? '').trim()].filter((c) => c.length > 0);
}

export function autorizadoComoServidor(recebidas: string[], chaves: string[]): boolean {
  return chaves.length > 0 && recebidas.some((r) => chaves.includes(r));
}

/** Descreve uma chave sem revelá-la, para o log de recusa. */
export function tipoDaChave(chave: string): string {
  if (chave.startsWith('sb_secret_')) return 'sb_secret';
  if (chave.startsWith('sb_publishable_')) return 'sb_publishable';
  if (chave.startsWith('eyJ')) {
    try {
      const parte = chave.split('.')[1] ?? '';
      const json = atob(parte.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parte.length / 4) * 4, '='));
      const papel = (JSON.parse(json) as { role?: string }).role ?? '?';
      return `jwt:${papel}`;
    } catch {
      return 'jwt:?';
    }
  }
  return 'outro';
}
