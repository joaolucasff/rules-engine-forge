import * as XLSX from 'xlsx';
import { ExcelData, SecaoVencimento, NotaFiscal, FORNECEDORES_IGNORADOS } from '@/types';
import { normalizarNumero, gerarVariacoes } from './normalizer';

/**
 * Verifica se um fornecedor deve ser ignorado
 */
export function ehFornecedorIgnorado(fornecedor: string): boolean {
  if (!fornecedor) return false;
  const fornecedorUpper = fornecedor.toUpperCase();
  return FORNECEDORES_IGNORADOS.some(ign => fornecedorUpper.includes(ign));
}

/**
 * Converte valor do Excel para número
 */
function parseValor(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  if (!valor) return 0;
  
  const str = String(valor)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  return parseFloat(str) || 0;
}

/**
 * Converte data do Excel para Date
 */
function parseData(valor: unknown): Date | null {
  if (!valor) return null;
  
  // Se já é uma data
  if (valor instanceof Date) return valor;
  
  // Se é número do Excel (dias desde 1900)
  if (typeof valor === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const dias = Math.floor(valor);
    return new Date(excelEpoch.getTime() + dias * 24 * 60 * 60 * 1000);
  }
  
  // Se é string
  if (typeof valor === 'string') {
    // Formato DD/MM/YYYY
    const match = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    }
    
    // Formato DD/MM (usa ano atual)
    const matchCurto = valor.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (matchCurto) {
      return new Date(new Date().getFullYear(), parseInt(matchCurto[2]) - 1, parseInt(matchCurto[1]));
    }
  }
  
  return null;
}

/**
 * Gera um ID único
 */
function gerarId(): string {
  return `nota_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Faz o parse de um arquivo Excel e extrai as notas fiscais
 */
export async function parseExcelFile(file: File): Promise<ExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Procura a aba "Report"
        let sheetName = 'Report';
        if (!workbook.SheetNames.includes('Report')) {
          // Se não encontrar, usa a primeira aba
          sheetName = workbook.SheetNames[0];
        }
        
        const worksheet = workbook.Sheets[sheetName];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
        
        const secoes: SecaoVencimento[] = [];
        const datasEncontradas: Date[] = [];
        let secaoAtual: SecaoVencimento | null = null;
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          // Verifica se é uma linha de cabeçalho de vencimento
          const primeiraColuna = String(row[0] || '').trim();
          
          if (primeiraColuna.toLowerCase().includes('vencimento')) {
            // Encontra a data de vencimento (geralmente na coluna C/índice 2)
            const dataVencimento = parseData(row[2]);
            
            if (dataVencimento) {
              // Salva seção anterior
              if (secaoAtual && secaoAtual.notas.length > 0) {
                secoes.push(secaoAtual);
              }
              
              // Inicia nova seção
              secaoAtual = {
                dataVencimento,
                notas: []
              };
              
              if (!datasEncontradas.some(d => d.getTime() === dataVencimento.getTime())) {
                datasEncontradas.push(dataVencimento);
              }
            }
            continue;
          }
          
          // Se não tem seção ativa, pula
          if (!secaoAtual) continue;
          
          // Verifica se é uma linha de nota fiscal
          // Coluna A (0): Fornecedor (formato: "CODIGO - NOME")
          // Coluna G (6): Número da duplicata/nota
          const fornecedor = String(row[0] || '').trim();
          const numeroDuplicata = String(row[6] || '').trim();
          
          // Ignora linhas sem fornecedor ou sem número
          if (!fornecedor || !numeroDuplicata) continue;
          
          // Ignora linhas que são subtotais ou totais
          if (fornecedor.toLowerCase().includes('total') || 
              fornecedor.toLowerCase().includes('empresa')) continue;
          
          // Verifica se parece uma linha válida de nota
          // Fornecedor geralmente tem formato "CÓDIGO - NOME"
          if (!/^\d+\s*-/.test(fornecedor) && !fornecedor.includes('-')) continue;
          
          const ehIgnorado = ehFornecedorIgnorado(fornecedor);
          const numeroNormalizado = normalizarNumero(numeroDuplicata);
          const valor = parseValor(row[11]); // Coluna L (11): Valor do Título
          const dataEmissao = parseData(row[8]); // Coluna I (8): Data de Emissão
          
          const nota: NotaFiscal = {
            id: gerarId(),
            fornecedor,
            numeroOriginal: numeroDuplicata,
            numeroNormalizado,
            dataVencimento: secaoAtual.dataVencimento,
            valor,
            dataEmissao: dataEmissao || undefined,
            status: ehIgnorado ? 'skipped' : 'pending',
            mensagem: ehIgnorado ? 'Fornecedor na lista de ignorados' : undefined
          };
          
          secaoAtual.notas.push(nota);
        }
        
        // Adiciona última seção
        if (secaoAtual && secaoAtual.notas.length > 0) {
          secoes.push(secaoAtual);
        }
        
        // Ordena datas
        datasEncontradas.sort((a, b) => a.getTime() - b.getTime());
        
        // Conta total de notas
        const totalNotas = secoes.reduce((sum, s) => sum + s.notas.length, 0);
        
        resolve({
          secoes,
          datasEncontradas,
          totalNotas
        });
        
      } catch (error) {
        reject(new Error(`Erro ao processar arquivo Excel: ${error}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Formata data para exibição
 */
export function formatarData(data: Date): string {
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formata data para nome de pasta
 */
export function formatarDataPasta(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}-${mes}-${ano}`;
}

/**
 * Formata valor em reais
 */
export function formatarValor(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}
