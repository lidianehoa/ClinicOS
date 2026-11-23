import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck,
  Download,
  Upload,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Share2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileBadge,
  Copy,
  Check,
  Plus,
  Trash2,
  Ban,
  Pill
} from 'lucide-react';
import {
  ReceitaDigital,
  StatusReceita,
  SubtipoReceita,
  ItemReceitaPrescrita,
  saveReceita,
  substituirReceita,
  cancelarReceita as cancelarReceitaService,
  generateVerificationCode,
  getActiveTenantId,
  getClinicConfig,
  AppUser
} from '../services/dataService';
import {
  generateDispensationToken,
  calcularValidadeReceita
} from '../services/dispensationService';
import { gerarPdfReceita, getReceitaFileName } from '../services/prescriptionPdfService';
import { functions, httpsCallable } from '../services/firebase';

interface ReceitaDigitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReceita?: ReceitaDigital | null;
  pacienteId?: string;
  pacienteNome?: string;
  pacienteEspecie?: string;
  pacienteRaca?: string;
  pacienteIdade?: string;
  pacientePeso?: number | string;
  tutorNome?: string;
  tutorCpf?: string;
  tutorTelefone?: string;
  tutorEndereco?: string;
  atendimentoId?: string;
  initialClinicalContent?: string;
  initialTipo?: 'receita_simples' | 'receita_manipulada';
  userProfile?: AppUser | null;
  onSaved?: (receita: ReceitaDigital) => void;
}

const TEMPLATE_SIMPLES = `USO ORAL:
1) Fármaco / Princípio Ativo ________ - Frasco ou Comprimidos
   Administrar __ mg por via oral a cada __ horas durante __ dias.

2) Protetor ou Suporte ________
   Administrar __ mL a cada __ horas durante __ dias.`;

const TEMPLATE_MANIPULADO = `FÓRMULA MAGISTRAL VETERINÁRIA:
Princípio Ativo: ________ ______ mg
Veículo / Sabor: Pasta oral palatável sabor frango/carne q.s.p. __ doses
Posologia: Administrar 1 dose pela via oral a cada 24 horas por 30 dias consecutivos.`;

const CLAUSULA_LEGAL_PADRAO =
  'RECEITUÁRIO MÉDICO-VETERINÁRIO: Válido em todo o território nacional. Em conformidade com o Código de Ética do Médico Veterinário (Resolução CFMV nº 1138/2016). Em caso de dúvidas sobre a posologia ou reações adversas, contate a clínica.';

