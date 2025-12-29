const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api';

// Helper para ler erros do backend
async function readError(response: Response) {
  try {
    const data = await response.json();
    const msg =
      (data?.erro as string) ||
      (data?.message as string) ||
      `HTTP ${response.status}`;
    return { msg, data };
  } catch {
    return { msg: `HTTP ${response.status}`, data: null };
  }
}

// ==================== INTERFACES ====================

export interface ConfigResponse {
  sucesso: boolean;
  config: {
    basePath: string;
    origemRelativa: string;
    destinoRelativa: string;
  };
  baseDetectada: string | null;
  drivesDisponiveis: string[];
}

export interface ValidarPastaResponse {
  sucesso: boolean;
  existe: boolean;
  vazia: boolean;
  quantidadeArquivos: number;
  mensagem: string;
  caminho?: string;
}

export interface ProcessarResponse {
  sucesso: boolean;
  totalNotas: number;
  totalEncontrados: number;
  totalCopiados: number;
  totalErros: number;
  totalNaoEncontrados: number;
  totalIgnorados: number;
  copiados: string[];
  erros: { arquivo: string; erro: string }[];
  naoEncontrados: string[];
  ignoradosPorTamanho: string[];
  tempoExecucaoMs?: number;
}

export interface BuscarPdfsResponse {
  sucesso: boolean;
  encontrados: {
    numeroNota: string;
    nomeArquivo: string;
    tamanho: number;
  }[];
  naoEncontrados: string[];
  ignoradosPorTamanho: string[];
  total: number;
  totalEncontrados: number;
  totalNaoEncontrados: number;
  totalIgnorados: number;
}

// ==================== FUNCOES DA API ====================

// Verifica se o backend esta online
export async function verificarBackend(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

// Obtem configuracoes do backend
export async function obterConfig(): Promise<ConfigResponse> {
  const response = await fetch(`${API_BASE}/config`);
  if (!response.ok) {
    const { msg } = await readError(response);
    throw new Error(`Erro ao obter configuracoes: ${msg}`);
  }
  return response.json();
}

// Valida se a pasta de destino existe
export async function validarPasta(ano: number, mes: number, dia: number): Promise<ValidarPastaResponse> {
  const response = await fetch(`${API_BASE}/copiar/validar-pasta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ano, mes, dia })
  });

  if (!response.ok) {
    const { msg } = await readError(response);
    throw new Error(`Erro ao validar pasta: ${msg}`);
  }
  return response.json();
}

// Busca PDFs sem copiar (para preview)
export async function buscarPdfs(numerosNotas: string[], ano: number): Promise<BuscarPdfsResponse> {
  const response = await fetch(`${API_BASE}/pdfs/buscar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numerosNotas, ano })
  });

  if (!response.ok) {
    const { msg } = await readError(response);
    throw new Error(`Erro ao buscar PDFs: ${msg}`);
  }
  return response.json();
}

// Processa e copia PDFs para a pasta de destino
export async function processarECopiar(
  numerosNotas: string[],
  ano: number,
  mes: number,
  dia: number
): Promise<ProcessarResponse> {
  const response = await fetch(`${API_BASE}/copiar/processar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numerosNotas, ano, mes, dia })
  });

  if (!response.ok) {
    const { msg } = await readError(response);
    throw new Error(`Erro ao processar: ${msg}`);
  }
  return response.json();
}

// Limpa o cache de PDFs no backend
export async function limparCache(): Promise<void> {
  const response = await fetch(`${API_BASE}/pdfs/limpar-cache`, { method: 'POST' });
  if (!response.ok) {
    const { msg } = await readError(response);
    throw new Error(`Erro ao limpar cache: ${msg}`);
  }
}