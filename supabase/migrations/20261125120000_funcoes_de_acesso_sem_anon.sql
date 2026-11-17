-- As funções de checagem de acesso usadas nas políticas de RLS não precisam ser chamadas sem login.
-- Sem login elas já devolvem sempre "false" (auth.uid() é nulo), mas o aviso de segurança do Supabase
-- (0028_anon_security_definer_function_executable) pede que funções SECURITY DEFINER não fiquem
-- expostas ao papel anon pela API. As políticas são todas "to authenticated", então nada muda no app.

revoke all on function public.e_cuidador(uuid), public.e_cuidador_principal(uuid), public.e_paciente(uuid)
  from public, anon;
grant execute on function public.e_cuidador(uuid), public.e_cuidador_principal(uuid), public.e_paciente(uuid)
  to authenticated;
