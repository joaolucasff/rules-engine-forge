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
import { z } from 'zod';

const router = Router();

// ==================== SCHEMAS ====================

const GrupoVencimentoSchema = z.object({
  dataVencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato deve ser YYYY-MM-DD'),
  numerosNotas: z.array(z.string().trim().min(1).max(50)).min(1).max(500)
});

const ProcessarMultiplosSchema = z.object({
  grupos: z.array(GrupoVencimentoSchema).min(1).max(31)
});

const ValidarPastasSchema = z.object({
  datasVencimento: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(31)
});

const ValidarPastaRequestSchema = z.object({
  ano: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  dia: z.coerce.number().int().min(1).max(31)
});

// ==================== HELPERS ====================

function parseDataISO(dataISO: string): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  return { ano, mes, dia };
}

// ==================== ROTAS NOVAS (MULTIPLOS DIAS) ====================

/**
 * POST /api/copiar/validar-pastas
 * Valida multiplas pastas de destino de uma vez
 */
router.post('/validar-pastas', async (req: Request, res: Response) => {
  try {
    const resultado = ValidarPastasSchema.safeParse(req.body);

    if (!resultado.success) {
      res.status(400).json({
        sucesso: false,
        erro: 'Dados invalidos',
        detalhes: resultado.error.errors
      });
      return;
    }

    const { datasVencimento } = resultado.data;
    const config = await carregarConfig();

    const grupos = await Promise.all(
      datasVencimento.map(async (dataISO) => {
        const { ano, mes, dia } = parseDataISO(dataISO);
        const pastaDestino = montarCaminhoDestino(config, ano, mes, dia);
        
        const existe = await pastaExiste(pastaDestino);
        const { vazia, quantidade } = existe 
          ? await pastaVazia(pastaDestino) 
          : { vazia: true, quantidade: 0 };

        return {
          dataVencimento: dataISO,
          pastaDestino,
          existe,
          vazia,
          quantidadeArquivos: quantidade
        };
      })
    );

    res.json({
      sucesso: true,
      grupos
    });

  } catch (error) {
    console.error('[VALIDAR-PASTAS] Erro:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao validar pastas',
      detalhes: String(error)
    });
  }
});

/**
 * POST /api/copiar/processar-multiplos
 * Processa multiplos grupos de notas, cada um para sua pasta de destino
 */