export const ReceitaDigitalModal: React.FC<ReceitaDigitalModalProps> = ({
  isOpen,
  onClose,
  initialReceita,
  pacienteId,
  pacienteNome,
  pacienteEspecie,
  pacienteRaca,
  pacienteIdade,
  pacientePeso,
  tutorNome,
  tutorCpf,
  tutorTelefone,
  tutorEndereco,
  atendimentoId,
  initialClinicalContent,
  initialTipo = 'receita_simples',
  userProfile,
  onSaved
}) => {
  const [receita, setReceita] = useState<ReceitaDigital | null>(initialReceita || null);

  // Subtipo e Tipo
  const [subtipo, setSubtipo] = useState<SubtipoReceita>(() => {
    if (initialReceita?.subtipo) return initialReceita.subtipo;
    if (initialReceita?.tipo === 'receita_manipulada' || initialTipo === 'receita_manipulada') {
      return 'magistral';
    }
    return 'simples';
  });

  const [tipo, setTipo] = useState<'receita_simples' | 'receita_manipulada'>(
    initialReceita?.tipo || (initialTipo === 'receita_manipulada' ? 'receita_manipulada' : 'receita_simples')
  );

  // Itens Estruturados
  const [itens, setItens] = useState<ItemReceitaPrescrita[]>(() => {
    if (initialReceita?.itens && initialReceita.itens.length > 0) {
      return initialReceita.itens;
    }
    return [
      {
        id: `item_1`,
        produto: '',
        concentracao: '',
        quantidadePrescrita: 1,
        quantidadeExtenso: '',
        unidade: 'caixa(s)',
        posologia: '',
        quantidadeDispensada: 0,
        saldoRestante: 1,
      },
    ];
  });

  const [conteudo, setConteudo] = useState<string>(() => {
    if (initialReceita?.conteudoPrescricao) return initialReceita.conteudoPrescricao;
    if (initialClinicalContent) return initialClinicalContent;
    return initialTipo === 'receita_manipulada' ? TEMPLATE_MANIPULADO : TEMPLATE_SIMPLES;
  });

  const [orientacoesTexto, setOrientacoesTexto] = useState<string>(() => {
    if (initialReceita?.orientacoes && Array.isArray(initialReceita.orientacoes)) {
      return initialReceita.orientacoes.join('\n');
    }
    return 'Manter os medicamentos em local seco, fresco e protegido da luz solar direta.\nManter fora do alcance de crianças e de outros animais.';
  });

  const [observacoesResponsavel, setObservacoesResponsavel] = useState<string>(
    initialReceita?.observacoesResponsavel || ''
  );

  const [isControlado, setIsControlado] = useState<boolean>(initialReceita?.isControlado || false);
  const [numeroNotificacaoSipeagro, setNumeroNotificacaoSipeagro] = useState<string>(
    initialReceita?.numeroNotificacaoSipeagro || ''
  );

  const [clinicConfig, setClinicConfig] = useState<any>(null);
  const [clinicLogo, setClinicLogo] = useState<string>('');

  // Estados de Operação da Assinatura
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedSignedFile, setSelectedSignedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Assinatura com certificado A1 (.pfx) no navegador — arquivo e senha ficam só em memória
  const [arquivoPfx, setArquivoPfx] = useState<File | null>(null);
  const [senhaPfx, setSenhaPfx] = useState('');
  const [isAssinandoA1, setIsAssinandoA1] = useState(false);

  // Carregar dados da clínica
  useEffect(() => {
    const cachedLogo = localStorage.getItem('clinicos_clinic_logo');
    if (cachedLogo) setClinicLogo(cachedLogo);
    getClinicConfig()
      .then(cfg => {
        if (cfg) {
          setClinicConfig(cfg);
          if (cfg.logoUrl) setClinicLogo(cfg.logoUrl);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialReceita) {
      setReceita(initialReceita);
      setSubtipo(initialReceita.subtipo || (initialReceita.tipo === 'receita_manipulada' ? 'magistral' : 'simples'));
      setTipo(initialReceita.tipo);
      setConteudo(initialReceita.conteudoPrescricao);
      setIsControlado(!!initialReceita.isControlado);
      setNumeroNotificacaoSipeagro(initialReceita.numeroNotificacaoSipeagro || '');
      if (initialReceita.itens && initialReceita.itens.length > 0) {
        setItens(initialReceita.itens);
      }
      if (initialReceita.orientacoes) {
        setOrientacoesTexto(initialReceita.orientacoes.join('\n'));
      }
      if (initialReceita.observacoesResponsavel) {
        setObservacoesResponsavel(initialReceita.observacoesResponsavel);
      }
    }
  }, [initialReceita]);

  if (!isOpen) return null;

  const currentStatus: StatusReceita = receita?.status || 'rascunho';
  const isLocked = currentStatus !== 'rascunho';
  const isControladoSemSipeagro =
    isControlado && subtipo === 'simples' && !numeroNotificacaoSipeagro.trim();

  const tenantId = getActiveTenantId();
  const tenantSlug = clinicConfig?.name
    ? clinicConfig.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .slice(0, 25)
    : tenantId;

  const localCrmv = typeof window !== 'undefined' ? localStorage.getItem('clinicos_crmv') : '';
  const resolvedCrmv = userProfile?.crmv || localCrmv || receita?.veterinarioCrmv || 'CRMV-SP 00000';
  const resolvedVetNome = userProfile?.nome || receita?.veterinarioNome || 'Médico(a) Veterinário(a)';
  const resolvedMapa = userProfile?.registroMapa || clinicConfig?.registroMapa || receita?.registroMapa || '';

  // Aviso MAPA para controle especial
  const showMapaWarning = subtipo === 'controle_especial' && !resolvedMapa;

  // Itens helpers
  const handleAddItem = () => {
    const newItem: ItemReceitaPrescrita = {
      id: `item_${Date.now()}`,
      produto: '',
      concentracao: '',
      quantidadePrescrita: 1,
      quantidadeExtenso: '',
      unidade: 'caixa(s)',
      posologia: '',
      quantidadeDispensada: 0,
      saldoRestante: 1,
    };
    setItens([...itens, newItem]);
  };

  const handleRemoveItem = (idx: number) => {
    if (itens.length <= 1) return;
    setItens(itens.filter((_, i) => i !== idx));
  };

  const handleUpdateItem = (idx: number, patch: Partial<ItemReceitaPrescrita>) => {
    setItens(
      itens.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, ...patch };
        if (patch.quantidadePrescrita !== undefined) {
          const qtd = Number(patch.quantidadePrescrita) || 0;
          updated.saldoRestante = Math.max(0, qtd - (updated.quantidadeDispensada || 0));
        }
        return updated;
      })
    );
  };

  // ── AÇÃO 1: BAIXAR PARA ASSINAR ───────────────────────────────────────────
  const handleBaixarParaAssinar = async (
    opcoes: {
      baixar?: boolean;
      /** Dados do certificado A1 já lido: o PDF sai com o selo de assinado em vez de "Aguardando". */
      assinaturaPrevista?: { em: string; titular: string; cpfMascarado: string; emissorAC: string };
    } = {}
  ): Promise<{ pdfBytes: Uint8Array; receitaSalva: ReceitaDigital } | null> => {
    if (isControladoSemSipeagro) {
      alert(
        'Medicamento controlado: emita a Notificação de Receita no SIPEAGRO e registre o número aqui antes de prosseguir.'
      );
      return null;
    }

    // Validar se há itens preenchidos
    const itensValidos = itens.filter(it => it.produto.trim().length > 0);
    if (itensValidos.length === 0 && !conteudo.trim()) {
      alert('Preencha os medicamentos da prescrição antes de gerar o documento.');
      return null;
    }

    setIsGeneratingPdf(true);
    setValidationError(null);

    try {
      const codigoVerif = receita?.codigoVerificacao || generateVerificationCode(10);
      const tokenDisp = receita?.tokenDispensacao || generateDispensationToken();
      const recId = receita?.id || `rec_${Date.now()}`;

      const { validadeAte, validadeDias } = calcularValidadeReceita(subtipo);

      // Converter itens estruturados para o PDF
      const pdfItens = (itensValidos.length > 0 ? itensValidos : itens).map(it => ({
        produto: it.produto || 'Medicamento',
        concentracao: it.concentracao,
        quantidade: it.quantidadePrescrita,
        quantidadeExtenso: it.quantidadeExtenso,
        unidade: it.unidade,
        posologia: it.posologia,
      }));

      const orientacoesList = orientacoesTexto
        .split('\n')
        .map(t => t.trim())
        .filter(Boolean);

      // Montar dados para o gerador de PDF
      const pdfData = {
        tokenDispensacao: tokenDisp,
        codigoVerificacao: codigoVerif,
        tenantSlug,
        subtipo,
        tipo: subtipo === 'magistral' ? ('receita_manipulada' as const) : ('receita_simples' as const),
        // Com A1, o selo já sai como assinado: a assinatura é aplicada logo em seguida sobre estes bytes.
        status: (opcoes.assinaturaPrevista ? 'assinada' : 'aguardando_assinatura') as StatusReceita,
        assinaturaInfo: opcoes.assinaturaPrevista,
        dataEmissao: receita?.criadoEm || new Date().toISOString(),
        validadeAte,
        validadeDias,
        clinicName: clinicConfig?.name,
        clinicCnpj: clinicConfig?.cnpj,
        clinicPhone: clinicConfig?.phone,
        clinicEmail: clinicConfig?.email,
        clinicAddress: clinicConfig?.address
          ? `${clinicConfig.address.logradouro || ''}, ${clinicConfig.address.numero || ''} — ${clinicConfig.address.cidade || ''}/${clinicConfig.address.estado || ''}`
          : undefined,
        clinicLogoBase64: clinicLogo,
        clinicSlogan: clinicConfig?.slogan,
        primaryColorHex: clinicConfig?.primaryColor || '#1A4C37',
        veterinarioNome: resolvedVetNome,
        veterinarioCrmv: resolvedCrmv,
        veterinarioEmail: userProfile?.email || receita?.veterinarioCpf,
        veterinarioCpf: userProfile?.cpf || receita?.veterinarioCpf,
        cpfPrescritorModo: userProfile?.cpfPrescritorModo || 'ocultar',
        registroMapa: resolvedMapa,
        pacienteNome: pacienteNome || receita?.pacienteNome || 'Paciente',
        pacienteEspecie: pacienteEspecie || receita?.pacienteEspecie,
        pacienteRaca: pacienteRaca || receita?.pacienteRaca,
        pacienteIdade: pacienteIdade || receita?.pacienteIdade,
        pacientePeso: pacientePeso || receita?.pacientePeso,
        tutorNome: tutorNome || receita?.tutorNome || 'Tutor Responsável',
        tutorCpf: tutorCpf || receita?.tutorCpf,
        tutorTelefone: tutorTelefone || receita?.tutorTelefone,
        tutorEndereco: tutorEndereco || receita?.tutorEndereco,
        itens: pdfItens,
        conteudoClinico: conteudo,
        orientacoes: orientacoesList,
        observacoesResponsavel: observacoesResponsavel.trim() || undefined,
        isControlado: subtipo === 'controle_especial' || isControlado,
        numeroNotificacaoSipeagro: isControlado ? numeroNotificacaoSipeagro.trim() : undefined,
      };

      const { pdfBytes, originalSize, originalHashSha256, fileName } = await gerarPdfReceita(pdfData);

      // Salvar receita no Firestore com status 'aguardando_assinatura'
      const receitaToSave: ReceitaDigital = {
        id: recId,
        codigoVerificacao: codigoVerif,
        tokenDispensacao: tokenDisp,
        tenantId,
        pacienteId: pacienteId || receita?.pacienteId || 'paciente_generico',
        atendimentoId: atendimentoId || receita?.atendimentoId,
        tipo: subtipo === 'magistral' ? 'receita_manipulada' : 'receita_simples',
        subtipo,
        status: 'aguardando_assinatura',
        statusDispensacao: 'nao_dispensada',
        veterinarioId: userProfile?.uid || receita?.veterinarioId || 'vet_uid',
        veterinarioNome: resolvedVetNome,
        veterinarioCrmv: resolvedCrmv,
        veterinarioCpf: userProfile?.cpf || receita?.veterinarioCpf,
        registroMapa: resolvedMapa,
        cpfPrescritorModo: userProfile?.cpfPrescritorModo || 'ocultar',
        pacienteNome: pacienteNome || receita?.pacienteNome || 'Paciente',
        pacienteEspecie: pacienteEspecie || receita?.pacienteEspecie,
        pacienteRaca: pacienteRaca || receita?.pacienteRaca,
        pacienteIdade: pacienteIdade || receita?.pacienteIdade,
        pacientePeso: pacientePeso ? Number(pacientePeso) : undefined,
        tutorNome: tutorNome || receita?.tutorNome || 'Tutor',
        tutorCpf: tutorCpf || receita?.tutorCpf,
        tutorTelefone: tutorTelefone || receita?.tutorTelefone,
        tutorEndereco: tutorEndereco || receita?.tutorEndereco,
        itens: (itensValidos.length > 0 ? itensValidos : itens).map(it => ({
          ...it,
          saldoRestante: it.quantidadePrescrita,
          quantidadeDispensada: 0,
        })),
        orientacoes: orientacoesList,
        observacoesResponsavel: observacoesResponsavel.trim() || undefined,
        conteudoPrescricao: conteudo,
        baseLegal: CLAUSULA_LEGAL_PADRAO,
        isControlado: subtipo === 'controle_especial' || isControlado,
        numeroNotificacaoSipeagro: isControlado ? numeroNotificacaoSipeagro.trim() : undefined,
        validadeDias,
        validadeAte,
        versao: receita?.versao || 1,
        originalSize,
        originalHashSha256,
        criadoEm: receita?.criadoEm || new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };

      await saveReceita(receitaToSave);
      setReceita(receitaToSave);
      if (onSaved) onSaved(receitaToSave);

      if (opcoes.baixar === false) {
        setIsGeneratingPdf(false);
        return { pdfBytes, receitaSalva: receitaToSave };
      }

      // Disparar download do arquivo PDF original para assinatura
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName || getReceitaFileName(pacienteNome || 'Paciente', new Date(), false, tutorNome);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setIsGeneratingPdf(false);
      return { pdfBytes, receitaSalva: receitaToSave };
    } catch (err: any) {
      console.error('Erro ao gerar PDF para assinatura:', err);
      setIsGeneratingPdf(false);
      setValidationError('Erro ao gerar o arquivo PDF: ' + (err.message || 'Tente novamente.'));
      return null;
    }
  };

  // ── AÇÃO 1-B: ASSINAR COM CERTIFICADO A1 NO NAVEGADOR ─────────────────────
  const handleAssinarComA1 = async () => {
    if (!arquivoPfx || !senhaPfx) {
      setValidationError('Escolha o arquivo do certificado (.pfx ou .p12) e digite a senha.');
      return;
    }
    setIsAssinandoA1(true);
    setValidationError(null);
    setValidationSuccess(null);
    try {
      // Biblioteca de assinatura carregada só quando necessária (não pesa no app)
      const { assinarPdfComA1, lerCertificadoA1, bytesParaBase64 } = await import('../services/assinaturaA1');
      const pfxBytes = await arquivoPfx.arrayBuffer();

      // Lê o certificado ANTES de gerar o PDF, para o selo já sair com titular, CPF e AC.
      // (Depois de assinado, o conteúdo visível não pode mudar sem invalidar a assinatura.)
      const cert = lerCertificadoA1(pfxBytes, senhaPfx);
      const cpfLimpo = (cert.cpf || userProfile?.cpf || '').replace(/\D/g, '');
      const cpfMascarado = cpfLimpo.length === 11
        ? `***.${cpfLimpo.substring(3, 6)}.${cpfLimpo.substring(6, 9)}-**`
        : '***.***.***-**';

      // Gera (ou regera) o PDF final com o selo de assinado e grava o hash dele na receita, sem baixar
      const preparado = await handleBaixarParaAssinar({
        baixar: false,
        assinaturaPrevista: {
          em: new Date().toISOString(),
          titular: cert.titular,
          cpfMascarado,
          emissorAC: cert.emissor,
        },
      });
      if (!preparado) return;

      const { pdfAssinado } = await assinarPdfComA1(preparado.pdfBytes, pfxBytes, senhaPfx, {
        cpfEsperado: userProfile?.cpf,
        motivo: 'Receita veterinária',
        local: clinicConfig?.address?.cidade ? `${clinicConfig.address.cidade}${clinicConfig.address.estado ? '/' + clinicConfig.address.estado : ''}` : 'Brasil',
      });
      setSenhaPfx('');

      const validarPdfAssinadoFn = httpsCallable<
        { tenantId: string; receitaId: string; pdfBase64: string },
        { success: boolean; assinatura: any; pdfUrl: string }
      >(functions, 'validarPdfAssinado');

      const rec = preparado.receitaSalva;
      const response = await validarPdfAssinadoFn({
        tenantId: rec.tenantId || tenantId,
        receitaId: rec.id,
        pdfBase64: bytesParaBase64(pdfAssinado),
      });

      if (response.data.success) {
        setValidationSuccess('Receita assinada com o seu certificado A1 e validada com sucesso!');
        const updatedRec: ReceitaDigital = {
          ...rec,
          status: 'assinada',
          assinatura: response.data.assinatura,
          pdfAssinadoUrl: response.data.pdfUrl,
          assinadoEm: response.data.assinatura.em,
          atualizadoEm: new Date().toISOString(),
        };
        setReceita(updatedRec);
        if (onSaved) onSaved(updatedRec);

        // Baixa a via assinada com o nome do pet e do tutor
        const blobAss = new Blob([pdfAssinado as BlobPart], { type: 'application/pdf' });
        const urlAss = URL.createObjectURL(blobAss);
        const link = document.createElement('a');
        link.href = urlAss;
        link.download = getReceitaFileName(rec.pacienteNome || pacienteNome || 'Paciente', rec.criadoEm || new Date(), true, rec.tutorNome || tutorNome);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(urlAss), 5000);
      }
    } catch (err: any) {
      console.error('Erro na assinatura com A1:', err);
      let msg = err?.message || 'Falha ao assinar com o certificado.';
      msg = msg.replace(/^[a-z0-9_-]+:\s*/i, '');
      setValidationError(msg);
    } finally {
      setIsAssinandoA1(false);
    }
  };

  // ── AÇÃO 2: VALIDAR PDF ASSINADO ───────────────────────────────────────────
  const handleUploadAndValidate = async () => {
    if (!selectedSignedFile) {
      alert('Selecione o arquivo PDF assinado para validação.');
      return;
    }
    if (!receita) {
      alert('Receita não inicializada.');
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setValidationSuccess(null);

    try {
      // Ler arquivo assinado em Base64
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1] || res;
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Erro na leitura do arquivo local.'));
      });
      reader.readAsDataURL(selectedSignedFile);
      const pdfBase64 = await fileDataPromise;

      // Chamar Cloud Function callable 'validarPdfAssinado'
      const validarPdfAssinadoFn = httpsCallable<
        { tenantId: string; receitaId: string; pdfBase64: string },
        { success: boolean; assinatura: any; pdfUrl: string }
      >(functions, 'validarPdfAssinado');

      const response = await validarPdfAssinadoFn({
        tenantId: receita.tenantId || tenantId,
        receitaId: receita.id,
        pdfBase64,
      });

      if (response.data.success) {
        setValidationSuccess('Receita validada e assinada com sucesso com certificado ICP-Brasil!');
        const updatedRec: ReceitaDigital = {
          ...receita,
          status: 'assinada',
          assinatura: response.data.assinatura,
          pdfAssinadoUrl: response.data.pdfUrl,
          assinadoEm: response.data.assinatura.em,
          atualizadoEm: new Date().toISOString(),
        };
        setReceita(updatedRec);
        if (onSaved) onSaved(updatedRec);
      }
    } catch (err: any) {
      console.error('Erro na validação do PDF assinado:', err);
      let msg = err.message || 'Falha na validação do arquivo assinado.';
      msg = msg.replace(/^[a-z0-9_-]+:\s*/i, '');
      setValidationError(msg);
    } finally {
      setIsValidating(false);
    }
  };

  // ── AÇÃO 3: SUBSTITUIR RECEITA ────────────────────────────────────────────
  const handleSubstituirReceita = async () => {
    if (!receita) return;
    const confirm = window.confirm(
      'Uma receita assinada não pode ser editada. Deseja criar uma nova versão corrigida em rascunho? (Esta receita atual ficará permanentemente marcada como substituída).'
    );
    if (!confirm) return;

    try {
      const nova = await substituirReceita(receita.id, {
        conteudoPrescricao: conteudo,
        tipo,
        subtipo,
        itens,
        orientacoes: orientacoesTexto.split('\n').filter(Boolean),
        observacoesResponsavel,
        isControlado,
        numeroNotificacaoSipeagro,
      });
      setReceita(nova);
      setSelectedSignedFile(null);
      setValidationError(null);
      setValidationSuccess('Nova versão gerada em rascunho. Você pode editar os medicamentos e assinar novamente.');
      if (onSaved) onSaved(nova);
    } catch (err: any) {
      alert('Erro ao substituir receita: ' + err.message);
    }
  };

  // ── AÇÃO 4: CANCELAR RECEITA ──────────────────────────────────────────────
  const handleCancelarReceita = async () => {
    if (!receita) return;
    const motivo = window.prompt('Informe o motivo do cancelamento desta receita:');
    if (!motivo || !motivo.trim()) return;

    setIsCanceling(true);
    try {
      try {
        const cancelarFn = httpsCallable<any, any>(functions, 'cancelarReceita');
        await cancelarFn({
          tenantId: receita.tenantId || tenantId,
          receitaId: receita.id,
          motivo: motivo.trim(),
        });
      } catch (cloudErr) {
        // Fallback local se callable offline
        await cancelarReceitaService(receita.id, motivo.trim(), userProfile?.uid || 'user');
      }

      const canceledRec: ReceitaDigital = {
        ...receita,
        status: 'cancelada',
        statusDispensacao: 'cancelada',
        motivoCancelamento: motivo.trim(),
        canceladoEm: new Date().toISOString(),
      };
      setReceita(canceledRec);
      if (onSaved) onSaved(canceledRec);
      alert('Receita cancelada com sucesso.');
    } catch (err: any) {
      alert('Erro ao cancelar receita: ' + err.message);
    } finally {
      setIsCanceling(false);
    }
  };

  // URLs
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://monitorbea.web.app';
  const publicFarmaciaUrl = receita?.tokenDispensacao
    ? `${origin}/farmacia/d/${receita.tokenDispensacao}`
    : '';

  const handleCopyToken = () => {
    if (!receita?.tokenDispensacao) return;
    navigator.clipboard.writeText(receita.tokenDispensacao);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 3000);
  };

  const handleCopyPublicLink = () => {
    if (!publicFarmaciaUrl) return;
    navigator.clipboard.writeText(publicFarmaciaUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSendWhatsApp = () => {
    if (!receita) return;
    const petNome = receita.pacienteNome || pacienteNome || 'seu pet';
    const vetNome = receita.veterinarioNome || resolvedVetNome;
    const token = receita.tokenDispensacao || '';
    const link = publicFarmaciaUrl || `${origin}/farmacia`;

    const msg = `Olá, ${receita.tutorNome || 'Tutor'}! Segue a receita médico-veterinária de ${petNome}, emitida e assinada digitalmente com certificado ICP-Brasil pelo(a) Dr(a). ${vetNome}.\n\nApresente o arquivo PDF baixado ou o link oficial na farmácia: ${link}\n\nFarmacêutico: consulte a autenticidade e dispense através do TOKEN: ${token}`;

    const cleanPhone = (receita.tutorTelefone || tutorTelefone || '').replace(/\D/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-teal-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800 text-base md:text-lg">
                  Receituário Médico-Veterinário Digital
                </h2>
                {receita?.versao && receita.versao > 1 && (
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                    v{receita.versao}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Paciente: <strong>{pacienteNome || receita?.pacienteNome || 'Paciente'}</strong>
                {(tutorNome || receita?.tutorNome) && ` • Tutor: ${tutorNome || receita?.tutorNome}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badges */}
            {currentStatus === 'rascunho' && (
              <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
                Rascunho
              </span>
            )}
            {currentStatus === 'aguardando_assinatura' && (
              <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Aguardando Assinatura ICP
              </span>
            )}
            {currentStatus === 'assinada' && (
              <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Assinada ICP-Brasil
              </span>
            )}
            {currentStatus === 'substituida' && (
              <span className="text-xs font-bold px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg border border-orange-200">
                Substituída
              </span>
            )}
            {currentStatus === 'cancelada' && (
              <span className="text-xs font-bold px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-center gap-1">
                <Ban className="w-3.5 h-3.5" /> Cancelada
              </span>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
          {/* Mensagens de Alerta / Validação */}
          {validationError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Falha na Validação da Assinatura:</p>
                <p className="mt-0.5">{validationError}</p>
              </div>
            </div>
          )}

          {validationSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-xs animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-950">Sucesso!</p>
                <p className="mt-0.5">{validationSuccess}</p>
              </div>
            </div>
          )}

          {/* Aviso MAPA se necessário */}
          {showMapaWarning && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Aviso MAPA:</strong> Preencha seu cadastro MAPA/SIPEAGRO em Meu perfil para emitir receitas de controle especial em conformidade sanitária.
              </span>
            </div>
          )}

          {/* Token de Dispensação e Status (se já gerado) */}
          {receita?.tokenDispensacao && (
            <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider block">
                  Token de Dispensação em Farmácia
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-teal-950 bg-white px-2.5 py-1 rounded-lg border border-teal-300">
                    {receita.tokenDispensacao}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="p-1.5 text-teal-700 hover:text-teal-900 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
                    title="Copiar Token"
                  >
                    {copiedToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-teal-700">
                  Válida até: <strong>{receita.validadeAte || '—'}</strong> ({receita.validadeDias || 30} dias)
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-1.5">
                <span className="text-[10px] text-teal-800 uppercase font-bold">Status na Farmácia:</span>
                <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                  receita.statusDispensacao === 'dispensada'
                    ? 'bg-slate-200 text-slate-800'
                    : receita.statusDispensacao === 'parcialmente_dispensada'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-emerald-100 text-emerald-900'
                }`}>
                  {receita.statusDispensacao === 'dispensada'
                    ? 'Totalmente Dispensada'
                    : receita.statusDispensacao === 'parcialmente_dispensada'
                    ? 'Parcialmente Dispensada'
                    : 'Não Dispensada (Saldo Disponível)'}
                </span>
              </div>
            </div>
          )}

          {/* Seção 1: Seleção do Subtipo de Receita */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              1. Subtipo e Finalidade do Receituário
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  id: 'simples' as SubtipoReceita,
                  title: 'Receita Simples',
                  desc: 'Medicamentos de rotina (validade 30 dias).',
                },
                {
                  id: 'controle_especial' as SubtipoReceita,
                  title: 'Controle Especial',
                  desc: 'Portaria 344/MAPA (validade 30 dias).',
                },
                {
                  id: 'antimicrobiano' as SubtipoReceita,
                  title: 'Antimicrobiano',
                  desc: 'Antibióticos veterinários (validade 10 dias).',
                },
                {
                  id: 'magistral' as SubtipoReceita,
                  title: 'Magistral',
                  desc: 'Fórmulas manipuladas (validade 30 dias).',
                },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    setSubtipo(opt.id);
                    if (opt.id === 'magistral') {
                      setTipo('receita_manipulada');
                      if (!conteudo || conteudo === TEMPLATE_SIMPLES) setConteudo(TEMPLATE_MANIPULADO);
                    } else {
                      setTipo('receita_simples');
                      if (!conteudo || conteudo === TEMPLATE_MANIPULADO) setConteudo(TEMPLATE_SIMPLES);
                    }
                    if (opt.id === 'controle_especial') {
                      setIsControlado(true);
                    }
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    subtipo === opt.id
                      ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  } ${isLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <p className={`text-xs font-bold ${subtipo === opt.id ? 'text-teal-900' : 'text-slate-800'}`}>
                    {opt.title}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Seção 2: Notificação SIPEAGRO / MAPA */}
          {(subtipo === 'controle_especial' || isControlado) && (
            <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileBadge className="w-4 h-4 text-indigo-700" />
                  <div>
                    <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                      Controle Especial / SIPEAGRO
                    </span>
                    <p className="text-[11px] text-indigo-700">
                      Regulamentado pela IN MAPA nº 35/2017 e Portaria SVS/MS 344/98.
                    </p>
                  </div>
                </div>
              </div>

              {subtipo === 'simples' || subtipo === 'controle_especial' ? (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Aviso Regulatório CFMV/MAPA:</strong> Notificação de Receita para industrializados controlados deve ser emitida e numerada no <strong>SIPEAGRO</strong>. Registre o número da notificação abaixo para vinculação.
                  </div>
                </div>
              ) : null}

              <div>
                <label className="text-[11px] font-bold text-indigo-900 uppercase block mb-1">
                  Número da Notificação SIPEAGRO / MAPA {subtipo === 'controle_especial' ? '*' : '(Opcional)'}
                </label>
                <input autoComplete="off"
                  type="text"
                  disabled={isLocked}
                  value={numeroNotificacaoSipeagro}
                  onChange={e => setNumeroNotificacaoSipeagro(e.target.value)}
                  placeholder="Ex: SP-2026-0098412-VET"
                  className="w-full bg-white border border-indigo-300 rounded-xl py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>
          )}

          {/* Seção 3: Itens da Prescrição Estruturados */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-teal-600" />
                <span>2. Medicamentos Prescritos</span>
              </label>
              {!isLocked && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Medicamento</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {itens.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">Item {idx + 1}</span>
                    {!isLocked && itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Remover Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <div className="sm:col-span-2">
                      <input autoComplete="off"
                        type="text"
                        disabled={isLocked}
                        placeholder="Nome do produto ou fórmula *"
                        value={it.produto}
                        onChange={e => handleUpdateItem(idx, { produto: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <input autoComplete="off"
                        type="text"
                        disabled={isLocked}
                        placeholder="Concentração (ex: 500mg)"
                        value={it.concentracao || ''}
                        onChange={e => handleUpdateItem(idx, { concentracao: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-100"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input autoComplete="off"
                        type="number"
                        min={1}
                        disabled={isLocked}
                        placeholder="Qtd"
                        value={it.quantidadePrescrita}
                        onChange={e => handleUpdateItem(idx, { quantidadePrescrita: Number(e.target.value) || 1 })}
                        className="w-16 px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold text-center focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-100"
                      />
                      <input autoComplete="off"
                        type="text"
                        disabled={isLocked}
                        placeholder="Unidade"
                        value={it.unidade || 'unidade(s)'}
                        onChange={e => handleUpdateItem(idx, { unidade: e.target.value })}
                        className="w-full px-2 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <input autoComplete="off"
                      type="text"
                      disabled={isLocked}
                      name="quantidade-extenso" placeholder="Quantidade por extenso (ex: 1 (uma) caixa com 10 comprimidos)"
                      value={it.quantidadeExtenso || ''}
                      onChange={e => handleUpdateItem(idx, { quantidadeExtenso: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      disabled={isLocked}
                      placeholder="Posologia e modo de uso (ex: Administrar 1 comprimido pela via oral de 12 em 12 horas durante 7 dias)..."
                      value={it.posologia}
                      onChange={e => handleUpdateItem(idx, { posologia: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seção 4: Orientações Gerais & Observações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Orientações ao Tutor (1 por linha)
              </label>
              <textarea
                rows={3}
                disabled={isLocked}
                value={orientacoesTexto}
                onChange={e => setOrientacoesTexto(e.target.value)}
                placeholder="Orientações e cuidados gerais..."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 disabled:opacity-75"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Observações ao Responsável Legal
              </label>
              <textarea
                rows={3}
                disabled={isLocked}
                value={observacoesResponsavel}
                onChange={e => setObservacoesResponsavel(e.target.value)}
                placeholder="Observações complementares ou restrições..."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 disabled:opacity-75"
              />
            </div>
          </div>

          {/* Seção 4-B: ASSINAR COM CERTIFICADO A1 (arquivo .pfx) NO NAVEGADOR */}
          {(currentStatus === 'rascunho' || currentStatus === 'aguardando_assinatura') && (
            <div className="rounded-2xl border-2 border-pink-300 bg-pink-50/50 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assinar agora com o certificado A1 (.pfx)</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    A assinatura é feita <strong>no seu computador</strong>: o arquivo do certificado e a senha não são enviados nem
                    guardados. O ClinicOS gera o PDF final, assina e valida em um passo só.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 items-center">
                <input autoComplete="off"
                  type="file"
                  accept=".pfx,.p12,application/x-pkcs12"
                  onChange={e => {
                    setArquivoPfx(e.target.files?.[0] || null);
                    setValidationError(null);
                  }}
                  className="text-xs file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-700 file:text-white hover:file:bg-teal-800 cursor-pointer text-slate-600"
                />
                <input
                  type="password"
                  name="senha-certificado-a1"
                  autoComplete="new-password"
                  data-lpignore="true"
                  placeholder="Senha do certificado"
                  value={senhaPfx}
                  onChange={e => setSenhaPfx(e.target.value)}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-teal-500/20"
                />
                <button
                  type="button"
                  disabled={!arquivoPfx || !senhaPfx || isAssinandoA1 || isGeneratingPdf}
                  onClick={handleAssinarComA1}
                  className="py-2.5 px-5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAssinandoA1 ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      Assinando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Assinar e validar
                    </>
                  )}
                </button>
              </div>
              {currentStatus === 'aguardando_assinatura' && (
                <p className="text-[11px] text-slate-500">
                  Atenção: assinar por aqui gera o PDF de novo. Um PDF baixado antes para assinar fora deixa de valer.
                </p>
              )}
            </div>
          )}

          {/* Seção 5: UPLOAD DO PDF ASSINADO (Aguardando Assinatura) */}
          {currentStatus === 'aguardando_assinatura' && (
            <div className="rounded-2xl border-2 border-dashed border-teal-500 bg-teal-50/40 p-5 space-y-4 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Passo 2: Assine fora e envie o PDF assinado
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Assine o arquivo no app ou portal do seu certificado (ex.: <strong>SafeID</strong> da Safeweb, BirdID, VIDaaS ou leitor de cartão/token) no formato <strong>PDF/PAdES</strong> e envie o arquivo assinado abaixo:
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <input autoComplete="off"
                  type="file"
                  accept="application/pdf"
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setSelectedSignedFile(file);
                    setValidationError(null);
                  }}
                  className="text-xs file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer text-slate-600"
                />

                <button
                  type="button"
                  disabled={!selectedSignedFile || isValidating}
                  onClick={handleUploadAndValidate}
                  className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  {isValidating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      Validando Assinatura...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Enviar PDF Assinado
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 border-t border-teal-200/60 flex items-center justify-between text-xs text-slate-500">
                <span>Perdeu o arquivo gerado?</span>
                <button
                  type="button"
                  onClick={() => handleBaixarParaAssinar()}
                  className="text-teal-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar novamente PDF original
                </button>
              </div>
            </div>
          )}

          {/* Seção 6: METADADOS DA ASSINATURA ICP-BRASIL & AÇÕES */}
          {currentStatus === 'assinada' && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Assinatura Eletrônica Qualificada ICP-Brasil
                </div>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  PAdES Conforme
                </span>
              </div>

              {receita?.assinatura && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-3.5 rounded-xl border border-emerald-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Titular do Certificado</span>
                    <strong className="text-slate-800">{receita.assinatura.titular}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">CPF do Titular</span>
                    <span className="font-mono text-slate-700">{receita.assinatura.cpfMascarado}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Autoridade Certificadora</span>
                    <span className="text-slate-700">{receita.assinatura.emissorAC}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Data/Hora da Assinatura</span>
                    <span className="text-slate-700">{new Date(receita.assinatura.em).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {receita?.pdfAssinadoUrl && (
                  <a
                    href={receita.pdfAssinadoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Baixar PDF Assinado
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  Enviar ao Tutor pelo WhatsApp
                </button>
              </div>

              {/* Link do Portal da Farmácia */}
              {publicFarmaciaUrl && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Link do Portal da Farmácia (Dispensação & Validação)
                    </span>
                    <a
                      href={publicFarmaciaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 font-mono text-[11px] truncate block hover:underline"
                    >
                      {publicFarmaciaUrl}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPublicLink}
                    className="p-2 text-slate-500 hover:text-teal-600 transition-colors shrink-0 cursor-pointer"
                    title="Copiar Link"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* Histórico de Dispensações */}
              {receita?.dispensacoes && receita.dispensacoes.length > 0 && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Dispensações Registradas em Farmácia ({receita.dispensacoes.length})
                  </span>
                  {receita.dispensacoes.map((disp, i) => (
                    <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-[11px]">
                      <div>
                        <strong>{disp.protocolo}</strong> • {disp.farmaciaNome} ({disp.farmaceuticoCrf})
                      </div>
                      <span className="text-slate-400">
                        {new Date((disp as any).dataHora || (disp as any).data || Date.now()).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Link para Validador ITI */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <span>Deseja atestar no Governo Federal?</span>
                <a
                  href="https://validar.iti.gov.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                >
                  <span>Conferir em validar.iti.gov.br</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Aviso sobre não usar assinatura gov.br */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
            <strong>Nota Legal:</strong> A legislação federal e a regulamentação do Conselho Federal de Medicina Veterinária (CFMV) para receitas eletrônicas e controle especial exigem <strong>Certificado Digital ICP-Brasil (Assinatura Eletrônica Qualificada)</strong>. Assinaturas do padrão gov.br são classificadas como avançadas e não substituem o certificado qualificado ICP-Brasil para a emissão deste receituário.
          </div>
        </div>

        {/* Rodapé de Ações do Modal */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            {currentStatus === 'assinada' && (
              <button
                type="button"
                onClick={handleSubstituirReceita}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Substituir Receita (Gerar Nova Versão)
              </button>
            )}

            {currentStatus !== 'cancelada' && receita?.id && (
              <button
                type="button"
                disabled={isCanceling}
                onClick={handleCancelarReceita}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 cursor-pointer ml-2"
              >
                <Ban className="w-3.5 h-3.5" />
                {isCanceling ? 'Cancelando...' : 'Cancelar Receita'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {currentStatus === 'rascunho' && (
              <button
                type="button"
                disabled={isGeneratingPdf || isControladoSemSipeagro}
                onClick={() => handleBaixarParaAssinar()}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isGeneratingPdf ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Baixar para Assinar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceitaDigitalModal;
