// Consulta todas as transportadoras configuradas ao mesmo tempo.
// Se uma falhar, as outras continuam e a falha vira um aviso.
import type { Env } from "../env";
import type { EntradaFrete } from "../carriers/tipos";
import { cotarSuperFrete } from "../carriers/superfrete";
import { cotarFrenet } from "../carriers/frenet";
import { cotarMelhorEnvio } from "../carriers/melhorenvio";

export interface CotacaoUnificada {
  origem: "SuperFrete" | "Frenet" | "Melhor Envio";
  transportadora?: string;
  servico?: string;
  preco: number;
  prazoDias?: number;
}

export interface ResultadoCotacoes {
  cotacoes: CotacaoUnificada[];
  avisos: string[];
}

const naoConfigurada = (nome: string) => new Error(`${nome} não está configurada neste ambiente.`);

export async function cotarTodas(entrada: EntradaFrete, env: Env): Promise<ResultadoCotacoes> {
  const tarefas: { nome: string; executar: () => Promise<CotacaoUnificada[]> }[] = [
    {
      nome: "SuperFrete",
      executar: async () => {
        if (!env.SUPERFRETE_TOKEN) throw naoConfigurada("SuperFrete");
        const lista = await cotarSuperFrete(
          {
            cepOrigem: entrada.cepOrigem,
            cepDestino: entrada.cepDestino,
            peso: entrada.peso,
            comprimento: entrada.comprimento,
            largura: entrada.largura,
            altura: entrada.altura,
            valorDeclarado: entrada.valor,
          },
          {
            token: env.SUPERFRETE_TOKEN,
            userAgent: env.SUPERFRETE_USER_AGENT ?? "cotacao-fretes/1.0 (contato@exemplo.com)",
          },
        );
        return lista.map((c) => ({ origem: "SuperFrete", transportadora: c.transportadora, servico: c.servico, preco: c.preco, prazoDias: c.prazoDias }));
      },
    },
    {
      nome: "Frenet",
      executar: async () => {
        if (!env.FRENET_TOKEN) throw naoConfigurada("Frenet");
        const lista = await cotarFrenet(entrada, { token: env.FRENET_TOKEN });
        return lista.map((c) => ({ origem: "Frenet", transportadora: c.transportadora, servico: c.servico, preco: c.preco, prazoDias: c.prazoDias }));
      },
    },
    {
      nome: "Melhor Envio",
      executar: async () => {
        if (!env.ME_TOKEN) throw naoConfigurada("Melhor Envio");
        const lista = await cotarMelhorEnvio(entrada, {
          token: env.ME_TOKEN,
          contato: env.ME_CONTACT ?? "contato@exemplo.com",
        });
        return lista.map((c) => ({ origem: "Melhor Envio", transportadora: c.transportadora, servico: c.servico, preco: c.preco, prazoDias: c.prazoDias }));
      },
    },
  ];

  const resultados = await Promise.allSettled(tarefas.map((t) => t.executar()));
  const cotacoes: CotacaoUnificada[] = [];
  const avisos: string[] = [];

  resultados.forEach((r, i) => {
    if (r.status === "fulfilled") {
      cotacoes.push(...r.value);
    } else {
      const motivo = r.reason instanceof Error ? r.reason.message : String(r.reason);
      avisos.push(`${tarefas[i].nome}: ${motivo}`);
    }
  });

  return { cotacoes: cotacoes.sort((a, b) => a.preco - b.preco), avisos };
}
