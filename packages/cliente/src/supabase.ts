// Cliente Supabase para os apps. Usa só a chave anon (pública); RLS protege os dados.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

export function criarCliente(url: string | undefined, chaveAnon: string | undefined): SupabaseClient {
  if (!url || !chaveAnon) {
    throw new Error(
      'Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env do app (veja .env.example).',
    );
  }
  return createClient(url, chaveAnon, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
}
