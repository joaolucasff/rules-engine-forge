// Types for the Cash Flow Automation System

export interface NotaFiscal {
  id: string;
  fornecedor: string;
  numeroOriginal: string;
  numeroNormalizado: string;
  dataVencimento: Date;
  valor: number;
  dataEmissao?: Date;
  status: ProcessingStatus;
  mensagem?: string;
  pdfOriginal?: File;
  pdfNomeDestino?: string;
  numeracao?: number;
}

export type ProcessingStatus = 
  | 'pending'      // Aguardando processamento
  | 'processing'   // Em processamento
  | 'success'      // Sucesso
  | 'warning'      // Aviso (copiou mas com ressalvas)
  | 'error'        // Erro (não encontrou PDF)
  | 'skipped';     // Ignorado (fornecedor na lista de ignorados)

export interface SecaoVencimento {
  dataVencimento: Date;
  notas: NotaFiscal[];
}

export interface ProcessingResult {
  total: number;
  success: number;
  warnings: number;
  errors: number;
  skipped: number;
  notas: NotaFiscal[];
}

export interface ExcelData {
  secoes: SecaoVencimento[];
  datasEncontradas: Date[];
  totalNotas: number;
}

export interface PdfFile {
  file: File;
  name: string;
  normalizedNumbers: string[];
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug' | 'success';
  message: string;
  details?: string;
}

// Lista de fornecedores a serem ignorados
export const FORNECEDORES_IGNORADOS = [
  'NOVAX',
  'CREDVALE', 
  'CAPITAL',
  'STONE',
  'SQUID',
  'RECEITA FEDERAL',
  'UNIMED'
];

// Prefixos a remover dos números de nota
export const PREFIXOS_REMOVER = [
  'DP-',
  'DA-',
  'EM-',
  'U-',
  'NF-',
  'NOTA-',
  'FAT-',
  'V-'
];
