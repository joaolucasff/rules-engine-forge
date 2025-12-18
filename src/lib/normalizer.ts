import { PREFIXOS_REMOVER } from '@/types';

/**
 * Normaliza o número da nota fiscal removendo prefixos, sufixos e zeros à esquerda
 */
export function normalizarNumero(numero: string): string {
  if (!numero) return '';
  
  let resultado = numero.trim().toUpperCase();
  
  // Passo 1: Remover prefixos especiais
  for (const prefixo of PREFIXOS_REMOVER) {
    if (resultado.startsWith(prefixo)) {
      resultado = resultado.slice(prefixo.length);
      break;
    }
  }
  
  // Passo 2: Remover sufixos de parcela (-001, -002, /01, /02, etc)
  resultado = resultado.replace(/[-/]\d{1,3}$/, '');
  
  // Passo 3: Remover padrão "1-" inicial (ex: "1-0085583")
  if (/^1-/.test(resultado)) {
    resultado = resultado.slice(2);
  }
  
  // Passo 4: Remover prefixos numéricos (00, 10, 20, 30 + zeros)
  // Padrão: prefixo numérico seguido de zeros e depois o número real
  const matchPrefixoNumerico = resultado.match(/^[0123]\d{2,}$/);
  if (matchPrefixoNumerico) {
    // Remove zeros à esquerda mantendo pelo menos 1 dígito
    resultado = resultado.replace(/^0+/, '') || '0';
  }
  
  // Remover zeros à esquerda em geral
  if (/^\d+$/.test(resultado)) {
    resultado = resultado.replace(/^0+/, '') || '0';
  }
  
  return resultado;
}

/**
 * Gera variações do número para aumentar chances de encontrar o PDF
 */
export function gerarVariacoes(numeroOriginal: string): string[] {
  const normalizado = normalizarNumero(numeroOriginal);
  const variacoes = new Set<string>();
  
  // Adiciona o número normalizado
  variacoes.add(normalizado);
  
  // Adiciona o número original (limpo de prefixos)
  let limpo = numeroOriginal.trim().toUpperCase();
  for (const prefixo of PREFIXOS_REMOVER) {
    if (limpo.startsWith(prefixo)) {
      limpo = limpo.slice(prefixo.length);
      break;
    }
  }
  variacoes.add(limpo);
  
  // Adiciona variações com zeros à esquerda
  if (/^\d+$/.test(normalizado)) {
    variacoes.add(normalizado.padStart(6, '0'));
    variacoes.add(normalizado.padStart(8, '0'));
    variacoes.add('00' + normalizado);
    variacoes.add('000' + normalizado);
  }
  
  return Array.from(variacoes).filter(v => v.length > 0);
}

/**
 * Verifica se um número está contido no nome do arquivo
 */
export function verificarMatch(numeroNormalizado: string, nomeArquivo: string): boolean {
  if (!numeroNormalizado || !nomeArquivo) return false;
  
  const nomeLimpo = nomeArquivo.toUpperCase().replace(/\.PDF$/i, '');
  
  // Verifica se o número normalizado está no nome do arquivo
  // como um número inteiro (não parte de outro número)
  const regex = new RegExp(`(^|[^\\d])${numeroNormalizado}([^\\d]|$)`);
  return regex.test(nomeLimpo) || nomeLimpo.includes(numeroNormalizado);
}

/**
 * Encontra o melhor PDF correspondente para uma nota
 */
export function encontrarPdfCorrespondente(
  variacoes: string[],
  pdfs: { name: string; file: File }[]
): { file: File; name: string } | null {
  for (const variacao of variacoes) {
    for (const pdf of pdfs) {
      if (verificarMatch(variacao, pdf.name)) {
        return pdf;
      }
    }
  }
  return null;
}

/**
 * Encontra todos os PDFs correspondentes (para detectar ambiguidade)
 */
export function encontrarTodosPdfsCorrespondentes(
  variacoes: string[],
  pdfs: { name: string; file: File }[]
): { file: File; name: string }[] {
  const encontrados: { file: File; name: string }[] = [];
  
  for (const pdf of pdfs) {
    for (const variacao of variacoes) {
      if (verificarMatch(variacao, pdf.name)) {
        encontrados.push(pdf);
        break; // Evita duplicatas do mesmo PDF
      }
    }
  }
  
  return encontrados;
}
