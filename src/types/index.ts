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
  linhaPlanilha?: number;
}

export type ProcessingStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'warning'
  | 'error'
  | 'skipped';

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

// ==================== TIPOS PARA MULTIPLOS DIAS ====================

/** Formato de data ISO para APIs */
export type ISODateString = string; // 'YYYY-MM-DD'

/** Grupo de notas para enviar ao backend */
export interface GrupoVencimentoAPI {
  dataVencimento: ISODateString;
  numerosNotas: string[];
}

/** Resultado de um grupo processado */
export interface ResultadoGrupo {
  dataVencimento: ISODateString;
  pastaDestino: string;
  totalNotas: number;
  totalEncontrados: number;
  totalCopiados: number;
  totalNaoEncontrados: number;
  totalIgnorados: number;
  totalErros: number;
  copiados: string[];
  naoEncontrados: string[];
  ignoradosPorTamanho: string[];
  erros: { arquivo: string; erro: string }[];
}

/** Resposta consolidada do processamento multiplo */
export interface ProcessarMultiplosResponse {
  sucesso: boolean;
  grupos: ResultadoGrupo[];
  resumo: {
    totalGrupos: number;
    totalNotas: number;
    totalEncontrados: number;
    totalCopiados: number;
    totalNaoEncontrados: number;
    totalIgnorados: number;
    totalErros: number;
  };
  tempoExecucaoMs: number;
}

/** Validacao de multiplas pastas */
export interface ValidarPastasResponse {
  sucesso: boolean;
  grupos: {
    dataVencimento: ISODateString;
    pastaDestino: string;
    existe: boolean;
    vazia: boolean;
    quantidadeArquivos: number;
    erro?: string;
  }[];
}

// ==================== CONSTANTES ====================

/** Lista de fornecedores a serem ignorados */
export const FORNECEDORES_IGNORADOS = [
  // Servicos financeiros
  'NOVAX',
  'CREDVALE',
  'CAPITAL',
  'STONE',
  'SQUID',
  // Governo e saude
  'RECEITA FEDERAL',
  'UNIMED',
  // Telefonia e internet
  'TELEFONICA',
  'VIVO',
  'TIM',
  'CLARO',
  'OI',
  'NEXTEL',
  // Concessionarias
  'CELESC',
  'CASAN',
  'COPEL',
  'SANEPAR',
  'SABESP',
  'CPFL',
  'CEMIG',
  'ENERGISA'
] as const;

/** Prefixos a remover dos numeros de nota */
export const PREFIXOS_REMOVER = [
  'DP-',
  'DA-',
  'EM-',
  'U-',
  'NF-',
  'NOTA-',
  'FAT-',
  'V-'
] as const;