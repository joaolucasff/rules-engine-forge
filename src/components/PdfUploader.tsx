import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/store/appStore';
import { toast } from 'sonner';

export function PdfUploader() {
  const { pdfFiles, addPdfFiles, removePdfFile, clearPdfFiles } = useAppStore();
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.name.toLowerCase().endsWith('.pdf')
    );
    
    if (files.length > 0) {
      addPdfFiles(files);
      toast.success(`${files.length} PDF(s) adicionado(s)`);
    } else {
      toast.error('Nenhum arquivo PDF encontrado');
    }
  }, [addPdfFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => 
      f.name.toLowerCase().endsWith('.pdf')
    );
    
    if (files.length > 0) {
      addPdfFiles(files);
      toast.success(`${files.length} PDF(s) adicionado(s)`);
    }
    
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [addPdfFiles]);

  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <FolderOpen className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">2. Arquivos PDF</h3>
              <p className="text-sm text-muted-foreground">PDFs das notas fiscais</p>
            </div>
          </div>
          {pdfFiles.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearPdfFiles}
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
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
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {pdfFiles.length === 0 ? (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-muted-foreground">
                Arraste os PDFs aqui ou <span className="text-primary font-medium">clique para selecionar</span>
              </p>
              <p className="text-xs text-muted-foreground/60">
                Selecione múltiplos arquivos PDF
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-success-light">
                <FileText className="h-6 w-6 text-success" />
              </div>
              <p className="font-medium text-success">
                {pdfFiles.length} PDF(s) carregado(s)
              </p>
              <p className="text-xs text-muted-foreground">
                Clique para adicionar mais
              </p>
            </div>
          )}
        </div>

        {pdfFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 max-h-48 overflow-y-auto scrollbar-thin"
          >
            <AnimatePresence>
              {pdfFiles.slice(0, 10).map((pdf, index) => (
                <motion.div
                  key={pdf.name + index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center justify-between py-2 px-3 hover:bg-muted rounded-lg group"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{pdf.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); removePdfFile(pdf); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </motion.div>
              ))}
              {pdfFiles.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{pdfFiles.length - 10} arquivos
                </p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
