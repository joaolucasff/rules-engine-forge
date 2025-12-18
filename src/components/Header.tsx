import React from 'react';
import { motion } from 'framer-motion';
import { Zap, FileSpreadsheet, FolderOutput, FileCheck } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-gradient-hero text-primary-foreground py-8 px-6 mb-8">
      <div className="container max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-accent">
                <Zap className="h-6 w-6 text-accent-foreground" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Automação de Fluxo de Caixa
              </h1>
            </div>
            <p className="text-primary-foreground/80 text-sm md:text-base">
              Sistema de organização automática de notas fiscais
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-primary-foreground/70">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel</span>
            </div>
            <div className="text-primary-foreground/40">→</div>
            <div className="flex items-center gap-2 text-primary-foreground/70">
              <FolderOutput className="h-4 w-4" />
              <span>Processar</span>
            </div>
            <div className="text-primary-foreground/40">→</div>
            <div className="flex items-center gap-2 text-primary-foreground/70">
              <FileCheck className="h-4 w-4" />
              <span>Organizado</span>
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
