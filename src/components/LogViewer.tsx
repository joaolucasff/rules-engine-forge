import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/store/appStore';
import { LogEntry } from '@/types';
import { baixarLog } from '@/lib/processor';
import { 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Download,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Bug
} from 'lucide-react';

const levelConfig: Record<LogEntry['level'], {
  icon: React.ReactNode;
  color: string;
  bg: string;
}> = {
  info: {
    icon: <Info className="h-3 w-3" />,
    color: 'text-info',
    bg: 'bg-info-light'
  },
  success: {
    icon: <CheckCircle className="h-3 w-3" />,
    color: 'text-success',
    bg: 'bg-success-light'
  },
  warning: {
    icon: <AlertTriangle className="h-3 w-3" />,
    color: 'text-warning',
    bg: 'bg-warning-light'
  },
  error: {
    icon: <XCircle className="h-3 w-3" />,
    color: 'text-destructive',
    bg: 'bg-destructive-light'
  },
  debug: {
    icon: <Bug className="h-3 w-3" />,
    color: 'text-muted-foreground',
    bg: 'bg-muted'
  }
};

export function LogViewer() {
  const { logs, processingState } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  if (logs.length === 0 || processingState === 'idle' || processingState === 'ready') {
    return null;
  }

  const filteredLogs = showDebug ? logs : logs.filter(l => l.level !== 'debug');

  return (
    <Card>
      <CardHeader className="py-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Log do Processamento</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {logs.length} entradas
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                baixarLog(logs);
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0">
              <div className="flex items-center justify-end mb-2">
                <Button
                  variant={showDebug ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  <Bug className="h-3 w-3 mr-1" />
                  Debug
                </Button>
              </div>
              
              <ScrollArea className="h-64 rounded-lg border bg-muted/30 p-3">
                <div className="space-y-1 font-mono text-xs">
                  <AnimatePresence mode="popLayout">
                    {filteredLogs.map((log, index) => {
                      const config = levelConfig[log.level];
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className={`flex items-start gap-2 p-1.5 rounded ${config.bg}`}
                        >
                          <span className={`flex-shrink-0 ${config.color}`}>
                            {config.icon}
                          </span>
                          <span className="text-muted-foreground flex-shrink-0">
                            {log.timestamp.toLocaleTimeString('pt-BR')}
                          </span>
                          <span className={`flex-shrink-0 uppercase ${config.color}`}>
                            [{log.level}]
                          </span>
                          <span className="text-foreground flex-1">
                            {log.message}
                          </span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
