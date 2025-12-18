import React from 'react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/appStore';
import { CheckCircle, AlertTriangle, XCircle, SkipForward, Loader2 } from 'lucide-react';

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant: 'success' | 'warning' | 'error' | 'skip';
}

function StatItem({ icon, label, value, variant }: StatItemProps) {
  const bgColors = {
    success: 'bg-success-light',
    warning: 'bg-warning-light',
    error: 'bg-destructive-light',
    skip: 'bg-skip-light'
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${bgColors[variant]}`}>
      {icon}
      <span className="text-sm font-medium">{label}:</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}

export function ProgressPanel() {
  const { processingState, progress, result } = useAppStore();

  if (processingState === 'idle' || processingState === 'ready') {
    return null;
  }

  const percentage = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  const isComplete = processingState === 'completed';
  
  // Determine progress bar variant
  let progressVariant: 'default' | 'success' | 'warning' | 'error' = 'default';
  if (isComplete && result) {
    if (result.errors > 0) progressVariant = 'error';
    else if (result.warnings > 0) progressVariant = 'warning';
    else progressVariant = 'success';
  }

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 ${isComplete ? 'bg-success' : 'bg-gradient-primary'}`} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {!isComplete && (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            )}
            <div>
              <h3 className="font-semibold text-foreground">
                {isComplete ? 'Processamento Concluído' : 'Processando...'}
              </h3>
              {progress.currentNota && !isComplete && (
                <p className="text-sm text-muted-foreground">
                  {progress.currentNota.fornecedor}
                </p>
              )}
            </div>
          </div>
          <Badge variant={isComplete ? 'success' : 'info'}>
            {percentage}%
          </Badge>
        </div>

        <Progress 
          value={percentage} 
          className="mb-4" 
          variant={progressVariant}
          animated={!isComplete}
        />

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <StatItem
            icon={<CheckCircle className="h-4 w-4 text-success" />}
            label="Sucesso"
            value={result?.success || 0}
            variant="success"
          />
          <StatItem
            icon={<AlertTriangle className="h-4 w-4 text-warning" />}
            label="Avisos"
            value={result?.warnings || 0}
            variant="warning"
          />
          <StatItem
            icon={<XCircle className="h-4 w-4 text-destructive" />}
            label="Erros"
            value={result?.errors || 0}
            variant="error"
          />
          <StatItem
            icon={<SkipForward className="h-4 w-4 text-skip" />}
            label="Ignorados"
            value={result?.skipped || 0}
            variant="skip"
          />
        </motion.div>

        {!isComplete && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Processando {progress.current} de {progress.total} notas...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
