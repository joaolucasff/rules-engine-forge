import { Router, Request, Response } from 'express';
import { carregarConfig, salvarConfig, detectarBasePath, detectarDrives, validarBasePath } from '../services/fileSystem.js';
import { ConfiguracaoSchema, BASES_PERMITIDAS } from '../types.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const config = await carregarConfig();
    const baseDetectada = await detectarBasePath();
    const drives = detectarDrives();
    
    res.json({ 
      sucesso: true, 
      config, 
      baseDetectada,
      drivesDisponiveis: drives,
      basesPermitidas: BASES_PERMITIDAS
    });
  } catch (error) {
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro ao carregar configuracoes', 
      detalhes: String(error) 
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    // Valida payload com zod
    const resultado = ConfiguracaoSchema.safeParse(req.body);
    
    if (!resultado.success) {
      res.status(400).json({ 
        sucesso: false, 
        erro: 'Dados invalidos', 
        detalhes: resultado.error.errors 
      });
      return;
    }
    
    const novaConfig = resultado.data;
    
    // Valida se basePath esta na allowlist
    if (!validarBasePath(novaConfig.basePath)) {
      res.status(403).json({ 
        sucesso: false, 
        erro: 'BasePath nao permitido',
        basesPermitidas: BASES_PERMITIDAS
      });
      return;
    }
    
    const sucesso = await salvarConfig(novaConfig);
    
    if (sucesso) {
      res.json({ 
        sucesso: true, 
        mensagem: 'Configuracoes salvas com sucesso', 
        config: novaConfig 
      });
    } else {
      res.status(500).json({ 
        sucesso: false, 
        erro: 'Erro ao salvar configuracoes' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro ao processar configuracoes', 
      detalhes: String(error) 
    });
  }
});

router.get('/detectar', async (req: Request, res: Response) => {
  try {
    const baseDetectada = await detectarBasePath();
    const drives = detectarDrives();
    
    res.json({
      sucesso: baseDetectada !== null,
      baseDetectada,
      drivesDisponiveis: drives,
      basesPermitidas: BASES_PERMITIDAS,
      mensagem: baseDetectada 
        ? `Base encontrada em: ${baseDetectada}` 
        : 'Nao foi possivel detectar a base automaticamente'
    });
  } catch (error) {
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro ao detectar base', 
      detalhes: String(error) 
    });
  }
});

export { router as configRoutes };
