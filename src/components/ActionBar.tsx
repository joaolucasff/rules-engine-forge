import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';
import { processarNotas, baixarZipOrganizado } from '@/lib/processor';
import { 
  Play, 
  Download, 
  RotateCcw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export function ActionBar() {
  const { 
    processingState, 
    setProcessingState,
    excelData, 
    pdfFiles, 
    notas,
    setProgress,
    setResult,
    addLog,
    updateNota,
    reset
  } = useAppStore();

  const canProcess = excelData && pdfFiles.length > 0 && 
    (processingState === 'idle' || processingState === 'ready');
  
  const isComplete = processingState === 'completed';

  const handleStartProcessing = async () => {
    if (!excelData || pdfFiles.length === 0) {
      toast.error('Configure todos os campos antes de iniciar');
      return;
    }

    setProcessingState('processing');
    
    addLog({
      timestamp: new Date(),
      level: 'info',
      message: 'Iniciando processamento...',
      details: `${notas.length} notas, ${pdfFiles.length} PDFs`
    });

    try {
      const result = await processarNotas(
        notas,
        pdfFiles,
        {
          onProgress: (current, total, nota) => {
            setProgress(current, total, nota);
          },
          onLog: (entry) => {
            addLog(entry);
          },
          onNotaProcessed: (nota) => {
            updateNota(nota.id, nota);
          }
        }
      );

      setResult(result);
      setProcessingState('completed');

      addLog({
        timestamp: new Date(),
        level: 'success',
        message: 'Processamento concluído!',
        details: `${result.success} sucesso, ${result.warnings} avisos, ${result.errors} erros, ${result.skipped} ignorados`
      });

      toast.success('Processamento concluído!', {
        description: `${result.success} notas processadas com sucesso`
      });

    } catch (error) {
      addLog({
        timestamp: new Date(),
        level: 'error',
        message: 'Erro no processamento',
        details: String(error)
      });
      
      toast.error('Erro durante o processamento', {
        description: String(error)
      });
      
      setProcessingState('ready');
    }
  };

  const handleDownload = async () => {
    try {
      await baixarZipOrganizado(notas);
      toast.success('Download iniciado!');
    } catch (error) {
      toast.error('Erro ao gerar ZIP', {
        description: String(error)
      });
    }
  };

  const handleReset = () => {
    reset();
    toast.info('Sistema reiniciado');
  };

  const successCount = notas.filter(n => n.status === 'success' || n.status === 'warning').length;
  const hasFilesToDownload = successCount > 0;

  return (
    <Card className="sticky bottom-4 shadow-elevated border-2">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            {!canProcess && processingState === 'idle' ? (
              <>
                <AlertCircle className="h-5 w-5 text-warning" />
                <span className="text-sm text-muted-foreground">
                  Carregue a planilha e os PDFs para iniciar
                </span>
              </>
            ) : isComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm text-success font-medium">
                  Processamento concluído! {hasFilesToDownload && `(${successCount} arquivos prontos)`}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm text-success font-medium">
                  Pronto para processar
                </span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isComplete ? (
              <>
                {hasFilesToDownload && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <Button
                      variant="success"
                      size="lg"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar ZIP Organizado
                    </Button>
                  </motion.div>
                )}
                <Button
                  variant="outline"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reiniciar
                </Button>
              </>
            ) : (
              <Button
                variant="hero"
                size="lg"
                disabled={!canProcess}
                onClick={handleStartProcessing}
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar Processamento
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