router.post('/processar-multiplos', async (req: Request, res: Response) => {
  const inicio = Date.now();

  try {
    const resultado = ProcessarMultiplosSchema.safeParse(req.body);

    if (!resultado.success) {
      res.status(400).json({
        sucesso: false,
        erro: 'Dados invalidos',
        detalhes: resultado.error.errors
      });
      return;
    }

    const { grupos } = resultado.data;
    const config = await carregarConfig();

    console.log(`[PROCESSAR-MULTIPLOS] Iniciando processamento de ${grupos.length} grupo(s)`);

    const resultadosGrupos = [];
    const resumoTotal = {
      totalGrupos: grupos.length,
      totalNotas: 0,
      totalEncontrados: 0,
      totalCopiados: 0,
      totalNaoEncontrados: 0,
      totalIgnorados: 0,
      totalErros: 0
    };

    for (const grupo of grupos) {
      const { ano, mes, dia } = parseDataISO(grupo.dataVencimento);
      const numerosNotas = [...new Set(grupo.numerosNotas)]; // Deduplica
      
      const pastaOrigem = montarCaminhoOrigem(config, ano);
      const pastaDestino = montarCaminhoDestino(config, ano, mes, dia);

      console.log(`[PROCESSAR-MULTIPLOS] Grupo ${grupo.dataVencimento}: ${numerosNotas.length} notas`);
      console.log(`[PROCESSAR-MULTIPLOS]   Origem: ${pastaOrigem}`);
      console.log(`[PROCESSAR-MULTIPLOS]   Destino: ${pastaDestino}`);

      // Verifica pasta de origem
      if (!(await pastaExiste(pastaOrigem))) {
        resultadosGrupos.push({
          dataVencimento: grupo.dataVencimento,
          pastaDestino,
          totalNotas: numerosNotas.length,
          totalEncontrados: 0,
          totalCopiados: 0,
          totalNaoEncontrados: numerosNotas.length,
          totalIgnorados: 0,
          totalErros: 1,
          copiados: [],
          naoEncontrados: numerosNotas,
          ignoradosPorTamanho: [],
          erros: [{ arquivo: 'N/A', erro: 'Pasta de origem nao encontrada' }]
        });
        resumoTotal.totalNotas += numerosNotas.length;
        resumoTotal.totalNaoEncontrados += numerosNotas.length;
        resumoTotal.totalErros += 1;
        continue;
      }

      // Verifica pasta de destino
      if (!(await pastaExiste(pastaDestino))) {
        resultadosGrupos.push({
          dataVencimento: grupo.dataVencimento,
          pastaDestino,
          totalNotas: numerosNotas.length,
          totalEncontrados: 0,
          totalCopiados: 0,
          totalNaoEncontrados: numerosNotas.length,
          totalIgnorados: 0,
          totalErros: 1,
          copiados: [],
          naoEncontrados: numerosNotas,
          ignoradosPorTamanho: [],
          erros: [{ arquivo: 'N/A', erro: 'Pasta de destino nao encontrada' }]
        });
        resumoTotal.totalNotas += numerosNotas.length;
        resumoTotal.totalNaoEncontrados += numerosNotas.length;
        resumoTotal.totalErros += 1;
        continue;
      }

      // Busca PDFs
      const { encontrados, naoEncontrados, ignoradosPorTamanho } = await buscarPdfs(pastaOrigem, numerosNotas);

      // Deduplica PDFs por caminho completo
      const pdfsUnicos = encontrados.filter((pdf, index, self) =>
        index === self.findIndex(p => p.caminhoCompleto === pdf.caminhoCompleto)
      );

      // Copia com numeracao sequencial
      const copiados: string[] = [];
      const erros: { arquivo: string; erro: string }[] = [];
      let numeroSequencial = 1;

      for (const pdf of pdfsUnicos) {
        const nomeComNumeracao = `${numeroSequencial}- ${pdf.nomeArquivo}`;
        const destino = path.win32.join(pastaDestino, nomeComNumeracao);
        const resultadoCopia = await copiarArquivo(pdf.caminhoCompleto, destino);

        if (resultadoCopia.sucesso) {
          copiados.push(nomeComNumeracao);
          numeroSequencial++;
        } else {
          erros.push({
            arquivo: pdf.nomeArquivo,
            erro: resultadoCopia.erro || 'Erro desconhecido'
          });
        }
      }

      const resultadoGrupo = {
        dataVencimento: grupo.dataVencimento,
        pastaDestino,
        totalNotas: numerosNotas.length,
        totalEncontrados: encontrados.length,
        totalCopiados: copiados.length,
        totalNaoEncontrados: naoEncontrados.length,
        totalIgnorados: ignoradosPorTamanho.length,
        totalErros: erros.length,
        copiados,
        naoEncontrados,
        ignoradosPorTamanho,
        erros
      };

      resultadosGrupos.push(resultadoGrupo);

      // Atualiza resumo total
      resumoTotal.totalNotas += numerosNotas.length;
      resumoTotal.totalEncontrados += encontrados.length;
      resumoTotal.totalCopiados += copiados.length;
      resumoTotal.totalNaoEncontrados += naoEncontrados.length;
      resumoTotal.totalIgnorados += ignoradosPorTamanho.length;
      resumoTotal.totalErros += erros.length;

      console.log(`[PROCESSAR-MULTIPLOS]   Resultado: ${copiados.length} copiados, ${naoEncontrados.length} nao encontrados, ${ignoradosPorTamanho.length} ignorados`);
    }

    const tempoExecucao = Date.now() - inicio;
    console.log(`[PROCESSAR-MULTIPLOS] Concluido em ${tempoExecucao}ms`);

    res.json({
      sucesso: resumoTotal.totalErros === 0,
      grupos: resultadosGrupos,
      resumo: resumoTotal,
      tempoExecucaoMs: tempoExecucao
    });

  } catch (error) {
    console.error('[PROCESSAR-MULTIPLOS] Erro:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao processar',
      detalhes: String(error)
    });
  }
});

// ==================== ROTAS LEGADAS (mantidas para compatibilidade) ====================

/** @deprecated Use /validar-pastas para multiplas datas */
router.post('/validar-pasta', async (req: Request, res: Response) => {
  try {
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