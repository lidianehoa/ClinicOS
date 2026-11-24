import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { examesCol, getActiveTenantId, Exame } from './dataService';

/**
 * Envia um ou mais arquivos de exame (PDF, fotos) e cria um registro de exame do paciente.
 * Sem análise por IA. Os arquivos ficam em clinicas/{clínica}/exames/{paciente}/{exame}/.
 */
export interface DadosExame {
  tipo: string;
  dataExame?: string;
  laboratorio?: string;
  observacoes?: string;
  evolucaoId?: string;
  encaminhamento?: { clinicaOrigem?: string; crmvOrigem?: string; motivoEncaminhamento?: string };
}

const nomeSeguro = (n: string) =>
  n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80);

export async function salvarExameComArquivos(
  pacienteId: string,
  arquivos: File[],
  dados: DadosExame,
  aoProgredir?: (pct: number) => void
): Promise<Exame> {
  if (!db || !storage) throw new Error('Banco de dados indisponível.');
  if (!arquivos.length) throw new Error('Escolha pelo menos um arquivo.');
  const tenantId = getActiveTenantId();
  const exameId = `exame_${Date.now()}`;
  const total = arquivos.reduce((s, f) => s + f.size, 0) || 1;
  const enviados: number[] = arquivos.map(() => 0);
  const lista: { nome: string; url: string; contentType?: string }[] = [];

  for (let i = 0; i < arquivos.length; i++) {
    const f = arquivos[i];
    const caminho = `clinicas/${tenantId}/exames/${pacienteId}/${exameId}/${i + 1}_${nomeSeguro(f.name)}`;
    const tarefa = uploadBytesResumable(ref(storage, caminho), f, { contentType: f.type || undefined });
    await new Promise<void>((ok, erro) => {
      tarefa.on('state_changed',
        snap => {
          enviados[i] = snap.bytesTransferred;
          aoProgredir?.(Math.round((enviados.reduce((a, b) => a + b, 0) / total) * 100));
        },
        erro,
        () => ok());
    });
    lista.push({ nome: f.name, url: await getDownloadURL(tarefa.snapshot.ref), contentType: f.type || undefined });
  }

  const enc = dados.encaminhamento?.clinicaOrigem?.trim() ? dados.encaminhamento : undefined;
  const exame: Exame = {
    id: exameId,
    pacienteId,
    tipo: dados.tipo.trim() || 'Exame',
    fileUrl: lista[0].url,
    arquivos: lista,
    dataUpload: new Date().toISOString(),
    tenantId,
    ...(dados.dataExame ? { dataExame: dados.dataExame } : {}),
    ...(dados.laboratorio?.trim() ? { laboratorio: dados.laboratorio.trim() } : {}),
    ...(dados.observacoes?.trim() ? { observacoes: dados.observacoes.trim() } : {}),
    ...(dados.evolucaoId ? { evolucaoId: dados.evolucaoId } : {}),
    isEncaminhamento: !!enc,
    ...(enc ? { encaminhamento: enc } : {}),
  };
  await setDoc(doc(examesCol(), exameId), exame);
  return exame;
}

/** Lista de arquivos de um exame (registros antigos só têm fileUrl) */
export const arquivosDoExame = (e: Exame) =>
  e.arquivos?.length ? e.arquivos : e.fileUrl ? [{ nome: e.tipo || 'Exame', url: e.fileUrl }] : [];
