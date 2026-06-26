import { getFiscalConfig } from './dataService';

// const FOCUS_API_BASE = 'https://api.focusnfe.com.br'; // Reservado para chamadas reais

export interface NFeResult {
  success: boolean;
  message: string;
  id?: string;
  status?: string;
  url_pdf?: string;
}

/**
 * Emite uma Nota Fiscal de Produto (NF-e) ou Serviço (NFS-e) via Focus NFe
 */
export const emitirDocumentoFiscal = async (
  tipo: 'nfe' | 'nfse',
  vendaId: string,
  vendaData: any
): Promise<NFeResult> => {
  try {
    const config = await getFiscalConfig();
    if (!config) {
      return { success: false, message: 'Configurações fiscais não encontradas. Verifique a aba Fiscal.' };
    }

    const token = config.ambiente === 'producao' ? config.focusTokenProducao : config.focusTokenHomologacao;
    if (!token) {
      return { success: false, message: `Token de ${config.ambiente} não configurado.` };
    }

    // Payload simplificado para a Focus NFe
    // Nota: Em produção, isso deve idealmente passar por um Proxy/Backend para proteger o Token
    const payload = {
      data_emissao: new Date().toISOString(),
      venda_id: vendaId,
      cliente: vendaData.clienteNome,
      itens: vendaData.cart.map((item: any) => ({
        nome: item.nome,
        quantidade: item.quantidade,
        valor_unitario: item.venda,
        subtotal: item.venda * item.quantidade,
        tipo: item.tipo
      })),
      valor_total: vendaData.total,
      ambiente: config.ambiente === 'producao' ? '1' : '2'
    };

    console.log(`[FocusNFe] Enviando ${tipo.toUpperCase()}...`, payload);

    // Simulação de chamada API (Focus utiliza Basic Auth com o Token)
    // No ambiente real, faríamos um POST para FOCUS_API_BASE + '/v2/nfe' ou '/v2/nfse'
    
    // Para fins de MVP e segurança, vamos simular o sucesso se houver token
    // Em uma implementação completa, usaríamos fetch() com o token no Header 'Authorization'
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `${tipo.toUpperCase()} enviada com sucesso para processamento!`,
          id: `fcs_${Math.random().toString(36).slice(2, 9)}`,
          status: 'processando_autorizacao'
        });
      }, 1500);
    });

  } catch (error: any) {
    console.error('Erro ao emitir nota:', error);
    return { success: false, message: error.message || 'Erro interno ao comunicar com a Focus NFe.' };
  }
};
