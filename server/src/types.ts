import { z } from 'zod';

// Schema de validacao para configuracao
export const ConfiguracaoSchema = z.object({
  basePath: z.string().min(1),
  origemRelativa: z.string().min(1),
  destinoRelativa: z.string().min(1),
  ultimaAtualizacao: z.string().optional()
});

export type ConfiguracaoSistema = z.infer<typeof ConfiguracaoSchema>;

// Schema para busca de PDFs
export const BuscarPdfsRequestSchema = z.object({
  numerosNotas: z.array(z.string()).min(1).max(500),
  ano: z.number().min(2020).max(2100)
});

export type BuscarPdfsRequest = z.infer<typeof BuscarPdfsRequestSchema>;

export interface PdfEncontrado {
  numeroNota: string;
  nomeArquivo: string;
  caminhoCompleto: string;
  tamanho: number;
}

export interface BuscarPdfsResponse {
  encontrados: PdfEncontrado[];
  naoEncontrados: string[];
  total: number;
}

// Schema para copiar PDFs
export const CopiarPdfsRequestSchema = z.object({
  pdfs: z.array(z.object({
    caminhoOrigem: z.string(),
    nomeArquivo: z.string()
  })).min(1).max(500),
  ano: z.number(),
  mes: z.number().min(1).max(12),
  dia: z.number().min(1).max(31)
});

export type CopiarPdfsRequest = z.infer<typeof CopiarPdfsRequestSchema>;

export interface CopiarPdfsResponse {
  sucesso: boolean;
  copiados: string[];
  erros: ErroCopiaPdf[];
  totalCopiados: number;
  totalErros: number;
}

export interface ErroCopiaPdf {
  arquivo: string;
  erro: string;
}

// Schema para validar pasta
export const ValidarPastaRequestSchema = z.object({
  ano: z.number(),
  mes: z.number().min(1).max(12),
  dia: z.number().min(1).max(31)
});

export type ValidarPastaRequest = z.infer<typeof ValidarPastaRequestSchema>;

export interface ValidarPastaResponse {
  existe: boolean;
  vazia: boolean;
  quantidadeArquivos: number;
  caminho: string;
  mensagem: string;
}

// Configuracao padrao
export const CONFIG_PADRAO: ConfiguracaoSistema = {
  basePath: '\\\\192.168.25.251\\OneDrive - SPR',
  origemRelativa: 'Drive - CSC\\Contabilidade\\20-ContabileFiscal\\Jota Jota\\Docs Fiscais',
  destinoRelativa: 'Drive - CSC\\Financeiro\\01-Fluxo\\Fluxo de Caixa\\jota jota',
  ultimaAtualizacao: new Date().toISOString()
};

// Bases permitidas (allowlist de seguranca)
export const BASES_PERMITIDAS = [
  '\\\\192.168.25.251\\OneDrive - SPR',
  'Y:\\OneDrive - SPR',
  'Z:\\OneDrive - SPR',
  'C:\\OneDrive - SPR'
];
