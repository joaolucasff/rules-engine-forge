import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store/appStore';
import { NotaFiscal, ProcessingStatus } from '@/types';
import { formatarData, formatarValor } from '@/lib/excelParser';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  SkipForward, 
  Clock,
  Search,
  Eye,
  Filter
} from 'lucide-react';

const statusConfig: Record<ProcessingStatus, {
  icon: React.ReactNode;
  label: string;
  variant: 'success' | 'warning' | 'error' | 'skip' | 'info' | 'secondary';
}> = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    label: 'Pendente',
    variant: 'secondary'
  },
  processing: {
    icon: <Clock className="h-4 w-4 animate-spin" />,
    label: 'Processando',
    variant: 'info'
  },
  success: {
    icon: <CheckCircle className="h-4 w-4" />,
    label: 'Sucesso',
    variant: 'success'
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: 'Aviso',
    variant: 'warning'
  },
  error: {
    icon: <XCircle className="h-4 w-4" />,
    label: 'Erro',
    variant: 'error'
  },
  skipped: {
    icon: <SkipForward className="h-4 w-4" />,
    label: 'Ignorado',
    variant: 'skip'
  }
};

export function ResultsTable() {
  const { notas, processingState } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProcessingStatus | 'all'>('all');
  const [selectedNota, setSelectedNota] = useState<NotaFiscal | null>(null);

  if (notas.length === 0) {
    return null;
  }

  // Filter notas
  const filteredNotas = notas.filter(nota => {
    const matchesSearch = 
      nota.fornecedor.toLowerCase().includes(search.toLowerCase()) ||
      nota.numeroOriginal.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === 'all' || nota.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusFilters: (ProcessingStatus | 'all')[] = [
    'all', 'success', 'warning', 'error', 'skipped', 'pending'
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Resultados</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Filter className="h-4 w-4 text-muted-foreground ml-2" />
                {statusFilters.map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === 'all' ? 'Todos' : statusConfig[status].label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Valor</TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filteredNotas.map((nota, index) => {
                      const config = statusConfig[nota.status];
                      return (
                        <motion.tr
                          key={nota.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b last:border-0 hover:bg-muted/50"
                        >
                          <TableCell>
                            <Badge variant={config.variant} className="gap-1">
                              {config.icon}
                              <span className="hidden sm:inline">{config.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {nota.fornecedor.split('-').slice(1).join('-').trim() || nota.fornecedor}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {nota.numeroOriginal}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatarData(nota.dataVencimento)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right">
                            {formatarValor(nota.valor)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedNota(nota)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Exibindo {filteredNotas.length} de {notas.length} notas
          </p>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedNota} onOpenChange={() => setSelectedNota(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Nota</DialogTitle>
          </DialogHeader>
          {selectedNota && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">{selectedNota.fornecedor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[selectedNota.status].variant}>
                    {statusConfig[selectedNota.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Número Original</p>
                  <p className="font-mono">{selectedNota.numeroOriginal}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Número Normalizado</p>
                  <p className="font-mono">{selectedNota.numeroNormalizado}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Vencimento</p>
                  <p>{formatarData(selectedNota.dataVencimento)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-semibold">{formatarValor(selectedNota.valor)}</p>
                </div>
                {selectedNota.numeracao && (
                  <div>
                    <p className="text-sm text-muted-foreground">Numeração</p>
                    <p>{selectedNota.numeracao}</p>
                  </div>
                )}
                {selectedNota.pdfNomeDestino && (
                  <div>
                    <p className="text-sm text-muted-foreground">Nome Destino</p>
                    <p className="font-mono text-sm">{selectedNota.pdfNomeDestino}</p>
                  </div>
                )}
              </div>
              
              {selectedNota.mensagem && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Mensagem</p>
                  <p className="text-sm">{selectedNota.mensagem}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
