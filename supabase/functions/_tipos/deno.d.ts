// Só para a checagem de tipos em Node (npm run typecheck): o mínimo do Deno que as funções usam.
// No Supabase, o Deno de verdade fornece estes objetos.
declare const Deno: {
  env: { get(nome: string): string | undefined };
  serve(tratar: (pedido: Request) => Response | Promise<Response>): void;
};
