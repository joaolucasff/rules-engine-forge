import { create } from 'zustand';
import { NotaFiscal, ExcelData, LogEntry, ProcessingResult } from '@/types';
import { ProcessarResponse, BuscarPdfsResponse, ValidarPastaResponse } from '@/services/api';

type ProcessingState = 'idle' | 'ready' | 'processing' | 'completed' | 'error';

interface SelectedDate {
  ano: number;
  mes: number;
  dia: number;
}

interface AppState {
  // Estado do backend
  backendOnline: boolean;
  setBackendOnline: (online: boolean) => void;
  
  // Estado de processamento
  processingState: ProcessingState;
  setProcessingState: (state: ProcessingState) => void;
  
  // Data selecionada para o fluxo
  selectedDate: SelectedDate | null;
  setSelectedDate: (date: SelectedDate | null) => void;
  
  // Arquivos Excel
  excelFiles: File[];
  addExcelFile: (file: File) => void;
  removeExcelFile: (file: File) => void;
  clearExcelFiles: () => void;
  
  // Dados extraidos do Excel
  excelData: ExcelData | null;
  setExcelData: (data: ExcelData | null) => void;
  
  // Notas fiscais extraidas
  notas: NotaFiscal[];
  setNotas: (notas: NotaFiscal[]) => void;
  updateNota: (id: string, updates: Partial<NotaFiscal>) => void;
  
  // Validacao da pasta de destino
  pastaValidation: ValidarPastaResponse | null;
  setPastaValidation: (validation: ValidarPastaResponse | null) => void;
  
  // Preview da busca (antes de copiar)
  preview: BuscarPdfsResponse | null;
  setPreview: (preview: BuscarPdfsResponse | null) => void;
  
  // Resultado do processamento
  resultado: ProcessarResponse | null;
  setResultado: (resultado: ProcessarResponse | null) => void;
  
  // Progresso
  progress: {
    current: number;
    total: number;
    message: string;
  };
  setProgress: (current: number, total: number, message: string) => void;
  
  // Logs
  logs: LogEntry[];
  addLog: (entry: LogEntry) => void;
  clearLogs: () => void;
  
  // Erro
  error: string | null;
  setError: (error: string | null) => void;
  
  // Reset
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Backend
  backendOnline: false,
  setBackendOnline: (online) => set({ backendOnline: online }),
  
  // Processamento
  processingState: 'idle',
  setProcessingState: (state) => set({ processingState: state }),
  
  // Data selecionada
  selectedDate: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
  
  // Excel
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
  
  // Notas
  notas: [],
  setNotas: (notas) => set({ notas }),
  updateNota: (id, updates) => set((state) => ({
    notas: state.notas.map(n => n.id === id ? { ...n, ...updates } : n)
  })),
  
  // Validacao pasta
  pastaValidation: null,
  setPastaValidation: (validation) => set({ pastaValidation: validation }),
  
  // Preview
  preview: null,
  setPreview: (preview) => set({ preview }),
  
  // Resultado
  resultado: null,
  setResultado: (resultado) => set({ resultado }),
  
  // Progresso
  progress: {
    current: 0,
    total: 0,
    message: ''
  },
  setProgress: (current, total, message) => set({
    progress: { current, total, message }
  }),
  
  // Logs
  logs: [],
  addLog: (entry) => set((state) => ({
    logs: [...state.logs, entry]
  })),
  clearLogs: () => set({ logs: [] }),
  
  // Erro
  error: null,
  setError: (error) => set({ error }),
  
  // Reset
  reset: () => set({
    processingState: 'idle',
    selectedDate: null,
    excelFiles: [],
    excelData: null,
    notas: [],
    pastaValidation: null,
    preview: null,
    resultado: null,
    progress: { current: 0, total: 0, message: '' },
    logs: [],
    error: null
  })
}));