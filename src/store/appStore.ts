import { create } from 'zustand';
import { NotaFiscal, ExcelData, LogEntry, ProcessingResult, PdfFile } from '@/types';

type ProcessingState = 'idle' | 'ready' | 'processing' | 'paused' | 'completed';

interface AppState {
  // Estado de processamento
  processingState: ProcessingState;
  setProcessingState: (state: ProcessingState) => void;
  
  // Arquivos Excel
  excelFiles: File[];
  addExcelFile: (file: File) => void;
  removeExcelFile: (file: File) => void;
  clearExcelFiles: () => void;
  
  // Dados extraídos do Excel
  excelData: ExcelData | null;
  setExcelData: (data: ExcelData | null) => void;
  
  // Arquivos PDF
  pdfFiles: PdfFile[];
  addPdfFiles: (files: File[]) => void;
  removePdfFile: (file: PdfFile) => void;
  clearPdfFiles: () => void;
  
  // Notas fiscais em processamento
  notas: NotaFiscal[];
  setNotas: (notas: NotaFiscal[]) => void;
  updateNota: (id: string, updates: Partial<NotaFiscal>) => void;
  
  // Progresso
  progress: {
    current: number;
    total: number;
    currentNota: NotaFiscal | null;
  };
  setProgress: (current: number, total: number, currentNota: NotaFiscal | null) => void;
  
  // Resultado do processamento
  result: ProcessingResult | null;
  setResult: (result: ProcessingResult | null) => void;
  
  // Logs
  logs: LogEntry[];
  addLog: (entry: LogEntry) => void;
  clearLogs: () => void;
  
  // Reset
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  processingState: 'idle',
  setProcessingState: (state) => set({ processingState: state }),
  
  excelFiles: [],
  addExcelFile: (file) => set((state) => ({ 
    excelFiles: [...state.excelFiles, file] 
  })),
  removeExcelFile: (file) => set((state) => ({
    excelFiles: state.excelFiles.filter(f => f !== file)
  })),
  clearExcelFiles: () => set({ excelFiles: [], excelData: null }),
  
  excelData: null,
  setExcelData: (data) => set({ excelData: data }),
  
  pdfFiles: [],
  addPdfFiles: (files) => set((state) => {
    const newPdfs: PdfFile[] = files.map(file => ({
      file,
      name: file.name,
      normalizedNumbers: []
    }));
    return { pdfFiles: [...state.pdfFiles, ...newPdfs] };
  }),
  removePdfFile: (pdf) => set((state) => ({
    pdfFiles: state.pdfFiles.filter(p => p !== pdf)
  })),
  clearPdfFiles: () => set({ pdfFiles: [] }),
  
  notas: [],
  setNotas: (notas) => set({ notas }),
  updateNota: (id, updates) => set((state) => ({
    notas: state.notas.map(n => n.id === id ? { ...n, ...updates } : n)
  })),
  
  progress: {
    current: 0,
    total: 0,
    currentNota: null
  },
  setProgress: (current, total, currentNota) => set({
    progress: { current, total, currentNota }
  }),
  
  result: null,
  setResult: (result) => set({ result }),
  
  logs: [],
  addLog: (entry) => set((state) => ({
    logs: [...state.logs, entry]
  })),
  clearLogs: () => set({ logs: [] }),
  
  reset: () => set({
    processingState: 'idle',
    excelFiles: [],
    excelData: null,
    pdfFiles: [],
    notas: [],
    progress: { current: 0, total: 0, currentNota: null },
    result: null,
    logs: []
  })
}));
