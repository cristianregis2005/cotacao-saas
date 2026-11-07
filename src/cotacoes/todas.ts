// Consulta as transportadoras com os tokens do próprio cliente.
// Se uma falhar ou não tiver token configurado, as outras continuam e a falha vira um aviso.
import type { Transportadora } from "../contas/tokens";
import { NOMES } from "../contas/tokens";
import type { EntradaFrete } from "../carriers/tipos";
import { cotarSuperFrete } from "../carriers/superfrete";
import { cotarFrenet } from "../carriers/frenet";
import { cotarMelhorEnvio } from "../carriers/melhorenvio";
import { cotarEnvia, type EnderecoEnvia } from "../carriers/envia";
import { motivoAmigavel } from "../erros";

export interface CotacaoUnificada {
  origem: "SuperFrete" | "Frenet" | "Melhor Envio" | "Envia";
  transportadora?: string;
  servico?: string;
  preco: number;
  prazoDias?: number;
  prazoTexto?: string;
  codigo?: string | number;              // código do serviço na transportadora (usado no carrinho)
  codigoTransportadora?: string | number;
  precoBase?: number;
}

export interface ResultadoCotacoes {
  cotacoes: CotacaoUnificada[];
  avisos: string[];
}

export type Credenciais = Partial<Record<Transportadora, { token: string; contato: string }>>;

const semToken = (t: Transportadora) =>
  new Error("Configure seu token da " + NOMES[t] + " em Minha conta.");

export interface ExtrasCotacao {
  enviaOrigem?: EnderecoEnvia | null; // cadastro do cliente
  enviaDestino?: EnderecoEnvia | null; // destinatário da nota fiscal
  enviaBase?: string; // endereço da API da Envia (sandbox ou produção)
  desligadas?: string[]; // transportadoras desligadas no painel do administrador (chaves: superfrete, frenet...)
}

// Nome exibido -> chave usada no painel do administrador.
export const CHAVE_DA_ORIGEM: Record<string, string> = {
  SuperFrete: "superfrete",
  Frenet: "frenet",
  "Melhor Envio": "melhorenvio",
  Envia: "envia",
};

export async function cotarTodas(
  entrada: EntradaFrete,
  credenciais: Credenciais,
  extras: ExtrasCotacao = {},
): Promise<ResultadoCotacoes> {
  const avisosEnvia: string[] = [];
  const tarefas: { nome: string; executar: () => Promise<CotacaoUnificada[]> }[] = [
    {
      nome: "SuperFrete",
      executar: async () => {
        const cred = credenciais.superfrete;
        if (!cred) throw semToken("superfrete");
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
          { token: cred.token, userAgent: "Comparador de Fretes (" + cred.contato + ")" },
        );
        return lista.map((c) => ({ origem: "SuperFrete", transportadora: c.transportadora, servico: c.servico, preco: c.preco, prazoDias: c.prazoDias, codigo: c.codigoServico }));
      },
    },
    {
      nome: "Frenet",
      executar: async () => {
        const cred = credenciais.frenet;
        if (!cred) throw semToken("frenet");
        const lista = await cotarFrenet(entrada, { token: cred.token });
        return lista.map((c) => ({ origem: "Frenet", transportadora: c.transportadora, servico: c.servico, preco: c.preco, prazoDias: c.prazoDias, codigo: c.codigoServico, codigoTransportadora: c.codigoTransportadora, precoBase: c.precoBase }));
      },
    },
    {
      nome: "Melhor Envio",
      executar: async () => {
        const cred = credenciais.melhorenvio;
        if (!cred) throw semToken("melhorenvio");
        const lista = await cotarMelhorEnvio(entrada, { token: cred.token, contato: cred.contato });
        return lista.map((c) => ({ origem: "Melhor Envio", transportadora: c.transportadora, servico: c.servico, preco: c.preco, prazoDias: c.prazoDias, codigo: c.codigoServico }));
      },
    },
    {
      nome: "Envia",
      executar: async () => {
        const cred = credenciais.envia;
        if (!cred) throw semToken("envia");
        if (!extras.enviaOrigem) throw new Error("Complete seu endereço de origem em Meus dados.");
        if (!extras.enviaDestino) throw new Error("Envie a nota fiscal para cotar na Envia. Ela traz o endereço do destinatário.");
        const r = await cotarEnvia(
          {
            origem: extras.enviaOrigem,
            destino: extras.enviaDestino,
            valor: entrada.valor,
            peso: entrada.peso,
            comprimento: entrada.comprimento,
            largura: entrada.largura,
            altura: entrada.altura,
          },
          {
            token: cred.token,
            base: extras.enviaBase,
            desligadas: (extras.desligadas ?? []).filter((k) => k.startsWith("envia:")).map((k) => k.slice(6)),
          },
        );
        avisosEnvia.push(...r.avisos);
        return r.cotacoes.map((c) => ({ origem: "Envia" as const, transportadora: c.transportadora, servico: c.servico, preco: c.preco, prazoDias: c.prazoDias, prazoTexto: c.prazoTexto, codigo: c.codigoServico, codigoTransportadora: c.codigoTransportadora }));
      },
    },
  ];

  const ativas = tarefas.filter((t) => !(extras.desligadas ?? []).includes(CHAVE_DA_ORIGEM[t.nome]));
  const resultados = await Promise.allSettled(ativas.map((t) => t.executar()));
  const cotacoes: CotacaoUnificada[] = [];
  const avisos: string[] = [];

  resultados.forEach((r, i) => {
    if (r.status === "fulfilled") {
      cotacoes.push(...r.value);
    } else {
      const motivo = r.reason instanceof Error ? r.reason.message : String(r.reason);
      console.log("[cotacao] " + ativas[i].nome + ": " + motivo);
      avisos.push(ativas[i].nome + ": " + motivoAmigavel(ativas[i].nome, motivo));
    }
  });

  avisos.push(...avisosEnvia);
  return { cotacoes: cotacoes.sort((a, b) => a.preco - b.preco), avisos };
}
