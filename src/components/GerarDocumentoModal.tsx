import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Lock, Edit3, FileSignature, ShieldCheck, FileBadge, Search, Pill, Printer, Calculator, FileCheck2 } from 'lucide-react';
import { saveTermoAtendimento, TermoAtendimento, TipoTermo, subscribeCatalogoExames, CatalogoExame, saveRequisicaoExame, RequisicaoExame, getClinicConfig, AppUser } from '../services/dataService';
import ReceitaDigitalModal from './ReceitaDigitalModal';

export type ExtendedTipoDoc = TipoTermo | 'receita_simples' | 'receita_manipulada' | 'requisicao_exames';

interface TutorInfo {
  nome?: string;
  cpf?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
}

interface GerarDocumentoModalProps {
  clientId: string;
  atendimentoId?: string;
  patientName?: string;
  tutorName?: string;
  tutorData?: TutorInfo;
  userProfile?: AppUser | null;
  patientWeight?: number; // peso em kg, para calculadora de fluidoterapia
  initialType?: ExtendedTipoDoc;
  initialClinicalContent?: string;
  mode?: 'termo' | 'receita' | 'all';
  onClose: () => void;
  onDocumentGenerated?: (termo: TermoAtendimento) => void;
}

const documentTemplates: { 
  id: ExtendedTipoDoc; 
  label: string; 
  category: string;
  legalClause: string;
  defaultClinicalContent: string;
}[] = [
  { 
    id: 'tcle_geral', 
    label: 'TCLE - Anestesia e Cirurgia Geral', 
    category: 'Cirurgia',
    legalClause: 'CLÁUSULA DE CIÊNCIA E PROTEÇÃO LEGAL: Em conformidade com o Código de Ética do Médico Veterinário (Resolução CFMV nº 1138/2016). O responsável declara ter sido devidamente orientado sobre os riscos cirúrgicos e anestésicos inerentes ao procedimento, concordando com as medidas profiláticas adotadas.',
    defaultClinicalContent: 'Procedimento cirúrgico programado sob protocolo anestésico inalatório/injetável monitorado. Condutas prévias de jejum alimentar e hídrico confirmadas pelo responsável.'
  },
  { 
    id: 'tcle_sedacao', 
    label: 'TCLE - Sedação (Procedimentos Menores)', 
    category: 'Cirurgia',
    legalClause: 'CLÁUSULA DE CIÊNCIA E AUTORIZAÇÃO DE SEDAÇÃO: O tutor declara-se expressamente informado sobre a indicação, os efeitos sedativos, possíveis reações idiossincráticas e necessidade de observação pós-sedação conforme boas práticas da Medicina Veterinária.',
    defaultClinicalContent: 'Sedação e contenção química para realização de procedimento ambulatorial/curativo/exame de imagem com monitoramento de parâmetros cardiorrespiratórios.'
  },
  { 
    id: 'tcle_procedimento', 
    label: 'TCLE - Procedimentos Específicos', 
    category: 'Cirurgia',
    legalClause: 'TERMO DE ESCLARECIMENTO E CONSENTIMENTO: Autorização formal para realização dos atos médicos veterinários descritos, isentando a equipe de riscos estatísticos imprevisíveis devidamente informados.',
    defaultClinicalContent: 'Procedimento ambulatorial indicado para tratamento da afecção diagnosticada, incluindo anestesia local e analgesia multimodal.'
  },
  { 
    id: 'lgpd_domiciliar', 
    label: 'Termo de Consentimento - LGPD e Domiciliar', 
    category: 'Domiciliar',
    legalClause: 'PROTEÇÃO DE DADOS (LEI 13.709/2018): Os dados cadastrais e o prontuário do animal destinam-se exclusivamente à continuidade assistencial e cumprimento de dever legal médico-veterinário.',
    defaultClinicalContent: 'Autorização para atendimento em domicílio com acesso às instalações residenciais necessárias para o manejo seguro do paciente e guarda de dados no sistema ClinicOS.'
  },
  { 
    id: 'autorizacao_imagem', 
    label: 'Termo de Autorização de Uso de Imagem', 
    category: 'Geral',
    legalClause: 'CESSÃO DE DIREITO DE IMAGEM: Autorização voluntária de registro fotográfico/audiovisual com finalidade estritamente técnico-científica, acadêmica ou educativa, preservando o anonimato do tutor.',
    defaultClinicalContent: 'Registro de evolução de lesão/caso clínico para arquivo médico e acompanhamento da resposta terapêutica.'
  },
  { 
    id: 'off_label', 
    label: 'Termo de Ciência - Prescrição Off-Label', 
    category: 'Clínica',
    legalClause: 'RESPONSABILIDADE TÉCNICA E USO OFF-LABEL: Ciência do tutor sobre a indicação terapêutica de substância ativa não especificada em bula para a espécie em questão, fundamentada em literatura veterinária e benefício clínico pretendido.',
    defaultClinicalContent: 'Prescrição fundamentada de fármaco com posologia ajustada à literatura científica veterinária atualizada, visando resposta clínica indispensável.'
  },
  { 
    id: 'recusa_conduta', 
    label: 'Termo de Recusa de Conduta Recomendada', 
    category: 'Clínica',
    legalClause: 'DECLARAÇÃO DE RECUSA E ADVERTÊNCIA MÉDICA: O tutor assume total responsabilidade pela recusa de realização de exame, internação ou terapêutica prescrita pelo profissional veterinário.',
    defaultClinicalContent: 'O responsável optou pela não realização dos exames complementares/internação indicados nesta data, ciente de todos os prognósticos e riscos de agravamento explicados verbalmente.'
  },
  { 
    id: 'destinacao_cadaver', 
    label: 'Termo de Destinação de Cadáver', 
    category: 'Geral',
    legalClause: 'CONFORMIDADE SANITÁRIA E AMBIENTAL: Declaração de opção do destino dos restos mortais do animal em acordo com as normas sanitárias e ambientais do município/estado.',
    defaultClinicalContent: 'Opção de destinação do corpo do animal por cremação/sepultamento em cemitério licenciado/recolhimento especializado.'
  },
  { 
    id: 'receita_simples', 
    label: 'Receituário Clínico Simples', 
    category: 'Receita',
    legalClause: 'RECEITUÁRIO MÉDICO-VETERINÁRIO: Válido em todo o território nacional. Em caso de dúvidas sobre a posologia ou reações adversas, contate imediatamente a clínica.',
    defaultClinicalContent: `USO ORAL:\n1) Fármaco / Princípio Ativo ________ - Frasco ou Comprimidos\n   Administrar __ mg por via oral a cada __ horas durante __ dias.\n\n2) Protetor ou Suporte ________\n   Administrar __ mL a cada __ horas durante __ dias.`
  },
  { 
    id: 'receita_manipulada', 
    label: 'Receituário Magistral (Manipulação Veterinária)', 
    category: 'Receita',
    legalClause: 'FORMULAÇÃO MAGISTRAL VETERINÁRIA: Medicamento para manipulação em farmácia com registro no MAPA. Uso exclusivo em medicina veterinária para o paciente identificado.',
    defaultClinicalContent: `FÓRMULA MANIPULADA:\nPrincípio Ativo: ________ ______ mg\nVeículo / Sabor: Pasta oral palatável sabor frango/carne q.s.p. __ doses\nPosologia: Administrar 1 dose pela via oral a cada 24 horas por 30 dias consecutivos.`
  },
  { 
    id: 'requisicao_exames', 
    label: 'Requisição de Exames', 
    category: 'Exames',
    legalClause: 'REQUISIÇÃO MÉDICO-VETERINÁRIA: Documento para solicitação de exames complementares (laboratoriais, imagem, etc). Válido como pedido oficial para laboratórios veterinários parceiros ou externos.',
    defaultClinicalContent: 'Solicito a realização dos exames assinalados abaixo para o paciente supracitado. Histórico Clínico / Suspeita:\n\n'
  }
];

