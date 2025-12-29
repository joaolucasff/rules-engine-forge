import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { validarPasta } from '@/services/api';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function parseIntSafe(v: string) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : NaN;
}

export const DateSelector: React.FC = () => {
  const backendOnline = useAppStore((s) => s.backendOnline);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const pastaValidation = useAppStore((s) => s.pastaValidation);

  const initial = useMemo(() => {
    const hoje = new Date();
    const init = selectedDate ?? {
      dia: hoje.getDate(),
      mes: hoje.getMonth() + 1,
      ano: hoje.getFullYear(),
    };

    return {
      dia: pad2(init.dia),
      mes: pad2(init.mes),
      ano: String(init.ano),
    };
  }, []);

  const [dia, setDia] = useState<string>(initial.dia);
  const [mes, setMes] = useState<string>(initial.mes);
  const [ano, setAno] = useState<string>(initial.ano);
  const [validando, setValidando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const clearValidationIfNeeded = () => {
    const st = useAppStore.getState();

    if (st.pastaValidation !== null) {
      st.setPastaValidation(null);
    }
    if (st.selectedDate !== null) {
      st.setSelectedDate(null);
    }
    if (erro !== null) {
      setErro(null);
    }
  };

  const handleDiaChange = (value: string) => {
    setDia(value);
    clearValidationIfNeeded();
  };

  const handleMesChange = (value: string) => {
    setMes(value);
    clearValidationIfNeeded();
  };

  const handleAnoChange = (value: string) => {
    setAno(value);
    clearValidationIfNeeded();
  };

  const handleValidar = async () => {
    if (!backendOnline || validando) return;

    const diaNum = parseIntSafe(dia);
    const mesNum = parseIntSafe(mes);
    const anoNum = parseIntSafe(ano);

    if (Number.isNaN(diaNum) || Number.isNaN(mesNum) || Number.isNaN(anoNum)) {
      setErro('Preencha todos os campos corretamente');
      return;
    }

    if (diaNum < 1 || diaNum > 31 || mesNum < 1 || mesNum > 12 || anoNum < 2020) {
      setErro('Data invalida');
      return;
    }

    const dataTest = new Date(anoNum, mesNum - 1, diaNum);
    if (
      dataTest.getFullYear() !== anoNum ||
      dataTest.getMonth() !== mesNum - 1 ||
      dataTest.getDate() !== diaNum
    ) {
      setErro('Data invalida (ex: 31/02 nao existe)');
      return;
    }

    setErro(null);
    setValidando(true);

    try {
      const resultado = await validarPasta(anoNum, mesNum, diaNum);

      const st = useAppStore.getState();
      st.setPastaValidation(resultado);

      if (resultado.existe) {
        st.setSelectedDate({ ano: anoNum, mes: mesNum, dia: diaNum });
      } else {
        st.setSelectedDate(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao validar pasta';
      setErro(msg);

      const st = useAppStore.getState();
      st.setPastaValidation(null);
      st.setSelectedDate(null);
    } finally {
      setValidando(false);
    }
  };

  const StatusIcon = () => {
    if (validando) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />;
    if (!pastaValidation) return <AlertCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
    if (pastaValidation.existe && pastaValidation.vazia) return <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />;
    if (pastaValidation.existe && !pastaValidation.vazia) return <AlertCircle className="h-5 w-5 text-amber-600" aria-hidden="true" />;
    return <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />;
  };

  const StatusBadge = () => {
    if (validando) return <Badge variant="secondary">Validando...</Badge>;
    if (!pastaValidation) return <Badge variant="outline">Aguardando validacao</Badge>;
    if (pastaValidation.existe && pastaValidation.vazia) {
      return <Badge className="bg-emerald-600 hover:bg-emerald-700">Pasta pronta</Badge>;
    }
    if (pastaValidation.existe && !pastaValidation.vazia) {
      return <Badge className="bg-amber-600 hover:bg-amber-700">Pasta com {pastaValidation.quantidadeArquivos} arquivo(s)</Badge>;
    }
    return <Badge variant="destructive">Pasta nao encontrada</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
            <CardTitle className="text-lg">Data do Fluxo de Caixa</CardTitle>
          </div>
          <StatusBadge />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!backendOnline && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg" role="alert">
            <p className="text-sm text-destructive">Backend offline. Inicie o servidor primeiro.</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="dia">Dia</Label>
            <Input
              id="dia"
              type="number"
              min="1"
              max="31"
              placeholder="DD"
              value={dia}
              onChange={(e) => handleDiaChange(e.target.value)}
              disabled={!backendOnline}
              aria-invalid={!!erro}
              aria-describedby={erro ? 'date-error' : undefined}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="mes">Mes</Label>
            <Input
              id="mes"
              type="number"
              min="1"
              max="12"
              placeholder="MM"
              value={mes}
              onChange={(e) => handleMesChange(e.target.value)}
              disabled={!backendOnline}
              aria-invalid={!!erro}
              aria-describedby={erro ? 'date-error' : undefined}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ano">Ano</Label>
            <Input
              id="ano"
              type="number"
              min="2020"
              max="2100"
              placeholder="AAAA"
              value={ano}
              onChange={(e) => handleAnoChange(e.target.value)}
              disabled={!backendOnline}
              aria-invalid={!!erro}
              aria-describedby={erro ? 'date-error' : undefined}
            />
          </div>
        </div>

        {erro && (
          <p id="date-error" className="text-sm text-destructive" role="alert">
            {erro}
          </p>
        )}

        {pastaValidation && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg" aria-live="polite">
            <StatusIcon />
            <span className="text-sm">{pastaValidation.mensagem}</span>
          </div>
        )}

        <Button onClick={handleValidar} disabled={!backendOnline || validando} className="w-full">
          {validando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Validando...
            </>
          ) : (
            'Validar Pasta de Destino'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};