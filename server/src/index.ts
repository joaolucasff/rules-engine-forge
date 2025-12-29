import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { configRoutes } from './routes/config.js';
import { pdfRoutes } from './routes/pdfs.js';
import { copiarRoutes } from './routes/copiar.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Seguranca
app.use(helmet());

// CORS - apenas localhost
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:5000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4000',
    'http://127.0.0.1:5000'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));
// Parser JSON com limite
app.use(express.json({ limit: '1mb' }));

// Log de requisicoes
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Rotas
app.use('/api/config', configRoutes);
app.use('/api/pdfs', pdfRoutes);
app.use('/api/copiar', copiarRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    versao: '1.0.0'
  });
});

// Rota raiz - documentacao
app.get('/', (req, res) => {
  res.json({
    nome: 'Fluxo de Caixa - Backend API',
    versao: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      config: {
        obter: 'GET /api/config',
        salvar: 'POST /api/config',
        detectar: 'GET /api/config/detectar'
      },
      pdfs: {
        buscar: 'POST /api/pdfs/buscar',
        limparCache: 'POST /api/pdfs/limpar-cache'
      },
      copiar: {
        executar: 'POST /api/copiar',
        validarPasta: 'POST /api/copiar/validar-pasta'
      }
    }
  });
});

// Erro 404
app.use((req, res) => {
  res.status(404).json({ 
    sucesso: false, 
    erro: 'Endpoint nao encontrado' 
  });
});

// Tratamento de erros global
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro nao tratado:', err);
  res.status(500).json({
    sucesso: false,
    erro: 'Erro interno do servidor'
  });
});

// Inicia servidor
app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('   FLUXO DE CAIXA - BACKEND API');
  console.log('========================================');
  console.log(`   Servidor: http://localhost:${PORT}`);
  console.log('========================================');
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /api/health          - Status');
  console.log('  GET  /api/config          - Obter config');
  console.log('  POST /api/config          - Salvar config');
  console.log('  GET  /api/config/detectar - Detectar base');
  console.log('  POST /api/pdfs/buscar     - Buscar PDFs');
  console.log('  POST /api/pdfs/limpar-cache - Limpar cache');
  console.log('  POST /api/copiar          - Copiar PDFs');
  console.log('  POST /api/copiar/validar-pasta - Validar pasta');
  console.log('');
  console.log('Aguardando requisicoes...');
  console.log('');
});
