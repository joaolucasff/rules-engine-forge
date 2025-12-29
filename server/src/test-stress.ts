/**
 * TESTE DE ESTRESSE - Sistema de Automação de Fluxo de Caixa
 * 
 * Executa diversos cenários para validar a lógica de normalização e busca de PDFs
 * 
 * CATEGORIAS:
 * 1-9: Testes básicos de normalização
 * 10-15: Testes de casos especiais
 * 16-20: Normalização avançada
 * 21-25: Casos limite
 * 26-27: Performance
 * 28-30: Prevenção de falsos positivos
 */

import { buscarPdfs, carregarConfig, montarCaminhoOrigem, limparCachePdfs } from './services/fileSystem.js';

// Cores para o terminal
const VERDE = '\x1b[32m';
const VERMELHO = '\x1b[31m';
const AMARELO = '\x1b[33m';
const AZUL = '\x1b[34m';
const CIANO = '\x1b[36m';
const RESET = '\x1b[0m';

interface CasoTeste {
  nome: string;
  categoria: string;
  entrada: string[];
  esperado: {
    encontrados?: number;
    naoEncontrados?: number;
    ignorados?: number;
    minEncontrados?: number;
    maxEncontrados?: number;
    deveConter?: string[];
    naoDeveConter?: string[];
    deveIgnorar?: string[];
    tempoMaxMs?: number;
  };
}

// ==================== CASOS DE TESTE ====================

