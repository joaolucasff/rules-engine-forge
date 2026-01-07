import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { ExcelUploader } from '@/components/ExcelUploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { verificarBackend, validarPastas, processarMultiplos } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import type { GrupoVencimentoAPI, ValidarPastasResponse, ProcessarMultiplosResponse, SecaoVencimento } from '@/types';
import {
  Wifi, WifiOff, Calendar, CheckCircle2, XCircle, AlertCircle, Loader2,
  Play, FileCheck, Clock, Ban, Search, FolderCheck, AlertTriangle
} from 'lucide-react';

// ==================== HELPERS ====================

/** Formata Date para ISO string local (evita problema de timezone) */
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Formata ISO string para exibicao DD/MM/YYYY */
function formatarDataExibicao(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Converte SecaoVencimento[] para GrupoVencimentoAPI[] */
function converterParaGruposAPI(secoes: SecaoVencimento[]): GrupoVencimentoAPI[] {
  return secoes
    .map(secao => ({
      dataVencimento: formatDateToISO(secao.dataVencimento),
      numerosNotas: secao.notas
        .filter(n => n.status !== 'skipped')
        .map(n => n.numeroNormalizado || n.numeroOriginal)
        .filter((v): v is string => Boolean(v))
    }))
    .filter(grupo => grupo.numerosNotas.length > 0);
}

/** Extrai datas unicas das secoes */
function extrairDatasISO(secoes: SecaoVencimento[]): string[] {
  return secoes.map(s => formatDateToISO(s.dataVencimento));
}

/** Verifica se ha multiplos meses/anos */
function verificarMultiplosMesesAnos(datasISO: string[]): { multiplos: boolean; mesesAnos: string[] } {
  const mesesAnos = [...new Set(datasISO.map(d => d.slice(0, 7)))]; // 'YYYY-MM'
  return {
    multiplos: mesesAnos.length > 1,
    mesesAnos: mesesAnos.map(ma => {
      const [ano, mes] = ma.split('-');
      return `${mes}/${ano}`;
    })
  };
}

// ==================== COMPONENTE ====================

const Index = () => {
  // Estado do backend
  const [backendOnline, setBackendOnline] = useState(false);
  const [checked, setChecked] = useState(false);

  // Estado de validacao e processamento
  const [validando, setValidando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Resultados
  const [pastasValidacao, setPastasValidacao] = useState<ValidarPastasResponse | null>(null);
  const [resultado, setResultado] = useState<ProcessarMultiplosResponse | null>(null);

  // Dados do Excel (do store)
  const excelData = useAppStore((s) => s.excelData);
  const secoes = excelData?.secoes ?? [];

  // Dados derivados
  const datasISO = extrairDatasISO(secoes);
  const gruposAPI = converterParaGruposAPI(secoes);
  const { multiplos: temMultiplosMeses, mesesAnos } = verificarMultiplosMesesAnos(datasISO);
  const totalNotas = secoes.reduce((sum, s) => sum + s.notas.filter(n => n.status !== 'skipped').length, 0);

  // Verificar backend ao montar
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
    return () => { mounted = false; };
  }, []);

  // Resetar estados quando trocar planilha
  useEffect(() => {
    setPastasValidacao(null);
    setResultado(null);
    setErro(null);
  }, [excelData]);

  // ==================== HANDLERS ====================

  const handleValidarPastas = async () => {
    if (!backendOnline || validando || datasISO.length === 0) return;

    setValidando(true);
    setErro(null);
    setPastasValidacao(null);

    try {
      const res = await validarPastas(datasISO);
      setPastasValidacao(res);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao validar pastas');
    } finally {
      setValidando(false);
    }
  };

  const handleProcessar = async () => {
    if (!backendOnline || processando || gruposAPI.length === 0) return;

    // Verifica se todas as pastas existem
    const pastasNaoExistem = pastasValidacao?.grupos.filter(g => !g.existe) ?? [];
    if (pastasNaoExistem.length > 0) {
      setErro(`Existem ${pastasNaoExistem.length} pasta(s) que nao existem. Crie-as antes de processar.`);
      return;
    }

    setProcessando(true);
    setErro(null);
    setResultado(null);

    try {
      const res = await processarMultiplos(gruposAPI);
      setResultado(res);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao processar');
    } finally {
      setProcessando(false);
    }
  };

  // ==================== CONDICOES ====================

  const podeValidar = backendOnline && !validando && !processando && datasISO.length > 0;
  const todasPastasOk = pastasValidacao?.grupos.every(g => g.existe) ?? false;
  const podeProcessar = backendOnline && !validando && !processando && gruposAPI.length > 0 && todasPastasOk;

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-6xl mx-auto px-4 pb-24 space-y-6">
        {/* Status do Backend */}
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

        {/* Upload de Planilha */}
        <ExcelUploader />

        {/* Resumo das Datas Detectadas */}
        {secoes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Datas Detectadas na Planilha</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Alerta de multiplos meses */}
              {temMultiplosMeses && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Atencao: Multiplos meses detectados</p>
                    <p className="text-xs text-amber-700">
                      Vencimentos em: {mesesAnos.join(', ')}. As pastas serao criadas nos meses/anos correspondentes.
                    </p>
                  </div>
                </div>
              )}

              {/* Lista de datas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {secoes.map((secao, index) => {
                  const dataISO = formatDateToISO(secao.dataVencimento);
                  const notasValidas = secao.notas.filter(n => n.status !== 'skipped').length;
                  const notasIgnoradas = secao.notas.filter(n => n.status === 'skipped').length;
                  const validacao = pastasValidacao?.grupos.find(g => g.dataVencimento === dataISO);

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        validacao?.existe
                          ? validacao.vazia
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-amber-50 border-amber-200'
                          : validacao
                            ? 'bg-red-50 border-red-200'
                            : 'bg-muted border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{formatarDataExibicao(dataISO)}</span>
                        {validacao && (
                          validacao.existe ? (
                            <CheckCircle2 className={`h-4 w-4 ${validacao.vazia ? 'text-emerald-600' : 'text-amber-600'}`} />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notasValidas} nota{notasValidas !== 1 ? 's' : ''}
                        {notasIgnoradas > 0 && (
                          <span className="text-orange-600"> ({notasIgnoradas} ignorada{notasIgnoradas !== 1 ? 's' : ''})</span>
                        )}
                      </p>
                      {validacao && !validacao.existe && (
                        <p className="text-xs text-red-600 mt-1">Pasta nao encontrada</p>
                      )}
                      {validacao && validacao.existe && !validacao.vazia && (
                        <p className="text-xs text-amber-600 mt-1">{validacao.quantidadeArquivos} arquivo(s) existente(s)</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Resumo total */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">
                  Total: <strong>{totalNotas}</strong> notas em <strong>{datasISO.length}</strong> dia(s)
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botoes de Acao */}
        {secoes.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Botao Validar Pastas */}
                <Button
                  onClick={handleValidarPastas}
                  disabled={!podeValidar}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  {validando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <FolderCheck className="h-4 w-4" />
                      Validar Pastas ({datasISO.length})
                    </>
                  )}
                </Button>

                {/* Botao Processar */}
                <Button
                  onClick={handleProcessar}
                  disabled={!podeProcessar}
                  size="lg"
                  className="flex-1 gap-2"
                >
                  {processando ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Processar ({totalNotas} notas)
                    </>
                  )}
                </Button>
              </div>

              {/* Mensagem de erro */}
              {erro && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{erro}</p>
                </div>
              )}

              {/* Aviso se pastas nao validadas */}
              {!pastasValidacao && secoes.length > 0 && !erro && (
                <p className="mt-3 text-sm text-muted-foreground text-center">
                  Clique em "Validar Pastas" antes de processar
                </p>
              )}
            </CardContent>
          </Card>
        )}

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
            <CardContent className="space-y-6">
              {/* Resumo Geral */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{resultado.resumo.totalGrupos}</div>
                  <div className="text-xs text-muted-foreground">Dias</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{resultado.resumo.totalNotas}</div>
                  <div className="text-xs text-muted-foreground">Notas</div>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{resultado.resumo.totalEncontrados}</div>
                  <div className="text-xs text-emerald-600">Encontrados</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{resultado.resumo.totalCopiados}</div>
                  <div className="text-xs text-blue-600">Copiados</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{resultado.resumo.totalNaoEncontrados}</div>
                  <div className="text-xs text-red-600">Nao Encontrados</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{resultado.resumo.totalIgnorados}</div>
                  <div className="text-xs text-orange-600">Ignorados</div>
                </div>
                <div className="text-center p-3 bg-violet-50 rounded-lg">
                  <div className="text-2xl font-bold text-violet-600 flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" />
                    {(resultado.tempoExecucaoMs / 1000).toFixed(1)}s
                  </div>
                  <div className="text-xs text-violet-600">Tempo</div>
                </div>
              </div>

              {/* Resultado por Dia */}
              <div className="space-y-4">
                <h4 className="font-semibold">Resultado por Dia</h4>
                {resultado.grupos.map((grupo, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{formatarDataExibicao(grupo.dataVencimento)}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="bg-blue-600">{grupo.totalCopiados} copiados</Badge>
                        {grupo.totalNaoEncontrados > 0 && (
                          <Badge variant="destructive">{grupo.totalNaoEncontrados} nao encontrados</Badge>
                        )}
                        {grupo.totalIgnorados > 0 && (
                          <Badge className="bg-orange-600">{grupo.totalIgnorados} ignorados</Badge>
                        )}
                      </div>
                    </div>

                    {/* PDFs Copiados */}
                    {grupo.copiados.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                          <FileCheck className="h-3 w-3" />
                          Copiados ({grupo.copiados.length})
                        </p>
                        <div className="max-h-24 overflow-y-auto bg-emerald-50/50 rounded p-2">
                          <ul className="space-y-0.5">
                            {grupo.copiados.map((arquivo, i) => (
                              <li key={i} className="text-xs font-mono text-emerald-800 truncate">{arquivo}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Nao Encontrados */}
                    {grupo.naoEncontrados.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-red-700 flex items-center gap-1">
                          <Search className="h-3 w-3" />
                          Nao Encontrados ({grupo.naoEncontrados.length})
                        </p>
                        <div className="max-h-24 overflow-y-auto bg-red-50/50 rounded p-2">
                          <ul className="space-y-0.5">
                            {grupo.naoEncontrados.map((nota, i) => (
                              <li key={i} className="text-xs font-mono text-red-800">{nota}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Ignorados por Tamanho */}
                    {grupo.ignoradosPorTamanho.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-orange-700 flex items-center gap-1">
                          <Ban className="h-3 w-3" />
                          Ignorados - Numero Curto ({grupo.ignoradosPorTamanho.length})
                        </p>
                        <div className="max-h-24 overflow-y-auto bg-orange-50/50 rounded p-2">
                          <ul className="space-y-0.5">
                            {grupo.ignoradosPorTamanho.map((nota, i) => (
                              <li key={i} className="text-xs font-mono text-orange-800">{nota}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Erros */}
                    {grupo.erros.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-red-700 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Erros ({grupo.erros.length})
                        </p>
                        <div className="max-h-24 overflow-y-auto bg-red-50/50 rounded p-2">
                          <ul className="space-y-0.5">
                            {grupo.erros.map((e, i) => (
                              <li key={i} className="text-xs font-mono text-red-800">{e.arquivo}: {e.erro}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Index;