import { Router, Request, Response } from 'express';
import { carregarConfig, montarCaminhoOrigem, buscarPdfs, pastaExiste, limparCachePdfs } from '../services/fileSystem.js';
import { BuscarPdfsRequestSchema } from '../types.js';

const router = Router();

router.post('/buscar', async (req: Request, res: Response) => {
  try {
    // Valida payload
    const resultado = BuscarPdfsRequestSchema.safeParse(req.body);
    
    if (!resultado.success) {
      res.status(400).json({ 
        sucesso: false, 
        erro: 'Dados invalidos', 
        detalhes: resultado.error.errors 
      });
      return;
    }
    
    const { numerosNotas, ano } = resultado.data;
    const config = await carregarConfig();
    const pastaOrigem = montarCaminhoOrigem(config, ano);
    
    console.log(`Buscando ${numerosNotas.length} notas em: ${pastaOrigem}`);
    
    // Verifica se pasta existe
    if (!(await pastaExiste(pastaOrigem))) {
      res.status(404).json({
        sucesso: false,
        erro: 'Pasta de origem nao encontrada',
        caminho: pastaOrigem,
        dica: 'Verifique se o servidor esta acessivel e se o ano esta correto'
      });
      return;
    }
    
    // Busca os PDFs
    const { encontrados, naoEncontrados } = await buscarPdfs(pastaOrigem, numerosNotas);
    
    console.log(`Encontrados: ${encontrados.length} | Nao encontrados: ${naoEncontrados.length}`);
    
    res.json({
      sucesso: true,
      encontrados,
      naoEncontrados,
      total: numerosNotas.length,
      totalEncontrados: encontrados.length,
      totalNaoEncontrados: naoEncontrados.length
    });
    
  } catch (error) {
    console.error('Erro ao buscar PDFs:', error);
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro ao buscar PDFs', 
      detalhes: String(error) 
    });
  }
});

router.post('/limpar-cache', async (req: Request, res: Response) => {
  try {
    limparCachePdfs();
    res.json({ 
      sucesso: true, 
      mensagem: 'Cache de PDFs limpo com sucesso' 
    });
  } catch (error) {
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro ao limpar cache', 
      detalhes: String(error) 
    });
  }
});

export { router as pdfRoutes };
