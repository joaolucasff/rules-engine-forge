import { Router, Request, Response } from 'express';
import path from 'path';
import { 
  carregarConfig, 
  pastaExiste, 
  pastaVazia, 
  copiarArquivo,
  montarCaminhoDestino,
  montarCaminhoOrigem,
  buscarPdfs
} from '../services/fileSystem.js';
import { 
  ValidarPastaRequestSchema,
  ErroCopiaPdf 
} from '../types.js';
import { z } from 'zod';

const router = Router();

// Schema para processar e copiar (com validacoes robustas)
const ProcessarECopiarSchema = z.object({
  numerosNotas: z.array(z.string().trim().min(1).max(50)).min(1).max(500),
  ano: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  dia: z.coerce.number().int().min(1).max(31)
}).refine(({ ano, mes, dia }) => {
  const d = new Date(ano, mes - 1, dia);
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia;
}, { message: 'Data invalida' });

/**
 * POST /api/copiar/processar
 * Busca os PDFs e copia para a pasta de destino em uma unica operacao
 */
router.post('/processar', async (req: Request, res: Response) => {
  const inicio = Date.now();
  
  try {
    // Valida payload
    const resultado = ProcessarECopiarSchema.safeParse(req.body);
    
    if (!resultado.success) {
      res.status(400).json({ 
        sucesso: false, 
        erro: 'Dados invalidos', 
        detalhes: resultado.error.errors 
      });
      return;
    }
    
    const { ano, mes, dia } = resultado.data;
    
    // Deduplica numeros de notas
    const numerosNotas = [...new Set(resultado.data.numerosNotas)];
    
    const config = await carregarConfig();
    
    // Monta caminhos
    const pastaOrigem = montarCaminhoOrigem(config, ano);
    const pastaDestino = montarCaminhoDestino(config, ano, mes, dia);
    
    console.log(`[PROCESSAR] Iniciando processamento de ${numerosNotas.length} notas`);
    console.log(`[PROCESSAR] Origem: ${pastaOrigem}`);
    console.log(`[PROCESSAR] Destino: ${pastaDestino}`);
    
    // Verifica se pasta de origem existe
    if (!(await pastaExiste(pastaOrigem))) {
      res.status(404).json({
        sucesso: false,
        erro: 'Pasta de origem nao encontrada',
        dica: 'Verifique se o servidor esta acessivel e o ano esta correto'
      });
      return;
    }
    
    // Verifica se pasta de destino existe
    if (!(await pastaExiste(pastaDestino))) {
      res.status(404).json({
        sucesso: false,
        erro: 'Pasta de destino nao encontrada',
        dica: 'Crie a pasta antes de processar'
      });
      return;
    }
    
    // Busca os PDFs (agora retorna tambem ignoradosPorTamanho)
    const { encontrados, naoEncontrados, ignoradosPorTamanho } = await buscarPdfs(pastaOrigem, numerosNotas);
    
    console.log(`[PROCESSAR] Encontrados: ${encontrados.length} | Nao encontrados: ${naoEncontrados.length} | Ignorados: ${ignoradosPorTamanho.length}`);
    
    // Deduplica PDFs por caminho completo (caso duas notas casem no mesmo arquivo)
    const pdfsUnicos = encontrados.filter((pdf, index, self) => 
      index === self.findIndex(p => p.caminhoCompleto === pdf.caminhoCompleto)
    );
    
    // Copia os PDFs encontrados COM NUMERACAO SEQUENCIAL
    const copiados: string[] = [];
    const erros: ErroCopiaPdf[] = [];
    let numeroSequencial = 1;
    
    for (const pdf of pdfsUnicos) {
      // Adiciona numeracao sequencial: 1- arquivo.pdf, 2- arquivo.pdf, etc.
      const nomeComNumeracao = `${numeroSequencial}- ${pdf.nomeArquivo}`;
      const destino = path.win32.join(pastaDestino, nomeComNumeracao);
      const resultadoCopia = await copiarArquivo(pdf.caminhoCompleto, destino);
      
      if (resultadoCopia.sucesso) {
        copiados.push(nomeComNumeracao);
        numeroSequencial++;
        console.log(`[PROCESSAR]   OK: ${nomeComNumeracao}`);
      } else {
        erros.push({
          arquivo: pdf.nomeArquivo,
          erro: resultadoCopia.erro || 'Erro desconhecido'
        });
        console.log(`[PROCESSAR]   ERRO: ${pdf.nomeArquivo} - ${resultadoCopia.erro}`);
      }
    }
    
    const tempoExecucao = Date.now() - inicio;
    console.log(`[PROCESSAR] Concluido em ${tempoExecucao}ms: ${copiados.length} copiados, ${erros.length} erros, ${ignoradosPorTamanho.length} ignorados`);
    
    // Sucesso = sem erros de copia (nao encontrados e ignorados sao reportados mas nao bloqueiam)
    const sucesso = erros.length === 0;
    
    res.json({
      sucesso,
      totalNotas: numerosNotas.length,
      totalEncontrados: encontrados.length,
      totalCopiados: copiados.length,
      totalErros: erros.length,
      totalNaoEncontrados: naoEncontrados.length,
      totalIgnorados: ignoradosPorTamanho.length,
      copiados,
      erros,
      naoEncontrados,
      ignoradosPorTamanho,
      tempoExecucaoMs: tempoExecucao
    });
    
  } catch (error) {
    console.error('[PROCESSAR] Erro:', error);
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro ao processar', 
      detalhes: String(error) 
    });
  }
});

router.post('/validar-pasta', async (req: Request, res: Response) => {
  try {
    // Valida payload
    const resultado = ValidarPastaRequestSchema.safeParse(req.body);
    
    if (!resultado.success) {
      res.status(400).json({ 
        sucesso: false, 
        erro: 'Dados invalidos', 
        detalhes: resultado.error.errors 
      });
      return;
    }
    
    const { ano, mes, dia } = resultado.data;
    const config = await carregarConfig();
    const caminho = montarCaminhoDestino(config, ano, mes, dia);
    
    const existe = await pastaExiste(caminho);
    const { vazia, quantidade } = existe ? await pastaVazia(caminho) : { vazia: true, quantidade: 0 };
    
    let mensagem = '';
    if (!existe) {
      mensagem = 'Pasta nao encontrada. Crie a pasta antes de continuar.';
    } else if (!vazia) {
      mensagem = `Pasta contem ${quantidade} arquivo(s). Recomenda-se usar pasta vazia.`;
    } else {
      mensagem = 'Pasta encontrada e vazia. Pronta para receber arquivos.';
    }
    
    res.json({
      sucesso: true,
      existe,
      vazia,
      quantidadeArquivos: quantidade,
      mensagem
    });
    
  } catch (error) {
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro ao validar pasta', 
      detalhes: String(error) 
    });
  }
});

export { router as copiarRoutes };