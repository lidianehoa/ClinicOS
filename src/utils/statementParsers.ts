import Papa from 'papaparse';

export interface BankTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  balance?: number;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const parseDateString = (dateStr: string): string => {
  // Try to parse DD/MM/YYYY or YYYY-MM-DD
  if (!dateStr) return '';
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else {
      // DD/MM/YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return dateStr;
};

const parseAmountString = (amountStr: string): number => {
  if (!amountStr) return 0;
  // Handle Brazilian format: 1.234,56 -> 1234.56
  // Or US format: 1,234.56 -> 1234.56
  
  let str = amountStr.toString().trim();
  
  // If we have both dots and commas
  if (str.includes('.') && str.includes(',')) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      // Brazilian: dots are thousands, comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US: commas are thousands, dot is decimal
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Only comma, assume Brazilian decimal
    str = str.replace(',', '.');
  }
  
  return parseFloat(str) || 0;
};

export const parseCSV = (file: File): Promise<BankTransaction[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const transactions = results.data.map((row: any) => {
          const dateField = Object.keys(row).find(k =>
            k.toLowerCase().includes('data') ||
            k.toLowerCase().includes('date')
          );
          
          const amountField = Object.keys(row).find(k =>
            k.toLowerCase().includes('valor') ||
            k.toLowerCase().includes('amount') ||
            k.toLowerCase().includes('crédito') ||
            k.toLowerCase() === 'value'
          );
          
          const descField = Object.keys(row).find(k =>
            k.toLowerCase().includes('histórico') ||
            k.toLowerCase().includes('descrição') ||
            k.toLowerCase().includes('title') ||
            k.toLowerCase().includes('description') ||
            k.toLowerCase().includes('memo')
          );

          const date = dateField ? parseDateString(row[dateField]) : '';
          const amount = amountField ? parseAmountString(row[amountField]) : 0;
          const description = descField ? row[descField] : '';

          return {
            id: `bt_${generateId()}`,
            date,
            amount,
            description,
          };
        }).filter(t => t.date && t.amount !== 0);

        resolve(transactions);
      },
      error: reject,
    });
  });
};

export const parseOFX = (content: string): BankTransaction[] => {
  const transactions: BankTransaction[] = [];
  
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1];

    const getField = (field: string): string => {
      const regex = new RegExp(`<${field}>([^<]+)`);
      const m = block.match(regex);
      return m ? m[1].trim() : '';
    };

    const dtPosted = getField('DTPOSTED');
    const trnAmt = getField('TRNAMT');
    const memo = getField('MEMO') || getField('NAME');

    if (dtPosted && trnAmt) {
      transactions.push({
        id: `bt_${generateId()}`,
        date: `${dtPosted.substring(0,4)}-${dtPosted.substring(4,6)}-${dtPosted.substring(6,8)}`,
        amount: parseFloat(trnAmt.replace(',', '.')),
        description: memo,
      });
    }
  }

  return transactions;
};
