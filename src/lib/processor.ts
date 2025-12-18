import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { NotaFiscal, ProcessingResult, LogEntry, PdfFile } from '@/types';
import { gerarVariacoes, encontrarTodosPdfsCorrespondentes } from './normalizer';
import { formatarDataPasta } from './excelParser';

interface ProcessingCallbacks {
  onProgress: (current: number, total: number, nota: NotaFiscal) => void;
  onLog: (entry: LogEntry) => void;
  onNotaProcessed: (nota: NotaFiscal) => void;
}

/**
 * Processa todas as notas fiscais e organiza os PDFs
 */
export async function processarNotas(
  notas: NotaFiscal[],
  pdfs: PdfFile[],
  callbacks: ProcessingCallbacks
): Promise<ProcessingResult> {
  const { onProgress, onLog, onNotaProcessed } = callbacks;
  
  const result: ProcessingResult = {
    total: notas.length,
    success: 0,
    warnings: 0,
    errors: 0,
    skipped: 0,
    notas: []
  };
  
  // Agrupa notas por data de vencimento para numeração sequencial
  const notasPorData = new Map<string, NotaFiscal[]>();
  
  for (const nota of notas) {
    const dataKey = formatarDataPasta(nota.dataVencimento);
    if (!notasPorData.has(dataKey)) {
      notasPorData.set(dataKey, []);
    }
    notasPorData.get(dataKey)!.push(nota);
  }
  
  // Contadores de numeração por data
  const contadores = new Map<string, number>();
  
  let processados = 0;
  
  for (const nota of notas) {
    processados++;
    onProgress(processados, notas.length, nota);
    
    // Log de início
    onLog({
      timestamp: new Date(),
      level: 'info',
      message: `Processando nota ${processados}/${notas.length}: ${nota.fornecedor}`,
      details: `Número: ${nota.numeroOriginal}`
    });
    
    // Se é nota ignorada, pula
    if (nota.status === 'skipped') {
      result.skipped++;
      onLog({
        timestamp: new Date(),
        level: 'debug',
        message: `Nota ignorada: ${nota.fornecedor}`,
        details: nota.mensagem
      });
      onNotaProcessed(nota);
      result.notas.push(nota);
      continue;
    }
    
    // Gera variações do número
    const variacoes = gerarVariacoes(nota.numeroOriginal);
    
    onLog({
      timestamp: new Date(),
      level: 'debug',
      message: `Número normalizado: ${nota.numeroNormalizado}`,
      details: `Variações: ${variacoes.join(', ')}`
    });
    
    // Busca PDFs correspondentes
    const pdfSimples = pdfs.map(p => ({ name: p.name, file: p.file }));
    const pdfsEncontrados = encontrarTodosPdfsCorrespondentes(variacoes, pdfSimples);
    
    if (pdfsEncontrados.length === 0) {
      // Não encontrou nenhum PDF
      nota.status = 'error';
      nota.mensagem = 'PDF não encontrado';
      result.errors++;
      
      onLog({
        timestamp: new Date(),
        level: 'error',
        message: `PDF não encontrado: ${nota.numeroOriginal}`,
        details: `Fornecedor: ${nota.fornecedor}`
      });
      
    } else if (pdfsEncontrados.length > 1) {
      // Encontrou múltiplos - ambiguidade
      nota.status = 'warning';
      nota.mensagem = `Múltiplos PDFs encontrados: ${pdfsEncontrados.map(p => p.name).join(', ')}`;
      result.warnings++;
      
      // Usa o primeiro mas avisa
      nota.pdfOriginal = pdfsEncontrados[0].file;
      
      onLog({
        timestamp: new Date(),
        level: 'warning',
        message: `Múltiplos PDFs para nota ${nota.numeroOriginal}`,
        details: pdfsEncontrados.map(p => p.name).join(', ')
      });
      
    } else {
      // Encontrou exatamente um - sucesso
      nota.status = 'success';
      nota.pdfOriginal = pdfsEncontrados[0].file;
      nota.mensagem = `PDF encontrado: ${pdfsEncontrados[0].name}`;
      result.success++;
      
      onLog({
        timestamp: new Date(),
        level: 'success',
        message: `PDF encontrado: ${pdfsEncontrados[0].name}`,
        details: `Nota: ${nota.numeroOriginal}`
      });
    }
    
    // Atribui numeração sequencial se encontrou PDF
    if (nota.pdfOriginal && (nota.status === 'success' || nota.status === 'warning')) {
      const dataKey = formatarDataPasta(nota.dataVencimento);
      const contador = (contadores.get(dataKey) || 0) + 1;
      contadores.set(dataKey, contador);
      nota.numeracao = contador;
      nota.pdfNomeDestino = `${contador}- ${nota.pdfOriginal.name}`;
    }
    
    onNotaProcessed(nota);
    result.notas.push(nota);
    
    // Pequena pausa para não travar a UI
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return result;
}

/**
 * Gera arquivo ZIP com os PDFs organizados por pasta de data
 */
export async function gerarZipOrganizado(notas: NotaFiscal[]): Promise<Blob> {
  const zip = new JSZip();
  
  // Agrupa notas por data
  const notasPorData = new Map<string, NotaFiscal[]>();
  
  for (const nota of notas) {
    if (nota.pdfOriginal && nota.pdfNomeDestino) {
      const dataKey = formatarDataPasta(nota.dataVencimento);
      if (!notasPorData.has(dataKey)) {
        notasPorData.set(dataKey, []);
      }
      notasPorData.get(dataKey)!.push(nota);
    }
  }
  
  // Adiciona PDFs ao ZIP organizado por pasta
  for (const [dataPasta, notasDaData] of notasPorData) {
    const folder = zip.folder(dataPasta);
    
    for (const nota of notasDaData) {
      if (nota.pdfOriginal && nota.pdfNomeDestino && folder) {
        const arrayBuffer = await nota.pdfOriginal.arrayBuffer();
        folder.file(nota.pdfNomeDestino, arrayBuffer);
      }
    }
  }
  
  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Baixa o ZIP organizado
 */
export async function baixarZipOrganizado(notas: NotaFiscal[]): Promise<void> {
  const blob = await gerarZipOrganizado(notas);
  const dataAtual = new Date().toISOString().slice(0, 10);
  saveAs(blob, `fluxo_caixa_${dataAtual}.zip`);
}

/**
 * Gera log em formato texto
 */
export function gerarLogTexto(logs: LogEntry[]): string {
  return logs.map(log => {
    const timestamp = log.timestamp.toLocaleString('pt-BR');
    const level = log.level.toUpperCase().padEnd(7);
    let line = `${timestamp} | ${level} | ${log.message}`;
    if (log.details) {
      line += `\n                                | ${log.details}`;
    }
    return line;
  }).join('\n');
}

/**
 * Baixa o log como arquivo de texto
 */
export function baixarLog(logs: LogEntry[]): void {
  const texto = gerarLogTexto(logs);
  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  const dataAtual = new Date().toISOString().slice(0, 10);
  const hora = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
  saveAs(blob, `log_${dataAtual}_${hora}.txt`);
}