const casosTeste: CasoTeste[] = [
  // ============ CATEGORIA 1: TESTES BASICOS ============
  {
    nome: '1. Nota normal (6 digitos)',
    categoria: 'Basico',
    entrada: ['798541'],
    esperado: {
      encontrados: 1,
      ignorados: 0,
      deveConter: ['798541']
    }
  },
  {
    nome: '2. Nota com prefixo serie 300',
    categoria: 'Basico',
    entrada: ['3001351595'],
    esperado: {
      encontrados: 1,
      ignorados: 0
    }
  },
  {
    nome: '3. Nota com sufixo parcela -0',
    categoria: 'Basico',
    entrada: ['1351595-0'],
    esperado: {
      encontrados: 1,
      ignorados: 0
    }
  },
  {
    nome: '4. Nota curta 3 digitos (deve ignorar)',
    categoria: 'Basico',
    entrada: ['101'],
    esperado: {
      encontrados: 0,
      ignorados: 1,
      deveIgnorar: ['101']
    }
  },
  {
    nome: '5. Nota 001-001 (deve ignorar)',
    categoria: 'Basico',
    entrada: ['001-001'],
    esperado: {
      encontrados: 0,
      ignorados: 1,
      deveIgnorar: ['001-001']
    }
  },
  {
    nome: '6. Nota 101-1 (deve ignorar)',
    categoria: 'Basico',
    entrada: ['101-1'],
    esperado: {
      encontrados: 0,
      ignorados: 1,
      deveIgnorar: ['101-1']
    }
  },
  {
    nome: '7. Nota inexistente',
    categoria: 'Basico',
    entrada: ['9876543210'],
    esperado: {
      encontrados: 0,
      naoEncontrados: 1,
      ignorados: 0
    }
  },
  {
    nome: '8. Nota com prefixo DP-',
    categoria: 'Basico',
    entrada: ['DP-12345678'],
    esperado: {
      ignorados: 0
    }
  },
  {
    nome: '9. Nota com prefixo U-',
    categoria: 'Basico',
    entrada: ['U-0418425-1'],
    esperado: {
      encontrados: 1,
      ignorados: 0
    }
  },

  // ============ CATEGORIA 2: CASOS ESPECIAIS ============
  {
    nome: '10. Multiplas notas diferentes',
    categoria: 'Especial',
    entrada: ['798541', '769591', '778594'],
    esperado: {
      encontrados: 3,
      ignorados: 0
    }
  },
  {
    nome: '11. Mix validas + curtas',
    categoria: 'Especial',
    entrada: ['798541', '101-1', '769591', '001-001'],
    esperado: {
      encontrados: 2,
      ignorados: 2,
      deveIgnorar: ['101-1', '001-001']
    }
  },
  {
    nome: '12. Nota curta 3 digitos',
    categoria: 'Especial',
    entrada: ['192'],
    esperado: {
      encontrados: 0,
      ignorados: 1,
      deveIgnorar: ['192']
    }
  },
  {
    nome: '13. Nota com zeros a esquerda',
    categoria: 'Especial',
    entrada: ['00798541'],
    esperado: {
      encontrados: 1,
      ignorados: 0
    }
  },
  {
    nome: '14. Volume - 20 notas',
    categoria: 'Especial',
    entrada: [
      '798541', '769591', '778594', '467979', '191369',
      '801717', '421473', '25731', '2842175', '1347012',
      '1351595', '1351599', '1351601', '1351603', '1356251',
      '1356271', '1340855', '349645', '1241530', '1398948'
    ],
    esperado: {
      encontrados: 20,
      ignorados: 0
    }
  },
  {
    nome: '15. Nota so zeros (0000)',
    categoria: 'Especial',
    entrada: ['0000'],
    esperado: {
      ignorados: 1
    }
  },

  // ============ CATEGORIA 3: NORMALIZACAO AVANCADA ============
  {
    nome: '16. Prefixo FAT- com numero longo',
    categoria: 'Normalizacao',
    entrada: ['FAT-19229084310'],
    esperado: {
      ignorados: 0  // Tem 11 digitos, deve processar
    }
  },
  {
    nome: '17. Prefixo NF- com 6 digitos',
    categoria: 'Normalizacao',
    entrada: ['NF-123456'],
    esperado: {
      ignorados: 0  // Tem 6 digitos, deve processar
    }
  },
  {
    nome: '18. Sufixo parcela -001',
    categoria: 'Normalizacao',
    entrada: ['123456-001'],
    esperado: {
      ignorados: 0  // Remove -001, fica 123456 (6 digitos)
    }
  },
  {
    nome: '19. Sufixo parcela /02',
    categoria: 'Normalizacao',
    entrada: ['123456/02'],
    esperado: {
      ignorados: 0  // Remove /02, fica 123456 (6 digitos)
    }
  },
  {
    nome: '20. Nota mista letras e numeros',
    categoria: 'Normalizacao',
    entrada: ['ABC123456DEF'],
    esperado: {
      ignorados: 0  // Extrai 123456 (6 digitos)
    }
  },

  // ============ CATEGORIA 4: CASOS LIMITE ============
  {
    nome: '21. Exatamente 4 digitos (limite minimo)',
    categoria: 'Limite',
    entrada: ['1234'],
    esperado: {
      ignorados: 0,  // 4 digitos = processa
      naoEncontrados: 1
    }
  },
  {
    nome: '22. Exatamente 3 digitos (deve ignorar)',
    categoria: 'Limite',
    entrada: ['123'],
    esperado: {
      ignorados: 1,
      deveIgnorar: ['123']
    }
  },
  {
    nome: '23. String vazia',
    categoria: 'Limite',
    entrada: [''],
    esperado: {
      ignorados: 1  // String vazia deve ser ignorada
    }
  },
  {
    nome: '24. Somente letras',
    categoria: 'Limite',
    entrada: ['ABCDEF'],
    esperado: {
      ignorados: 1  // Sem numeros = ignora
    }
  },
  {
    nome: '25. Nota com espacos',
    categoria: 'Limite',
    entrada: ['  798541  '],
    esperado: {
      encontrados: 1,  // Trim deve funcionar
      ignorados: 0
    }
  },

  // ============ CATEGORIA 5: PERFORMANCE ============
  {
    nome: '26. Performance - 50 notas',
    categoria: 'Performance',
    entrada: Array.from({ length: 50 }, (_, i) => String(100000 + i)),
    esperado: {
      tempoMaxMs: 10000  // Maximo 10 segundos
    }
  },
  {
    nome: '27. Performance - 100 notas',
    categoria: 'Performance',
    entrada: Array.from({ length: 100 }, (_, i) => String(200000 + i)),
    esperado: {
      tempoMaxMs: 15000  // Maximo 15 segundos
    }
  },

  // ============ CATEGORIA 6: PREVENCAO FALSOS POSITIVOS ============
  {
    nome: '28. Nao pegar por data (2025)',
    categoria: 'FalsoPositivo',
    entrada: ['2025'],
    esperado: {
      // 2025 tem 4 digitos, vai processar mas nao deve achar PDF errado
      ignorados: 0
    }
  },
  {
    nome: '29. Nao pegar por valor monetario (101)',
    categoria: 'FalsoPositivo',
    entrada: ['101'],
    esperado: {
      encontrados: 0,
      ignorados: 1,  // 3 digitos = ignora (evita R$ 11.101,15)
      deveIgnorar: ['101']
    }
  },
  {
    nome: '30. Numero 1 isolado (deve ignorar)',
    categoria: 'FalsoPositivo',
    entrada: ['1'],
    esperado: {
      encontrados: 0,
      ignorados: 1,
      deveIgnorar: ['1']
    }
  }
];

