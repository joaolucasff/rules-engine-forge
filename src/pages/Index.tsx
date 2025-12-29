import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { ExcelUploader } from '@/components/ExcelUploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verificarBackend, validarPasta, processarECopiar } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import {
  Wifi, WifiOff, Calendar, CheckCircle2, XCircle, AlertCircle, Loader2,
  Play, FileCheck, Clock, Ban, Search
} from 'lucide-react';

const Index = () => {
  const [backendOnline, setBackendOnline] = useState(false);
  const [checked, setChecked] = useState(false);

  const [dia, setDia] = useState(() => String(new Date().getDate()).padStart(2, '0'));
  const [mes, setMes] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [ano, setAno] = useState(() => String(new Date().getFullYear()));
  const [validando, setValidando] = useState(false);
  const [pastaStatus, setPastaStatus] = useState<'idle' | 'ok' | 'warning' | 'error'>('idle');
  const [pastaMsg, setPastaMsg] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    totalNotas: number;
    totalEncontrados: number;
    totalCopiados: number;
    totalErros: number;
    totalNaoEncontrados: number;
    totalIgnorados: number;
    tempoMs: number;
    copiados: string[];
    naoEncontrados: string[];
    ignoradosPorTamanho: string[];
    erros: { arquivo: string; erro: string }[];
  } | null>(null);

  // AJUSTE 1: Garantir que notas sempre seja array
  const notasRaw = useAppStore((s) => s.notas);
  const notas = Array.isArray(notasRaw) ? notasRaw : [];

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const online = await verificarBackend();
      if (mounted) {
        setBackendOnline(online);
        setChecked(true);
      }
    };

    check();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (checked && !backendOnline) {
      setPastaStatus('idle');
      setPastaMsg('');
      setErro(null);
      setResultado(null);
    }
  }, [checked, backendOnline]);

  const resetPastaUI = () => {
    if (pastaStatus !== 'idle') setPastaStatus('idle');
    if (pastaMsg) setPastaMsg('');
    if (erro) setErro(null);
    if (resultado) setResultado(null);
  };

  const handleValidar = async () => {
    if (!backendOnline || validando) return;

    const diaNum = parseInt(dia, 10);
    const mesNum = parseInt(mes, 10);
    const anoNum = parseInt(ano, 10);

    if (isNaN(diaNum) || isNaN(mesNum) || isNaN(anoNum)) {
      setErro('Preencha todos os campos');
      return;
    }

    if (diaNum < 1 || diaNum > 31 || mesNum < 1 || mesNum > 12 || anoNum < 2020) {
      setErro('Data invalida');
      return;
    }

    const dataTest = new Date(anoNum, mesNum - 1, diaNum);
    if (dataTest.getDate() !== diaNum || dataTest.getMonth() !== mesNum - 1 || dataTest.getFullYear() !== anoNum) {
      setErro('Data invalida (ex: 31/02)');
      return;
    }

    setErro(null);
    setValidando(true);
    setPastaStatus('idle');
    setPastaMsg('');

    try {
      const result = await validarPasta(anoNum, mesNum, diaNum);
      setPastaMsg(result.mensagem);

      if (result.existe && result.vazia) {
        setPastaStatus('ok');
      } else if (result.existe && !result.vazia) {
        setPastaStatus('warning');
      } else {
        setPastaStatus('error');
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao validar');
      setPastaStatus('error');
    } finally {
      setValidando(false);
    }
  };

  const handleProcessar = async () => {
    if (!backendOnline || processando || validando) return;
    if (pastaStatus !== 'ok' && pastaStatus !== 'warning') {
      setErro('Valide a pasta de destino primeiro');
      return;
    }
    if (notas.length === 0) {
      setErro('Carregue uma planilha Excel primeiro');
      return;
    }

    const diaNum = parseInt(dia, 10);
    const mesNum = parseInt(mes, 10);
    const anoNum = parseInt(ano, 10);

    // Deduplicar notas antes de enviar
    const notasParaProcessar = notas.filter(n => n && n.status !== 'skipped');
    const numerosNotas = Array.from(new Set(
      notasParaProcessar
        .map(n => n.numeroNormalizado || n.numeroOriginal || '')
        .filter(Boolean)
    ));

    console.log('[DEBUG] Notas para processar:', notasParaProcessar.length);
    console.log('[DEBUG] Numeros enviados:', numerosNotas.slice(0, 5));

    if (numerosNotas.length === 0) {
      setErro('Nenhuma nota valida para processar');
      return;
    }

    setProcessando(true);
    setErro(null);
    setResultado(null);

    try {
      const res = await processarECopiar(numerosNotas, anoNum, mesNum, diaNum);

      // AJUSTE 2: Fallback consistente para totalIgnorados
      const ignorados = res.ignoradosPorTamanho || [];
      const errosArray = res.erros || [];

      setResultado({
        sucesso: res.sucesso,
        totalNotas: res.totalNotas,
        totalEncontrados: res.totalEncontrados,
        totalCopiados: res.totalCopiados,
        totalErros: res.totalErros ?? errosArray.length,
        totalNaoEncontrados: res.totalNaoEncontrados,
        totalIgnorados: res.totalIgnorados ?? ignorados.length,
        tempoMs: res.tempoExecucaoMs || 0,
        copiados: res.copiados || [],
        naoEncontrados: res.naoEncontrados || [],
        ignoradosPorTamanho: ignorados,
        erros: errosArray
      });
    } catch (err) {
      console.error('[DEBUG] Erro ao processar:', err);
      setErro(err instanceof Error ? err.message : 'Erro ao processar');
    } finally {
      setProcessando(false);
    }
  };

  const getStatusBadge = () => {
    if (validando) return <Badge variant="secondary">Validando...</Badge>;
    if (pastaStatus === 'idle') return <Badge variant="outline">Aguardando</Badge>;
    if (pastaStatus === 'ok') return <Badge className="bg-emerald-600">Pasta pronta</Badge>;
    if (pastaStatus === 'warning') return <Badge className="bg-amber-600">Pasta com arquivos</Badge>;
    return <Badge variant="destructive">Pasta nao encontrada</Badge>;
  };

  const getStatusIcon = () => {
    if (validando) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    if (pastaStatus === 'ok') return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    if (pastaStatus === 'warning') return <AlertCircle className="h-5 w-5 text-amber-600" />;
    if (pastaStatus === 'error') return <XCircle className="h-5 w-5 text-red-600" />;
    return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  };

  const podeProcessar =
    backendOnline &&
    !validando &&
    (pastaStatus === 'ok' || pastaStatus === 'warning') &&
    notas.length > 0 &&
    !processando;

  // AJUSTE OPCIONAL: inputsDesabilitados considera validando
  const inputsDesabilitados = !backendOnline || processando || validando;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-6xl mx-auto px-4 pb-24 space-y-6">
        <div className="flex justify-end">
          {checked && (
            backendOnline ? (
              <Badge className="bg-emerald-600">
                <Wifi className="h-3 w-3 mr-1" />
                Backend Online
              </Badge>
            ) : (
              <Badge variant="destructive">
                <WifiOff className="h-3 w-3 mr-1" />
                Backend Offline
              </Badge>
            )
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Data do Fluxo de Caixa</CardTitle>
                </div>
                {getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!backendOnline && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">Backend offline. Inicie o servidor.</p>
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
                    value={dia}
                    onChange={(e) => { setDia(e.target.value); resetPastaUI(); }}
                    disabled={inputsDesabilitados}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mes">Mes</Label>
                  <Input
                    id="mes"
                    type="number"
                    min="1"
                    max="12"
                    value={mes}
                    onChange={(e) => { setMes(e.target.value); resetPastaUI(); }}
                    disabled={inputsDesabilitados}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ano">Ano</Label>
                  <Input
                    id="ano"
                    type="number"
                    min="2020"
                    max="2100"
                    value={ano}
                    onChange={(e) => { setAno(e.target.value); resetPastaUI(); }}
                    disabled={inputsDesabilitados}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleValidar(); }}
                  />
                </div>
              </div>

              {erro && <p className="text-sm text-red-600">{erro}</p>}

              {pastaMsg && pastaStatus !== 'idle' && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  {getStatusIcon()}
                  <span className="text-sm">{pastaMsg}</span>
                </div>
              )}

              <Button onClick={handleValidar} disabled={inputsDesabilitados} className="w-full">
                {validando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  'Validar Pasta de Destino'
                )}
              </Button>
            </CardContent>
          </Card>

          <ExcelUploader />
        </div>

        {/* Botao Processar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Processar Notas Fiscais</h3>
                <p className="text-sm text-muted-foreground">
                  {notas.length > 0
                    ? `${notas.length} notas prontas para processar`
                    : 'Carregue uma planilha Excel primeiro'
                  }
                </p>
              </div>
              <Button
                onClick={handleProcessar}
                disabled={!podeProcessar}
                size="lg"
                className="gap-2"
              >
                {processando ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Processar
                  </>
                )}
              </Button>
            </div>

            {pastaStatus === 'warning' && notas.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  A pasta ja contem arquivos. Os novos PDFs serao adicionados junto aos existentes.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultado do Processamento */}
        {resultado && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {resultado.sucesso ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                )}
                Resultado do Processamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Estatisticas */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{resultado.totalNotas}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{resultado.totalEncontrados}</div>
                  <div className="text-xs text-emerald-600">Encontrados</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{resultado.totalCopiados}</div>
                  <div className="text-xs text-blue-600">Copiados</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{resultado.totalNaoEncontrados}</div>
                  <div className="text-xs text-red-600">Nao Encontrados</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{resultado.totalIgnorados}</div>
                  <div className="text-xs text-orange-600">Ignorados</div>
                </div>
                <div className="text-center p-3 bg-violet-50 rounded-lg">
                  <div className="text-2xl font-bold text-violet-600 flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" />
                    {(resultado.tempoMs / 1000).toFixed(1)}s
                  </div>
                  <div className="text-xs text-violet-600">Tempo</div>
                </div>
              </div>

              {/* Lista de PDFs Copiados */}
              {resultado.copiados.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-emerald-700">
                    <FileCheck className="h-4 w-4" />
                    PDFs Copiados ({resultado.copiados.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto border rounded-lg bg-emerald-50/50">
                    <ul className="p-2 space-y-1">
                      {resultado.copiados.map((arquivo, i) => (
                        <li key={i} className="text-xs font-mono text-emerald-800 truncate">
                          {arquivo}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Lista de Notas Nao Encontradas */}
              {resultado.naoEncontrados.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-red-700">
                    <Search className="h-4 w-4" />
                    Notas Nao Encontradas ({resultado.naoEncontrados.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto border rounded-lg bg-red-50/50">
                    <ul className="p-2 space-y-1">
                      {resultado.naoEncontrados.map((nota, i) => (
                        <li key={i} className="text-xs font-mono text-red-800">
                          {nota}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-red-600">
                    Essas notas nao foram encontradas na pasta de origem. Verifique se os PDFs existem.
                  </p>
                </div>
              )}

              {/* Lista de Notas Ignoradas (numero curto) */}
              {resultado.ignoradosPorTamanho.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-orange-700">
                    <Ban className="h-4 w-4" />
                    Notas Ignoradas - Numero Curto ({resultado.ignoradosPorTamanho.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto border rounded-lg bg-orange-50/50">
                    <ul className="p-2 space-y-1">
                      {resultado.ignoradosPorTamanho.map((nota, i) => (
                        <li key={i} className="text-xs font-mono text-orange-800">
                          {nota}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-orange-600">
                    Essas notas tem numero com menos de 4 digitos e foram ignoradas para evitar falsos positivos. 
                    Localize manualmente os PDFs correspondentes.
                  </p>
                </div>
              )}

              {/* Lista de Erros ao Copiar */}
              {resultado.erros.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-red-700">
                    <XCircle className="h-4 w-4" />
                    Erros ao Copiar ({resultado.erros.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto border rounded-lg bg-red-50/50">
                    <ul className="p-2 space-y-1">
                      {resultado.erros.map((e, i) => (
                        <li key={i} className="text-xs font-mono text-red-800">
                          {e.arquivo}: {e.erro}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Index;