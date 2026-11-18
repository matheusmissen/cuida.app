// Cartão "Notificações neste celular" (web push): mostra a situação e ativa com um toque.
// No painel aparece só enquanto dá para fazer algo (ativar ou instalar); em Ajustes, sempre.
import { textoDasNotificacoes } from '@cuida/cliente';
import { Botao, Cartao, Erro, Texto, Titulo } from '@/components/ui';
import { useNotificacoes } from '@/lib/notificacoes';

export function CartaoNotificacoes({ soQuandoFaltar = false }: { soQuandoFaltar?: boolean }) {
  const { estado, ativar, ativando, erro } = useNotificacoes();
  if (!estado) return null;
  if (soQuandoFaltar && estado !== 'pedir' && estado !== 'instalar_primeiro') return null;
  if (!soQuandoFaltar && estado === 'sem_suporte' && typeof document === 'undefined') return null; // app nativo
  return (
    <Cartao style={{ gap: 8 }}>
      <Titulo>Notificações neste celular</Titulo>
      <Texto suave>{textoDasNotificacoes(estado, 'familia')}</Texto>
      <Erro mensagem={erro} />
      {estado === 'pedir' && <Botao titulo="Ativar notificações" onPress={ativar} carregando={ativando} />}
    </Cartao>
  );
}
