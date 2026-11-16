import { criarCliente } from '@cuida/cliente';

export const supabase = criarCliente(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
