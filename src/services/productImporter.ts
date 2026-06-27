import Papa from 'papaparse';
import { db } from './firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { Product } from './dataService';

// Parsear valor monetário BR -> number
const parseBRNumber = (value: string): number => {
  if (!value || value === '') return 0;
  // Remove R$, espaços, pontos de milhar, troca vírgula por ponto
  const clean = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

// Parsear porcentagem
const parsePercent = (value: string): number => {
  if (!value) return 0;
  const clean = value.replace('%', '').replace(',', '.').trim();
  return parseFloat(clean) || 0;
};

export const parseProductCSV = async (
  file: File,
  tenantId: string
): Promise<{
  products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[];
  errors: string[];
  skipped: number;
}> => {
  return new Promise((resolve) => {
    const errors: string[] = [];
    let skipped = 0;

    Papa.parse(file, {
      header: true,
      delimiter: ';',
      encoding: 'UTF-8',
      skipEmptyLines: true,
      complete: (results) => {
        const products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [];

        results.data.forEach((row: any, index: number) => {
          // Validar campos obrigatórios
          if (!row['Produto'] || row['Produto'].trim() === '') {
            skipped++;
            return;
          }

          try {
            const product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
              internalCode: row['Código']?.trim() || '',
              name: row['Produto']?.trim() || '',
              brand: row['Marca']?.trim() || undefined,
              type: row['Tipo']?.trim() === 'Serviço' ? 'service' : 'product',
              group: row['Grupo']?.trim() || 'Outros',
              unit: row['Unidade']?.trim() || 'UN',
              purpose: row['Propósito']?.trim() || undefined,

              barcode: row['Código Barra']?.trim() || undefined,
              ncmCode: row['Código NCM']?.trim() || undefined,
              anvisaCode: row['Código de registro na ANVISA']?.trim() || undefined,

              costPrice: parseBRNumber(row['Custo']),
              salePrice: parseBRNumber(row['Venda']),
              commission: parsePercent(row['Comissão Padrão']),

              controlsStock: row['Controla Estoque']?.trim() === 'Sim',
              currentStock: row['Estoque'] ? parseBRNumber(row['Estoque']) : undefined,
              minStock: row['Minimo'] ? parseBRNumber(row['Minimo']) : undefined,
              maxStock: row['Máximo'] ? parseBRNumber(row['Máximo']) : undefined,
              expiryDate: row['Validade']?.trim() || undefined,

              supplier: row['Fornecedor']?.trim() || undefined,
              lastPurchaseDate: row['Compra']?.trim() || undefined,

              taxProfile: row['Perfil Tributário']?.trim() || undefined,
              acquisitionForm: row['Forma de aquisição']?.trim() || undefined,
              taxSituation: row['Situação tributária']?.trim() || undefined,
              aliquot: row['Alíquota']?.trim() || undefined,
              csticms: row['CSTICMS']?.trim() || undefined,
              merchandiseOrigin: row['Origem da mercadoria']?.trim() || undefined,
              cest: row['CEST']?.trim() || undefined,

              status: 'active',
              tenantId,
            };

            products.push(product);
          } catch (err: any) {
            errors.push(`Row ${index + 2}: ${err.message || err}`);
          }
        });

        resolve({ products, errors, skipped });
      },
      error: (err: any) => {
        resolve({ products: [], errors: [err.message], skipped: 0 });
      },
    });
  });
};

export const importProductsBatch = async (
  products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[],
  tenantId: string,
  mode: 'replace' | 'add_new' | 'update',
  onProgress: (current: number, total: number) => void
): Promise<{ imported: number; errors: number }> => {
  const batchSize = 400;
  let imported = 0;
  let errorsCount = 0;

  if (mode === 'replace') {
    // Nota: O escopo não exigia a implementação exata do 'replace' deletando tudo,
    // mas se necessário, aqui buscaríamos todos os docs do tenant e deletariamos
    // em batches antes de adicionar os novos.
  }

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = products.slice(i, i + batchSize);

    chunk.forEach(product => {
      const ref = doc(collection(db, 'artifacts', tenantId, 'public', 'data', 'products'));
      
      let data: any = {
        ...product,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      batch.set(ref, data);
    });

    try {
      await batch.commit();
      imported += chunk.length;
    } catch (err) {
      console.error(err);
      errorsCount += chunk.length;
    }

    onProgress(Math.min(i + batchSize, products.length), products.length);
  }

  return { imported, errors: errorsCount };
};
