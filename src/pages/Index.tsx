import React from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { ExcelUploader } from '@/components/ExcelUploader';
import { PdfUploader } from '@/components/PdfUploader';
import { ProgressPanel } from '@/components/ProgressPanel';
import { ResultsTable } from '@/components/ResultsTable';
import { LogViewer } from '@/components/LogViewer';
import { ActionBar } from '@/components/ActionBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Shield, 
  Clock, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

const features = [
  {
    icon: <Clock className="h-5 w-5 text-info" />,
    title: 'Economia de Tempo',
    description: 'De 2+ horas para 5 minutos'
  },
  {
    icon: <Shield className="h-5 w-5 text-success" />,
    title: 'Seguro',
    description: 'Apenas copia, nunca move'
  },
  {
    icon: <CheckCircle2 className="h-5 w-5 text-accent" />,
    title: 'Automatizado',
    description: 'Numeração sequencial automática'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-6xl mx-auto px-4 pb-24 space-y-6">
        {/* Features */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="card-hover h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Upload Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <motion.div variants={itemVariants}>
            <ExcelUploader />
          </motion.div>
          <motion.div variants={itemVariants}>
            <PdfUploader />
          </motion.div>
        </motion.div>

        {/* How it works */}
        <motion.div variants={itemVariants}>
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-warning-light">
                  <Lightbulb className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">Como funciona</h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">1. Carregue a planilha Excel</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline">2. Carregue os PDFs</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline">3. Clique em Processar</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline">4. Baixe o ZIP organizado</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    O sistema normaliza números de notas, busca PDFs correspondentes, 
                    e organiza tudo em pastas por data de vencimento com numeração sequencial.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress Panel */}
        <ProgressPanel />

        {/* Results Table */}
        <ResultsTable />

        {/* Log Viewer */}
        <LogViewer />

        {/* Action Bar */}
        <ActionBar />
      </main>
    </div>
  );
};

export default Index;