// ==================== FUNCAO DE TESTE ====================

async function executarTeste(caso: CasoTeste, pastaOrigem: string): Promise<{ passou: boolean; detalhes: string; tempoMs: number }> {
  const inicio = Date.now();
  
  try {
    const resultado = await buscarPdfs(pastaOrigem, caso.entrada);
    const tempoMs = Date.now() - inicio;
    
    const erros: string[] = [];

    // Verifica tempo maximo
    if (caso.esperado.tempoMaxMs !== undefined) {
      if (tempoMs > caso.esperado.tempoMaxMs) {
        erros.push(`Tempo: ${tempoMs}ms excedeu limite de ${caso.esperado.tempoMaxMs}ms`);
      }
    }

    // Verifica quantidade de encontrados
    if (caso.esperado.encontrados !== undefined) {
      if (resultado.encontrados.length !== caso.esperado.encontrados) {
        erros.push(`Encontrados: esperado ${caso.esperado.encontrados}, recebido ${resultado.encontrados.length}`);
      }
    }

    // Verifica minimo de encontrados
    if (caso.esperado.minEncontrados !== undefined) {
      if (resultado.encontrados.length < caso.esperado.minEncontrados) {
        erros.push(`Encontrados: esperado minimo ${caso.esperado.minEncontrados}, recebido ${resultado.encontrados.length}`);
      }
    }

    // Verifica maximo de encontrados
    if (caso.esperado.maxEncontrados !== undefined) {
      if (resultado.encontrados.length > caso.esperado.maxEncontrados) {
        erros.push(`Encontrados: esperado maximo ${caso.esperado.maxEncontrados}, recebido ${resultado.encontrados.length}`);
      }
    }

    // Verifica quantidade de nao encontrados
    if (caso.esperado.naoEncontrados !== undefined) {
      if (resultado.naoEncontrados.length !== caso.esperado.naoEncontrados) {
        erros.push(`Nao encontrados: esperado ${caso.esperado.naoEncontrados}, recebido ${resultado.naoEncontrados.length}`);
      }
    }

    // Verifica quantidade de ignorados
    if (caso.esperado.ignorados !== undefined) {
      if (resultado.ignoradosPorTamanho.length !== caso.esperado.ignorados) {
        erros.push(`Ignorados: esperado ${caso.esperado.ignorados}, recebido ${resultado.ignoradosPorTamanho.length}`);
      }
    }

    // Verifica se notas especificas foram encontradas
    if (caso.esperado.deveConter) {
      for (const nota of caso.esperado.deveConter) {
        const achou = resultado.encontrados.some(e => e.numeroNota === nota);
        if (!achou) {
          erros.push(`Deveria encontrar "${nota}" mas nao encontrou`);
        }
      }
    }

    // Verifica se notas especificas NAO foram encontradas (falso positivo)
    if (caso.esperado.naoDeveConter) {
      for (const nota of caso.esperado.naoDeveConter) {
        const achou = resultado.encontrados.some(e => e.numeroNota === nota);
        if (achou) {
          erros.push(`NAO deveria encontrar "${nota}" mas encontrou (FALSO POSITIVO)`);
        }
      }
    }

    // Verifica se notas especificas foram ignoradas
    if (caso.esperado.deveIgnorar) {
      for (const nota of caso.esperado.deveIgnorar) {
        if (!resultado.ignoradosPorTamanho.includes(nota)) {
          erros.push(`Deveria ignorar "${nota}" mas nao ignorou`);
        }
      }
    }

    if (erros.length === 0) {
      return { passou: true, detalhes: 'OK', tempoMs };
    } else {
      return { passou: false, detalhes: erros.join('; '), tempoMs };
    }

  } catch (error) {
    const tempoMs = Date.now() - inicio;
    return { passou: false, detalhes: `ERRO: ${error}`, tempoMs };
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log(`${AZUL}  TESTE DE ESTRESSE - Automacao Fluxo de Caixa${RESET}`);
  console.log(`${CIANO}  ${casosTeste.length} cenarios de teste${RESET}`);
  console.log('='.repeat(70) + '\n');

  // Carrega configuracao
  const config = await carregarConfig();
  const pastaOrigem = montarCaminhoOrigem(config, 2025);
  
  console.log(`Pasta de origem: ${pastaOrigem}\n`);

  // Limpa cache para garantir teste limpo
  limparCachePdfs();

  let passou = 0;
  let falhou = 0;
  const inicio = Date.now();
  let categoriaAtual = '';

  const resultadosPorCategoria: { [key: string]: { passou: number; falhou: number } } = {};

  for (const caso of casosTeste) {
    // Cabecalho de categoria
    if (caso.categoria !== categoriaAtual) {
      categoriaAtual = caso.categoria;
      console.log(`\n${CIANO}--- ${categoriaAtual.toUpperCase()} ---${RESET}`);
      if (!resultadosPorCategoria[categoriaAtual]) {
        resultadosPorCategoria[categoriaAtual] = { passou: 0, falhou: 0 };
      }
    }

    const resultado = await executarTeste(caso, pastaOrigem);
    
    if (resultado.passou) {
      console.log(`${VERDE}[PASSOU]${RESET} ${caso.nome} ${AMARELO}(${resultado.tempoMs}ms)${RESET}`);
      passou++;
      resultadosPorCategoria[categoriaAtual].passou++;
    } else {
      console.log(`${VERMELHO}[FALHOU]${RESET} ${caso.nome} ${AMARELO}(${resultado.tempoMs}ms)${RESET}`);
      console.log(`         ${AMARELO}${resultado.detalhes}${RESET}`);
      falhou++;
      resultadosPorCategoria[categoriaAtual].falhou++;
    }
  }

  const tempoTotal = Date.now() - inicio;

  // Relatorio por categoria
  console.log('\n' + '='.repeat(70));
  console.log(`${AZUL}  RESULTADO POR CATEGORIA${RESET}`);
  console.log('='.repeat(70));
  for (const [categoria, resultado] of Object.entries(resultadosPorCategoria)) {
    const total = resultado.passou + resultado.falhou;
    const taxa = ((resultado.passou / total) * 100).toFixed(0);
    const cor = resultado.falhou === 0 ? VERDE : AMARELO;
    console.log(`  ${cor}${categoria}: ${resultado.passou}/${total} (${taxa}%)${RESET}`);
  }

  // Relatorio final
  console.log('\n' + '='.repeat(70));
  console.log(`${AZUL}  RESULTADO FINAL${RESET}`);
  console.log('='.repeat(70));
  console.log(`  ${VERDE}Passou: ${passou}${RESET}`);
  console.log(`  ${VERMELHO}Falhou: ${falhou}${RESET}`);
  console.log(`  Tempo total: ${(tempoTotal / 1000).toFixed(1)}s`);
  console.log(`  Taxa de sucesso: ${((passou / casosTeste.length) * 100).toFixed(1)}%`);
  
  if (falhou === 0) {
    console.log(`\n  ${VERDE}✓ TODOS OS TESTES PASSARAM!${RESET}`);
  } else {
    console.log(`\n  ${VERMELHO}✗ ${falhou} TESTE(S) FALHARAM${RESET}`);
  }
  
  console.log('='.repeat(70) + '\n');

  // Exit code baseado no resultado
  process.exit(falhou > 0 ? 1 : 0);
}

main().catch(console.error);