const GerarDocumentoModal: React.FC<GerarDocumentoModalProps> = ({ 
  clientId, 
  atendimentoId,
  patientName, 
  tutorName,
  tutorData,
  userProfile,
  patientWeight,
  initialType,
  initialClinicalContent,
  mode,
  onClose,
  onDocumentGenerated
}) => {
  const activeMode = useMemo(() => {
    if (mode) return mode;
    if (initialType === 'receita_simples' || initialType === 'receita_manipulada') {
      return 'receita';
    }
    return 'termo';
  }, [mode, initialType]);

  const availableTemplates = useMemo(() => {
    if (activeMode === 'receita') {
      return documentTemplates.filter(d => d.category === 'Receita');
    }
    if (activeMode === 'termo') {
      return documentTemplates.filter(d => d.category !== 'Receita');
    }
    return documentTemplates;
  }, [activeMode]);

  const [selectedType, setSelectedType] = useState<ExtendedTipoDoc>(() => {
    if (initialType && availableTemplates.some(t => t.id === initialType)) {
      return initialType;
    }
    return availableTemplates[0]?.id || 'tcle_geral';
  });

  const [clinicalContent, setClinicalContent] = useState(() => {
    if (initialClinicalContent) return initialClinicalContent;
    const tmpl = availableTemplates.find(d => d.id === selectedType) || availableTemplates[0];
    return tmpl ? tmpl.defaultClinicalContent : documentTemplates[0].defaultClinicalContent;
  });

  // Notificação SIPEAGRO e Medicamento Controlado
  const isReceita = selectedType === 'receita_simples' || selectedType === 'receita_manipulada';
  const [isControlado, setIsControlado] = useState(false);
  const [numeroNotificacaoSipeagro, setNumeroNotificacaoSipeagro] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [showDigitalModal, setShowDigitalModal] = useState(false);
  
  const currentTemplate = documentTemplates.find(d => d.id === selectedType) || documentTemplates[0];

  const [catalogoExames, setCatalogoExames] = useState<CatalogoExame[]>([]);
  const [selectedExamesIds, setSelectedExamesIds] = useState<string[]>([]);
  const [buscaExame, setBuscaExame] = useState('');
  const [clinicLogo, setClinicLogo] = useState<string>('');
  const [clinicConfig, setClinicConfig] = useState<{ name: string; phone: string; cnpj: string; address: { logradouro: string; numero: string; cidade: string; estado: string } } | null>(null);
  // Calculadora de Fluidoterapia
  const [fluidPeso, setFluidPeso] = useState<string>(patientWeight ? String(patientWeight) : '');
  const [fluidDeseq, setFluidDeseq] = useState<string>('0'); // % desidratação
  const [showFluidCalc, setShowFluidCalc] = useState(false);

  const fluidCalc = useMemo(() => {
    const kg = parseFloat(fluidPeso);
    if (!kg || kg <= 0) return null;
    const deseq = parseFloat(fluidDeseq) || 0;
    const manutMin = Math.round(kg * 40);
    const manutMax = Math.round(kg * 60);
    const spotMin = Math.round(kg * 10);
    const spotMax = Math.round(kg * 15);
    const deficit = deseq > 0 ? Math.round(kg * deseq * 10) : 0;
    const bid = Math.round((manutMin + deficit) / 2);
    const tid = Math.round((manutMin + deficit) / 3);
    return { kg, manutMin, manutMax, spotMin, spotMax, deficit, bid, tid };
  }, [fluidPeso, fluidDeseq]);

  const hasFluidoterpia = useMemo(() =>
    /fluidotera/i.test(clinicalContent),
  [clinicalContent]);

  const insertFluidCalc = () => {
    if (!fluidCalc) return;
    const { kg, manutMin, manutMax, spotMin, spotMax, deficit, bid, tid } = fluidCalc;
    const lines = [
      `── CÁLCULO DE FLUIDOTERAPIA SUBCUTÂNEA (${kg} kg) ──`,
      `Manutenção: ${manutMin}–${manutMax} mL/dia (40–60 mL/kg/dia)`,
      `  BID (12/12h): ~${bid} mL/aplicação`,
      `  TID (8/8h):   ~${tid} mL/aplicação`,
      `Limite por ponto: ${spotMin}–${spotMax} mL (10–15 mL/kg)`,
      ...(deficit > 0 ? [`Déficit (${fluidDeseq}% desidrat.): ${deficit} mL + manutenção`] : []),
      `Fracionar em 2–4 pontos no subcutâneo dorsal.`,
    ].join('\n');
    if (!clinicalContent.includes('CÁLCULO DE FLUIDOTERAPIA SUBCUTÂNEA')) {
      setClinicalContent(prev => prev.replace('[volume a calcular]', '').trim() + '\n\n' + lines);
    }
  };
  
  // Auto-inserir o cálculo na inicialização se houver fluidoterapia e peso
  useEffect(() => {
    if (hasFluidoterpia && fluidCalc && !clinicalContent.includes('CÁLCULO DE FLUIDOTERAPIA SUBCUTÂNEA')) {
      insertFluidCalc();
    }
  }, [hasFluidoterpia, fluidCalc]);

  const isRequisicaoExames = selectedType === 'requisicao_exames';
  
  // Carrega logo e dados da clínica
  useEffect(() => {
    const cachedLogo = localStorage.getItem('clinicos_clinic_logo');
    if (cachedLogo) setClinicLogo(cachedLogo);
    getClinicConfig().then(cfg => {
      if (cfg) {
        setClinicConfig(cfg as any);
        if (cfg.logoUrl) setClinicLogo(cfg.logoUrl);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isRequisicaoExames && catalogoExames.length === 0) {
      const unsub = subscribeCatalogoExames(setCatalogoExames);
      return () => unsub();
    }
  }, [isRequisicaoExames, catalogoExames.length]);
  
  
  const examesFiltrados = useMemo(() => {
    return catalogoExames.filter(e => 
      e.nome.toLowerCase().includes(buscaExame.toLowerCase()) ||
      e.categoria.toLowerCase().includes(buscaExame.toLowerCase())
    );
  }, [catalogoExames, buscaExame]);
  
  const toggleExame = (id: string) => {
    setSelectedExamesIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectType = (typeId: ExtendedTipoDoc) => {
    const currentTmpl = documentTemplates.find(d => d.id === selectedType);
    const newTmpl = documentTemplates.find(d => d.id === typeId);
    
    setSelectedType(typeId);
    
    if (newTmpl) {
      if (!clinicalContent || (currentTmpl && clinicalContent === currentTmpl.defaultClinicalContent)) {
        setClinicalContent(newTmpl.defaultClinicalContent);
      }
    }
  };

  const handleGenerate = async () => {
    if (isReceita && isControlado && !numeroNotificacaoSipeagro.trim()) {
      alert('Campo Obrigatório: Para receitas de medicamentos controlados, informe o número da Notificação SIPEAGRO / MAPA.');
      return;
    }

    setIsGenerating(true);
    try {
      let finalContent = clinicalContent;
      if (isReceita && isControlado && numeroNotificacaoSipeagro.trim()) {
        finalContent += `\n\n[NOTIFICAÇÃO DE RECEITA SIPEAGRO/MAPA Nº: ${numeroNotificacaoSipeagro.trim()}]`;
      }

      if (isRequisicaoExames) {
        if (selectedExamesIds.length === 0) {
          alert('Selecione pelo menos um exame para a requisição.');
          setIsGenerating(false);
          return;
        }
        
        const selectedExames = catalogoExames
          .filter(e => selectedExamesIds.includes(e.id!))
          .map(e => ({ categoria: e.categoria, nome: e.nome }));

        const req: any = {
          id: `req_exame_${Date.now()}`,
          pacienteId: clientId,
          examesSelecionados: selectedExames,
          tipo: 'requisicao_exames',
          indicacaoClinica: finalContent,
          criadoEm: new Date().toISOString(),
          criadoPor: 'Médico(a) Veterinário(a)',
          pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
        };
        if (atendimentoId) req.atendimentoId = atendimentoId;
        
        await saveRequisicaoExame(req as RequisicaoExame);
        if (onDocumentGenerated) {
          onDocumentGenerated(req as any);
        }
      } else {
        const termo: any = {
          id: `termo_${Date.now()}`,
          pacienteId: clientId,
          tipo: selectedType as TipoTermo,
          status: 'pendente',
          baseLegal: currentTemplate.legalClause,
          conteudoClinico: finalContent,
          geradoEm: new Date().toISOString(),
          geradoPor: 'Médico(a) Veterinário(a)',
          pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
        };
        
        if (atendimentoId) termo.atendimentoId = atendimentoId;
        if (isControlado) termo.numeroNotificacaoSipeagro = numeroNotificacaoSipeagro.trim();
        if (isControlado) termo.isControlado = true;
        
        await saveTermoAtendimento(termo as TermoAtendimento);
        if (onDocumentGenerated) {
          onDocumentGenerated(termo as TermoAtendimento);
        }
      }
      
      setIsGenerating(false);
      setIsDone(true);
    } catch (err) {
      console.error('Erro ao gerar documento', err);
      setIsGenerating(false);
      alert('Erro ao salvar o documento. Verifique a conexão e tente novamente.');
    }
  };

  const handlePrint = () => {
    const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const tipoLabel = documentTemplates.find(d => d.id === selectedType)?.label || selectedType;
    const nomeMedico = userProfile?.nome || 'Médico(a) Veterinário(a)';
    const localCrmv = typeof window !== 'undefined' ? localStorage.getItem('clinicos_crmv') : '';
    const resolvedCrmv = userProfile?.crmv || localCrmv || '';
    const crmvMedico = resolvedCrmv ? `CRMV: ${resolvedCrmv}` : '';
    const emailMedico = userProfile?.email || '';
    // Modo domícilio: sem clínica cadastrada → usa dados do próprio veterinário
    const temClinica = !!(clinicConfig?.name);
    const nomeExibidoCabecalho = temClinica ? clinicConfig!.name : nomeMedico;
    const telefoneClinica = clinicConfig?.phone || '';
    const cnpjClinica = temClinica ? (clinicConfig?.cnpj || '') : '';
    const enderecoClinica = temClinica && clinicConfig?.address
      ? `${clinicConfig.address.logradouro}, ${clinicConfig.address.numero} — ${clinicConfig.address.cidade}/${clinicConfig.address.estado}`
      : '';
    // Se tem foto de perfil e não há logo de clínica, usa a foto do vet
    const logoSrc = clinicLogo || (userProfile?.photoURL && !temClinica ? userProfile.photoURL : '');
    const logoHtml = logoSrc
      ? `<img src="${logoSrc}" alt="Logo" style="max-height:60px;max-width:180px;object-fit:contain;border-radius:${temClinica ? '4' : '50'}%;" />`
      : `<div style="font-size:16pt;font-weight:700;color:#0f172a;">${nomeExibidoCabecalho}</div>`;
    const subHeaderHtml = temClinica
      ? `${nomeExibidoCabecalho}${cnpjClinica ? ` &nbsp;|&nbsp; CNPJ: ${cnpjClinica}` : ''}<br>
         ${enderecoClinica ? enderecoClinica + '<br>' : ''}
         ${telefoneClinica ? 'Tel: ' + telefoneClinica : ''}`
      : `Veterinário(a) Autônomo(a) • Atendimento a Domicílio<br>
         ${crmvMedico}${emailMedico ? (crmvMedico ? ' &nbsp;|&nbsp; ' : '') + emailMedico : ''}`;
    const nomeTutor = tutorData?.nome || tutorName || '—';
    const cpfTutor = tutorData?.cpf || '';
    const telTutor = tutorData?.telefone || '';
    const endTutor = tutorData?.endereco || '';
    
    const printContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${tipoLabel} - ${patientName || 'Paciente'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', Arial, sans-serif; font-size: 11pt; color: #1e293b; background: white; padding: 18mm 20mm; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2.5px solid #0d9488; margin-bottom: 18px; }
    .clinic-info { display: flex; flex-direction: column; gap: 3px; }
    .clinic-sub { font-size: 8.5pt; color: #64748b; margin-top: 4px; line-height: 1.6; }
    .doc-badge { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 8px 14px; text-align: right; min-width: 190px; }
    .doc-badge-title { font-size: 8.5pt; font-weight: 700; color: #0d9488; text-transform: uppercase; letter-spacing: 0.05em; }
    .doc-badge-date { font-size: 8pt; color: #64748b; margin-top: 3px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
    .info-box-title { font-size: 7.5pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
    .info-field { font-size: 9.5pt; color: #334155; line-height: 1.7; }
    .info-field strong { font-weight: 600; color: #0f172a; }
    .section-title { font-size: 7.5pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; margin-top: 14px; }
    .legal-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 8.5pt; color: #475569; line-height: 1.5; margin-bottom: 10px; }
    .content-box { border: 1.5px solid #0d9488; border-radius: 8px; padding: 14px 16px; font-size: 10.5pt; line-height: 1.8; white-space: pre-wrap; color: #0f172a; min-height: 120px; }
    ${isControlado && numeroNotificacaoSipeagro ? '.sipeagro-box { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 8px 12px; font-size: 9pt; color: #3730a3; font-weight: 600; margin-bottom: 12px; }' : ''}
    .signature-area { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sig-block { text-align: center; }
    .sig-line { border-top: 1.5px solid #94a3b8; margin-bottom: 6px; }
    .sig-name { font-size: 9.5pt; font-weight: 600; color: #0f172a; }
    .sig-label { font-size: 8pt; color: #64748b; }
    .footer { margin-top: 22px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 7pt; color: #94a3b8; }
    @media print { body { padding: 12mm 15mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="clinic-info">
      ${logoHtml}
      <div class="clinic-sub">
        ${subHeaderHtml}
      </div>
    </div>
    <div class="doc-badge">
      <div class="doc-badge-title">${tipoLabel}</div>
      <div class="doc-badge-date">${dataAtual}</div>
    </div>
  </div>

  ${isControlado && numeroNotificacaoSipeagro ? `<div class="sipeagro-box">⚠ Medicamento Controlado — Notificação SIPEAGRO/MAPA Nº: ${numeroNotificacaoSipeagro}</div>` : ''}

  <div class="info-grid">
    <div class="info-box">
      <div class="info-box-title">Paciente / Animal</div>
      <div class="info-field"><strong>${patientName || '—'}</strong></div>
    </div>
    <div class="info-box">
      <div class="info-box-title">Tutor / Responsável</div>
      <div class="info-field"><strong>${nomeTutor}</strong></div>
      ${cpfTutor ? `<div class="info-field">CPF: ${cpfTutor}</div>` : ''}
      ${telTutor ? `<div class="info-field">Tel: ${telTutor}</div>` : ''}
      ${endTutor ? `<div class="info-field">${endTutor}</div>` : ''}
    </div>
  </div>

  <div class="section-title">Cláusula Legal (Regulatória)</div>
  <div class="legal-box">${currentTemplate.legalClause}</div>

  <div class="section-title">${activeMode === 'receita' ? 'Prescrição / Posologia' : 'Conteúdo Clínico'}</div>
  <div class="content-box">${clinicalContent.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>

  <div class="signature-area">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">${nomeMedico}</div>
      <div class="sig-label">${crmvMedico}${emailMedico ? (crmvMedico ? ' &nbsp;|&nbsp; ' : '') + emailMedico : ''}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">${nomeTutor !== '—' ? nomeTutor : 'Tutor / Responsável'}</div>
      <div class="sig-label">Tutor / Responsável pelo Animal${cpfTutor ? ' — CPF: ' + cpfTutor : ''}</div>
    </div>
  </div>

  <div class="footer">
    <span>Documento gerado por ClinicOS • ${new Date().toLocaleString('pt-BR')}</span>
    <span>ID: doc_${Date.now()}</span>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    if (iframe.contentWindow) {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(printContent);
      iframe.contentWindow.document.close();
      
      // The script tag in printContent will call window.print(). 
      // We just clean up the iframe after a minute.
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 60000);
    } else {
      const win = window.open('', '_blank', 'width=900,height=700');
      if (win) {
        win.document.write(printContent);
        win.document.close();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-teal-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700">
              {activeMode === 'receita' ? <Pill className="w-5 h-5" /> : <FileSignature className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base md:text-lg">
                {activeMode === 'receita' ? 'Prescrever Receita Médico-Veterinária' : 'Gerar Termo / Documento'}
              </h2>
              <p className="text-xs text-slate-500">
                Paciente: <strong>{patientName || 'Selecionado'}</strong> {tutorName ? `• Tutor: ${tutorName}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
          {isDone ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">
                {activeMode === 'receita' ? 'Receita Emitida com Sucesso!' : 'Documento Gerado com Sucesso!'}
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mb-6">
                O registro foi salvo no prontuário do paciente. Clique abaixo para imprimir ou salvar como PDF.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md shadow-teal-600/20 transition-all text-xs"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir / Salvar PDF
                </button>
                {isReceita && (
                  <button
                    onClick={() => setShowDigitalModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all text-xs"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    Assinar com Certificado ICP-Brasil
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Fechar sem imprimir
              </button>
            </div>
          ) : (
            <>
              {/* Seleção do Tipo de Documento / Receita */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  1. {activeMode === 'receita' ? 'Selecione o Tipo de Receituário' : 'Selecione o Modelo do Documento'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableTemplates.map(doc => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleSelectType(doc.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedType === doc.id
                          ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className={`text-xs font-bold truncate ${selectedType === doc.id ? 'text-teal-900' : 'text-slate-700'}`}>
                          {doc.label}
                        </p>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          {doc.category}
                        </span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        selectedType === doc.id ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300'
                      }`}>
                        {selectedType === doc.id && <Check className="w-2.5 h-2.5" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Seção Especial: Medicamentos Controlados / SIPEAGRO */}
              {isReceita && (
                <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileBadge className="w-4 h-4 text-indigo-700" />
                      <div>
                        <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                          Medicamento Controlado / Notificação SIPEAGRO
                        </span>
                        <p className="text-[11px] text-indigo-700">
                          Exigido pelo MAPA / Portaria 344 para fármacos sujeitos a controle especial.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsControlado(v => !v)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        isControlado ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                        isControlado ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {isControlado && (
                    <div className="pt-2 border-t border-indigo-200/60 space-y-2 animate-in fade-in duration-200">
                      {selectedType === 'receita_simples' ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
                          <strong>Medicamento controlado:</strong> emita a Notificação de Receita no SIPEAGRO e registre o número aqui.
                          <p className="text-[11px] text-amber-800/80 mt-1">
                            A Notificação de Receita Veterinária de produtos industrializados é emitida e numerada no sistema do MAPA (SIPEAGRO); o ClinicOS registra o número oficial para rastreabilidade no prontuário.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 text-xs text-indigo-900">
                          Receitas de manipulados (mesmo com substâncias controladas) podem ser emitidas e assinadas digitalmente no ClinicOS.
                        </div>
                      )}

                      <label className="text-[11px] font-bold text-indigo-900 uppercase block">
                        Número de Notificação SIPEAGRO / MAPA *
                      </label>
                      <input
                        type="text"
                        required
                        value={numeroNotificacaoSipeagro}
                        onChange={e => setNumeroNotificacaoSipeagro(e.target.value)}
                        placeholder="Ex: SP-2026-0098412-VET"
                        className="w-full bg-white border border-indigo-300 rounded-xl py-2.5 px-3.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                      />
                      <p className="text-[10px] text-indigo-600">
                        * Este número será inserido no cabeçalho regulatório da receita e vinculado ao registro digital.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cláusula Fixa / Disclaimer Protegido */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-1.5 text-slate-600">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Cláusula Legal & Disclaimer (Fixa / Protegida)
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-mono select-all bg-white p-2.5 rounded-xl border border-slate-200">
                  {currentTemplate.legalClause}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * Este texto é padronizado pelas normas éticas e regulatórias do CFMV e não pode ser adulterado.
                </span>
              </div>

              {/* Lista de Exames (Visível apenas para Requisição de Exames) */}
              {isRequisicaoExames && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-teal-600" />
                      Selecione os Exames
                    </label>
                    <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md">
                      {selectedExamesIds.length} selecionado(s)
                    </span>
                  </div>
                  <div className="relative mb-3">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nome ou categoria..."
                      value={buscaExame}
                      onChange={(e) => setBuscaExame(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                    {Object.entries(
                      examesFiltrados.reduce((acc, exame) => {
                        if (!acc[exame.categoria]) acc[exame.categoria] = [];
                        acc[exame.categoria].push(exame);
                        return acc;
                      }, {} as Record<string, CatalogoExame[]>)
                    ).map(([cat, exames]) => (
                      <div key={cat} className="mb-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b pb-1">{cat}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {exames.map(ex => {
                            const isSelected = selectedExamesIds.includes(ex.id);
                            return (
                              <button
                                key={ex.id}
                                type="button"
                                onClick={() => toggleExame(ex.id)}
                                className={`flex items-start text-left p-2 rounded-lg border text-sm transition-colors ${
                                  isSelected ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded border mt-0.5 flex-shrink-0 mr-2 flex items-center justify-center ${
                                  isSelected ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className={isSelected ? 'text-teal-900 font-medium' : 'text-slate-700'}>{ex.nome}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {examesFiltrados.length === 0 && (
                      <div className="text-center py-4 text-slate-500 text-sm">
                        Nenhum exame encontrado.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Conteúdo Clínico Editável */}
              <div>
                
                {hasFluidoterpia && (
                  <div className="mb-4 p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Calculator className="w-4 h-4" />
                        <h4 className="text-sm font-bold uppercase">Calculadora de Fluidoterapia Subcutânea</h4>
                      </div>
                      <button
                        onClick={() => setShowFluidCalc(!showFluidCalc)}
                        className="text-xs font-bold text-blue-600 underline"
                      >
                        {showFluidCalc ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    {showFluidCalc && (
                      <div className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-1">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Peso (kg)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={fluidPeso}
                              onChange={e => setFluidPeso(e.target.value)}
                              placeholder="Ex: 5.8"
                              className="w-full text-sm border-slate-200 rounded-lg p-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">% Desidratação</label>
                            <input
                              type="number"
                              step="1"
                              value={fluidDeseq}
                              onChange={e => setFluidDeseq(e.target.value)}
                              placeholder="0"
                              className="w-full text-sm border-slate-200 rounded-lg p-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                        
                        {fluidCalc && (
                          <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm text-xs text-slate-700 space-y-1">
                            <p><strong>Manutenção:</strong> {fluidCalc.manutMin} a {fluidCalc.manutMax} mL/dia</p>
                            {fluidCalc.deficit > 0 && <p><strong>Déficit:</strong> {fluidCalc.deficit} mL</p>}
                            <p><strong>Dose por aplicação (BID):</strong> ~{fluidCalc.bid} mL</p>
                            <p><strong>Dose por aplicação (TID):</strong> ~{fluidCalc.tid} mL</p>
                            <p><strong>Limite por ponto (SC):</strong> {fluidCalc.spotMin} a {fluidCalc.spotMax} mL</p>
                            <button
                              onClick={insertFluidCalc}
                              className="mt-2 w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                            >
                              Inserir Cálculo no Documento
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                    2. Conteúdo Clínico Variável (Personalizável pelo Veterinário)
                  </label>
                  <span className="text-[11px] text-teal-600 font-medium">Edição Livre</span>
                </div>

                <textarea
                  rows={5}
                  value={clinicalContent}
                  onChange={(e) => setClinicalContent(e.target.value)}
                  placeholder="Descreva as orientações clínicas, fármacos, doses ou procedimentos específicos..."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none leading-relaxed text-slate-700 font-sans"
                />
              </div>

              {/* Preview e Indicadores de Conformidade */}
              <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/70 text-xs text-teal-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span>Conformidade Ético-Profissional</span>
                  </div>
                  <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Assinatura Digital Integrada
                  </span>
                </div>
                <p className="text-teal-800/80 text-[11px]">
                  Ao gerar, o documento fica anexado permanentemente à linha do tempo do paciente. O tutor pode assinar eletronicamente na tela ou via link de atendimento.
                </p>
                {isControlado && numeroNotificacaoSipeagro && (
                  <div className="flex items-center gap-2 text-indigo-800 font-mono text-[11px] bg-indigo-100/70 p-2 rounded-lg">
                    <FileBadge className="w-3.5 h-3.5" />
                    <span>Notificação SIPEAGRO: <strong>{numeroNotificacaoSipeagro}</strong></span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Rodapé de Ações */}
        {!isDone && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Pré-visualizar
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || (isReceita && isControlado && !numeroNotificacaoSipeagro.trim())}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2"><span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full inline-block"></span>Salvando...</span>
                ) : (
                  <>
                    <FileSignature className="w-4 h-4" />
                    Gerar e Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Assinatura Digital ICP-Brasil */}
      {showDigitalModal && (
        <ReceitaDigitalModal
          isOpen={showDigitalModal}
          onClose={() => setShowDigitalModal(false)}
          pacienteId={clientId}
          pacienteNome={patientName}
          pacientePeso={patientWeight}
          tutorNome={tutorData?.nome || tutorName}
          tutorCpf={tutorData?.cpf}
          tutorTelefone={tutorData?.telefone}
          tutorEndereco={tutorData?.endereco}
          atendimentoId={atendimentoId}
          initialClinicalContent={clinicalContent}
          initialTipo={selectedType as 'receita_simples' | 'receita_manipulada'}
          userProfile={userProfile}
        />
      )}
    </div>
  );
};

export default GerarDocumentoModal;
