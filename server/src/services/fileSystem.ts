import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { PdfEncontrado, ConfiguracaoSistema, CONFIG_PADRAO, BASES_PERMITIDAS } from '../types.js';

const CONFIG_FILE = path.join(process.cwd(), 'config.json');

// Cache de PDFs indexados
let cacheIndex: Map<string, string[]> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// MINIMO DE DIGITOS PARA BUSCA - notas com menos serao ignoradas e reportadas
const MIN_DIGITOS_BUSCA = 4;

// ==================== CONFIGURACAO ====================

export async function carregarConfig(): Promise<ConfiguracaoSistema> {
  try {
    if (fsSync.existsSync(CONFIG_FILE)) {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.basePath && parsed.origemRelativa && parsed.destinoRelativa) {
        return parsed as ConfiguracaoSistema;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar config:', error);
  }
  return CONFIG_PADRAO;
}

export async function salvarConfig(config: ConfiguracaoSistema): Promise<boolean> {
  try {
    if (!validarBasePath(config.basePath)) {
      console.error('BasePath nao permitido:', config.basePath);
      return false;
    }
    config.ultimaAtualizacao = new Date().toISOString();
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Erro ao salvar config:', error);
    return false;
  }
}

// ==================== SEGURANCA ====================

export function validarBasePath(basePath: string): boolean {
  const normalizado = basePath.toLowerCase().replace(/\//g, '\\');
  return BASES_PERMITIDAS.some(base => 
    normalizado.startsWith(base.toLowerCase())
  );
}

export function sanitizarCaminho(caminho: string): string | null {
  if (caminho.includes('..') || caminho.includes('%')) {
    return null;
  }
  return caminho.replace(/\//g, '\\');
}

export function validarCaminhoPermitido(caminhoCompleto: string, config: ConfiguracaoSistema): boolean {
  const normalizado = caminhoCompleto.toLowerCase().replace(/\//g, '\\');
  const baseNormalizada = config.basePath.toLowerCase().replace(/\//g, '\\');
  return normalizado.startsWith(baseNormalizada);
}

// ==================== CAMINHOS ====================

export function montarCaminhoOrigem(config: ConfiguracaoSistema, ano: number): string {
  return path.win32.join(config.basePath, config.origemRelativa, ano.toString());
}

export function montarCaminhoDestino(config: ConfiguracaoSistema, ano: number, mes: number, dia: number): string {
  const mesAno = `${mes.toString().padStart(2, '0')}-${ano}`;
  const diaMesAno = `${dia.toString().padStart(2, '0')}-${mes.toString().padStart(2, '0')}-${ano}`;
  return path.win32.join(config.basePath, config.destinoRelativa, ano.toString(), mesAno, diaMesAno);
}

// ==================== VERIFICACAO DE PASTAS ====================

export async function pastaExiste(caminho: string): Promise<boolean> {
  try {
    const stat = await fs.stat(caminho);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function pastaVazia(caminho: string): Promise<{ vazia: boolean; quantidade: number }> {
  try {
    const arquivos = await fs.readdir(caminho);
    return { vazia: arquivos.length === 0, quantidade: arquivos.length };
  } catch {
    return { vazia: true, quantidade: 0 };
  }
}

// ==================== INDEXACAO DE PDFS ====================

/**
 * Extrai tokens numericos do nome do arquivo para indexacao
 * CORRECAO: Somente tokens com 4+ digitos para evitar falsos positivos
 * Remove valores monetarios antes de extrair para evitar colisoes (ex: R$ 11.101,15 -> 101)
 */
function extrairTokensNumericos(nomeArquivo: string): string[] {
  // Remove valores monetarios para evitar tokens vindos de precos
  const semValores = nomeArquivo.replace(/R\$\s*[\d.,]+/gi, ' ');
  
  // Extrai somente sequencias com 4+ digitos
  const matches = semValores.match(new RegExp(`\\d{${MIN_DIGITOS_BUSCA},}`, 'g')) || [];
  
  const tokens = new Set<string>();
  
  for (const match of matches) {
    tokens.add(match);
    
    // Adiciona sem zeros a esquerda (se ainda tiver 4+ digitos)
    const semZeros = match.replace(/^0+/, '');
    if (semZeros && semZeros !== match && semZeros.length >= MIN_DIGITOS_BUSCA) {
      tokens.add(semZeros);
    }
  }
  
  return Array.from(tokens);
}

async function listarPdfsRecursivo(pasta: string, profundidadeMax: number = 10): Promise<string[]> {
  const pdfs: string[] = [];

  async function buscarRecursivo(dir: string, profundidade: number) {
    if (profundidade > profundidadeMax) return;

    try {
      const itens = await fs.readdir(dir);

      for (const item of itens) {
        const caminhoCompleto = path.win32.join(dir, item);

        try {
          const stat = await fs.stat(caminhoCompleto);

          if (stat.isDirectory()) {
            await buscarRecursivo(caminhoCompleto, profundidade + 1);
          } else if (item.toLowerCase().endsWith('.pdf')) {
            pdfs.push(caminhoCompleto);
          }
        } catch (err) {
          console.error(`Erro ao acessar ${caminhoCompleto}:`, err);
        }
      }
    } catch (error) {
      console.error(`Erro ao ler pasta ${dir}:`, error);
    }
  }

  await buscarRecursivo(pasta, 0);
  return pdfs;
}

async function construirIndicePdfs(pasta: string): Promise<Map<string, string[]>> {
  const indice = new Map<string, string[]>();

  console.log(`Construindo indice de PDFs em: ${pasta}`);
  const pdfs = await listarPdfsRecursivo(pasta);
  console.log(`Total de PDFs encontrados: ${pdfs.length}`);

  for (const pdfPath of pdfs) {
    const nomeArquivo = path.basename(pdfPath);
    const tokens = extrairTokensNumericos(nomeArquivo);

    for (const token of tokens) {
      if (!indice.has(token)) {
        indice.set(token, []);
      }
      indice.get(token)!.push(pdfPath);
    }
  }

  return indice;
}

async function obterIndicePdfs(pasta: string): Promise<Map<string, string[]>> {
  const agora = Date.now();

  if (cacheIndex && (agora - cacheTimestamp) < CACHE_TTL) {
    console.log('Usando cache de PDFs');
    return cacheIndex;
  }

  cacheIndex = await construirIndicePdfs(pasta);
  cacheTimestamp = agora;

  return cacheIndex;
}

export function limparCachePdfs(): void {
  cacheIndex = null;
  cacheTimestamp = 0;
  console.log('Cache de PDFs limpo');
}

// ==================== NORMALIZACAO ====================

/**
 * Normaliza o numero da nota removendo prefixos, sufixos e caracteres especiais
 */
function normalizarNumero(numero: string): string {
  if (!numero) return '';
  let resultado = numero.trim().toUpperCase();

  // Remove prefixos conhecidos
  const prefixos = ['DP-', 'DA-', 'EM-', 'U-', 'NF-', 'NOTA-', 'FAT-', 'V-'];
  for (const prefixo of prefixos) {
    if (resultado.startsWith(prefixo)) {
      resultado = resultado.slice(prefixo.length);
      break;
    }
  }

  // Remove sufixos de parcela (-001, -002, /01, /02, etc)
  resultado = resultado.replace(/[-/]\d{1,3}$/, '');

  // Remove padrao "1-" inicial (ex: "1-0085583")
  if (/^1-/.test(resultado)) {
    resultado = resultado.slice(2);
  }

  // Remove zeros a esquerda mantendo pelo menos 1 digito
  if (/^\d+$/.test(resultado)) {
    resultado = resultado.replace(/^0+/, '') || '0';
  }

  return resultado;
}

/**
 * Gera variacoes do numero para busca no indice
 * CORRECAO: Retorna array vazio se o numero normalizado tiver menos de 4 digitos
 * Isso evita falsos positivos com tokens curtos como "1", "01", "101"
 */
function gerarVariacoes(numeroOriginal: string): string[] {
  const normalizado = normalizarNumero(numeroOriginal);
  const variacoes = new Set<string>();

  // Extrai apenas digitos
  const chave = normalizado.replace(/\D/g, '');
  
  // Se nao tem digitos suficientes, retorna vazio (sera reportado como ignorado)
  if (!chave || chave.length < MIN_DIGITOS_BUSCA) {
    return [];
  }

  variacoes.add(chave);

  // Extrai apenas numeros do original (as vezes vem com lixo no meio)
  const apenasNumeros = numeroOriginal.replace(/\D/g, '');
  if (apenasNumeros && apenasNumeros.length >= MIN_DIGITOS_BUSCA) {
    variacoes.add(apenasNumeros);

    const semZeros = apenasNumeros.replace(/^0+/, '');
    if (semZeros && semZeros.length >= MIN_DIGITOS_BUSCA) {
      variacoes.add(semZeros);
    }
  }

  // Adiciona variacoes com zeros a esquerda para compatibilidade
  if (/^\d+$/.test(chave)) {
    variacoes.add(chave.padStart(6, '0'));
    variacoes.add(chave.padStart(8, '0'));
  }

  // Remove prefixo de serie (ex: 3001234567 -> 1234567)
  if (/^[123]00\d{4,}$/.test(chave)) {
    const semPrefixo = chave.slice(3).replace(/^0+/, '');
    if (semPrefixo && semPrefixo.length >= MIN_DIGITOS_BUSCA) {
      variacoes.add(semPrefixo);
    }
  }

  return Array.from(variacoes);
}

// ==================== BUSCA DE PDFS ====================

/**
 * Busca PDFs correspondentes aos numeros de notas
 * CORRECAO: Agora retorna tambem lista de notas ignoradas por terem numero muito curto
 */
export async function buscarPdfs(
  pastaOrigem: string,
  numerosNotas: string[]
): Promise<{ 
  encontrados: PdfEncontrado[]; 
  naoEncontrados: string[]; 
  ignoradosPorTamanho: string[] 
}> {

  const encontrados: PdfEncontrado[] = [];
  const naoEncontrados: string[] = [];
  const ignoradosPorTamanho: string[] = [];

  const indice = await obterIndicePdfs(pastaOrigem);

  for (const numeroNota of numerosNotas) {
    const variacoes = gerarVariacoes(numeroNota);

    // Se nao gerou variacoes, o numero e muito curto - reportar como ignorado
    if (variacoes.length === 0) {
      ignoradosPorTamanho.push(numeroNota);
      console.log(`[BUSCA] Nota ignorada (numero curto): ${numeroNota}`);
      continue;
    }

    let encontrou = false;

    for (const variacao of variacoes) {
      const pdfsCorrespondentes = indice.get(variacao);

      if (pdfsCorrespondentes && pdfsCorrespondentes.length > 0) {
        const pdfPath = pdfsCorrespondentes[0];

        try {
          const stat = await fs.stat(pdfPath);
          encontrados.push({
            numeroNota,
            nomeArquivo: path.basename(pdfPath),
            caminhoCompleto: pdfPath,
            tamanho: stat.size
          });
          encontrou = true;
          break;
        } catch (err) {
          console.error(`Erro ao obter stat de ${pdfPath}:`, err);
        }
      }
    }

    if (!encontrou) {
      naoEncontrados.push(numeroNota);
    }
  }

  console.log(`[BUSCA] Encontrados: ${encontrados.length} | Nao encontrados: ${naoEncontrados.length} | Ignorados: ${ignoradosPorTamanho.length}`);

  return { encontrados, naoEncontrados, ignoradosPorTamanho };
}

// ==================== COPIA DE ARQUIVOS ====================

export async function copiarArquivo(origem: string, destino: string): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    try {
      await fs.access(origem);
    } catch {
      return { sucesso: false, erro: 'Arquivo de origem nao encontrado' };
    }

    const pastaDestino = path.dirname(destino);
    if (!(await pastaExiste(pastaDestino))) {
      return { sucesso: false, erro: 'Pasta de destino nao existe' };
    }

    await fs.copyFile(origem, destino);

    return { sucesso: true };
  } catch (error) {
    return { sucesso: false, erro: String(error) };
  }
}

// ==================== DETECCAO DE DRIVES ====================

export function detectarDrives(): string[] {
  const drives: string[] = [];
  const letras = ['C', 'D', 'E', 'F', 'G', 'H', 'Y', 'Z'];

  for (const letra of letras) {
    const drive = `${letra}:\\`;
    if (fsSync.existsSync(drive)) {
      drives.push(drive);
    }
  }

  return drives;
}

export async function detectarBasePath(): Promise<string | null> {
  for (const base of BASES_PERMITIDAS) {
    if (await pastaExiste(base)) {
      return base;
    }
  }
  return null;
}