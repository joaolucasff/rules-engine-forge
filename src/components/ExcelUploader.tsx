import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/appStore';
import { parseExcelFile, formatarData } from '@/lib/excelParser';
import { toast } from 'sonner';

export function ExcelUploader() {
  const { excelFiles, addExcelFile, removeExcelFile, setExcelData, excelData, setNotas } = useAppStore();
  const [isDragging, setIsDragging] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const data = await parseExcelFile(file);
      setExcelData(data);
      
      // Flatten all notas from all sections
      const todasNotas = data.secoes.flatMap(s => s.notas);
      setNotas(todasNotas);
      
      toast.success(`Planilha carregada com sucesso!`, {
        description: `${data.totalNotas} notas em ${data.datasEncontradas.length} data(s) de vencimento`
      });
    } catch (error) {
      toast.error('Erro ao processar planilha', {
        description: String(error)
      });
    } finally {
      setIsProcessing(false);
    }
  }, [setExcelData, setNotas]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(f => 
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    
    if (excelFile) {
      addExcelFile(excelFile);
      processFile(excelFile);
    } else {
      toast.error('Arquivo inválido', {
        description: 'Por favor, selecione um arquivo Excel (.xlsx ou .xls)'
      });
    }
  }, [addExcelFile, processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      addExcelFile(file);
      processFile(file);
    }
  }, [addExcelFile, processFile]);

  const handleRemove = useCallback((file: File) => {
    removeExcelFile(file);
    setExcelData(null);
    setNotas([]);
  }, [removeExcelFile, setExcelData, setNotas]);

  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">1. Planilha Excel</h3>
            <p className="text-sm text-muted-foreground">Arquivo com notas fiscais do ERP</p>
          </div>
        </div>

        <div
          className={`dropzone cursor-pointer ${isDragging ? 'dropzone-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">Processando planilha...</p>
            </div>
          ) : excelFiles.length === 0 ? (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-muted-foreground">
                Arraste a planilha aqui ou <span className="text-primary font-medium">clique para selecionar</span>
              </p>
              <p className="text-xs text-muted-foreground/60">
                Formatos aceitos: .xlsx, .xls
              </p>
            </div>
          ) : (
            <div className="text-left w-full">
              <AnimatePresence>
                {excelFiles.map((file, index) => (
                  <motion.div
                    key={file.name + index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-between p-3 bg-success-light rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5 text-success" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleRemove(file); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {excelData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-4 bg-muted rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Datas encontradas:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {excelData.datasEncontradas.map((data, index) => (
                <Badge key={index} variant="info">
                  {formatarData(data)}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total: {excelData.totalNotas} notas fiscais
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
