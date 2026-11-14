// Termos de uso e política de privacidade. Páginas estáticas, sem dependências externas.
const DATA = "1º de novembro de 2026";
const EMAIL = "contato@cliquefrete.com.br";

const ESTILO = `
  :root { --fundo: #f6f7f9; --cartao: #ffffff; --texto: #1d2330; --suave: #5b6372; --borda: #d8dce3; --destaque: #2563eb; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --fundo: #0f1218; --cartao: #171c26; --texto: #e6e9ef; --suave: #9aa3b2; --borda: #2a3140; --destaque: #5b8cff; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fundo); color: var(--texto); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; }
  main { max-width: 760px; margin: 0 auto; padding: 16px; }
  a { color: var(--destaque); }
  h1 { font-size: 1.5rem; margin: 12px 0 4px; }
  h2 { font-size: 1.05rem; margin: 22px 0 6px; }
  .suave { color: var(--suave); font-size: 0.9rem; }
  .cartao { background: var(--cartao); border: 1px solid var(--borda); border-radius: 10px; padding: 8px 20px 20px; }
  p, li { font-size: 0.97rem; }
  ul { padding-left: 20px; }
  footer { margin: 20px 0; text-align: center; }
`;

function pagina(titulo: string, corpo: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo} · Clique Frete</title>
<link rel="icon" type="image/svg+xml" href="https://cliquefrete.com.br/assets/favicon.svg">
<style>${ESTILO}</style>
</head>
<body>
<main>
  <p><a href="/">← Voltar para as cotações</a></p>
  <div class="cartao">
  <h1>${titulo}</h1>
  <p class="suave">Última atualização: ${DATA}</p>
  ${corpo}
  </div>
  <footer class="suave">
    <a href="mailto:${EMAIL}">${EMAIL}</a><br>
    <a href="/termos">Termos de uso</a> · <a href="/privacidade">Política de privacidade</a>
  </footer>
</main>
</body>
</html>`;
}

const TERMOS_CORPO = `
<h2>1. Quem somos e o que é o serviço</h2>
<p>O Clique Frete é um serviço que permite comparar cotações de frete das transportadoras SuperFrete, Frenet e Melhor Envio, e enviar pedidos ao carrinho dessas transportadoras a partir de uma nota fiscal.</p>

<h2>2. Cadastro e acesso</h2>
<p>O acesso é feito por código de uso único enviado ao e-mail informado. Você é responsável pelo sigilo do seu e-mail e pelo uso da sua conta. Avise-nos imediatamente se suspeitar de acesso indevido.</p>

<h2>3. Tokens das transportadoras</h2>
<p>Para cotar e criar pedidos, você informa os tokens de acesso da sua conta em cada transportadora. Você declara que é o titular dessas contas ou que tem autorização para usá-las. Os tokens são guardados criptografados e usados somente para executar as ações que você pede no serviço. Se um token for exposto, troque-o na transportadora e atualize-o em Minha conta.</p>

<h2>4. Cotações e preços</h2>
<p>Os valores e prazos exibidos vêm das transportadoras e podem mudar a qualquer momento. Para a Frenet, o preço exibido inclui taxa de serviço de 3%. O Clique Frete não garante disponibilidade, prazo ou preço final de entrega.</p>

<h2>5. Envio ao carrinho</h2>
<ul>
  <li>Ao enviar uma nota ao carrinho, o pedido é criado na sua conta da transportadora, com status de aguardando pagamento.</li>
  <li>O pagamento do frete é feito diretamente na transportadora. O Clique Frete não cobra esse valor.</li>
  <li>Você é responsável pelos dados da nota, pelas medidas e pelo peso informados, e por conferir o pedido na transportadora antes de pagar.</li>
  <li>O Clique Frete não emite nota fiscal nem substitui a sua obrigação fiscal.</li>
</ul>

<h2>6. Planos e acesso</h2>
<p>O acesso gratuito dura 7 dias, com cotações ilimitadas durante o período. Cada e-mail e cada CPF/CNPJ tem direito a essa franquia uma única vez, inclusive depois da exclusão da conta. Planos pagos dão 30 dias de acesso, também sem limite de cotações. Os preços e as condições de cobrança serão informados antes de qualquer cobrança. Depois do período de acesso, é preciso escolher um plano para continuar cotando.</p>
<p>Você pode excluir sua conta a qualquer momento, em Minha conta.</p>

<h2>7. Uso adequado</h2>
<p>Você não deve usar o serviço para fins ilegais, para burlar limites, para tentar acessar contas de terceiros ou para prejudicar o funcionamento do sistema ou das transportadoras.</p>

<h2>8. Limitação de responsabilidade</h2>
<p>O serviço depende de sistemas de terceiros, como as próprias transportadoras, e pode ficar indisponível ou apresentar erros. Não nos responsabilizamos por atrasos, extravios, danos ou divergências de preço causados pelas transportadoras, nem por dados incorretos informados por você.</p>

<h2>9. Alterações</h2>
<p>Podemos alterar estes termos. Quando a mudança for relevante, avisaremos pelo e-mail cadastrado ou pelo próprio serviço. O uso continuado após o aviso significa que você concorda com a nova versão.</p>

<h2>10. Foro</h2>
<p>Estes termos são regidos pela legislação brasileira. Quando você for consumidor, vale o foro do seu domicílio, nos termos do Código de Defesa do Consumidor. Nos demais casos, fica eleito o foro da sede do Clique Frete.</p>

<h2>11. Contato</h2>
<p>Dúvidas sobre estes termos: <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
`;

const PRIVACIDADE_CORPO = `
<p>Esta política explica quais dados pessoais coletamos no Clique Frete, para que usamos e quais são seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).</p>

<h2>1. Quem é o responsável</h2>
<p>Os dados são tratados pelo Clique Frete. Para falar sobre privacidade, use o e-mail <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>

<h2>2. Dados que coletamos</h2>
<ul>
  <li><strong>Conta:</strong> e-mail, nome, empresa (opcional), CPF ou CNPJ, telefone e endereço de origem dos envios.</li>
  <li><strong>Tokens das transportadoras:</strong> guardados criptografados. Só os últimos 4 caracteres ficam visíveis.</li>
  <li><strong>Cotações:</strong> CEPs, peso, medidas e valor informados, e a data de cada cotação, para controle do limite do plano.</li>
  <li><strong>Notas fiscais enviadas ao carrinho:</strong> chave da nota, dados do remetente e do destinatário (nome, CPF ou CNPJ, telefone e endereço), valor e itens. Esses dados de terceiros vêm da nota que você envia, e você declara que tem base legal para usá-los.</li>
  <li><strong>Pedidos criados:</strong> identificação do pedido na transportadora, valor e data.</li>
  <li><strong>Registros de segurança:</strong> datas de acesso e ações administrativas, como troca de plano e de token.</li>
</ul>

<h2>3. Para que usamos</h2>
<ul>
  <li>Permitir o login, fazer cotações e criar pedidos no carrinho das transportadoras, a seu pedido.</li>
  <li>Controlar o prazo de acesso de cada conta (7 dias gratuitos ou 30 dias de plano pago).</li>
  <li>Preencher o endereço a partir do CEP, consultando o serviço ViaCEP.</li>
  <li>Garantir segurança, prevenir fraudes e manter registros de auditoria.</li>
  <li>Cumprir obrigações legais e responder a pedidos de autoridades competentes.</li>
</ul>

<h2>4. Com quem compartilhamos</h2>
<ul>
  <li><strong>Transportadoras</strong> (SuperFrete, Frenet e Melhor Envio): recebem os dados necessários para cotar e criar o pedido, somente quando você faz essas ações.</li>
</ul>
<p>Não vendemos dados pessoais.</p>

<h2>5. Por quanto tempo guardamos</h2>
<p>Mantemos os dados enquanto a conta estiver ativa. Quando você exclui a conta, apagamos seus dados pessoais, tokens, cotações e pedidos. Guardamos apenas um código criptografado (HMAC) do seu e-mail e do seu CPF/CNPJ, que não permite ler esses dados, para impedir o uso repetido da franquia gratuita. Essa base é o interesse legítimo de prevenir fraudes (art. 7º, IX, da LGPD). Dados que precisarmos manter por obrigação legal ou para defesa em processos também são preservados pelo tempo exigido.</p>

<h2>6. Segurança</h2>
<p>Usamos conexão criptografada (HTTPS). Os tokens das transportadoras são cifrados com AES-GCM. Os códigos de acesso são guardados só como hash e têm validade curta. O acesso administrativo é restrito e registrado.</p>

<h2>7. Cookies</h2>
<p>Usamos apenas um cookie de sessão, necessário para manter você conectado. Não usamos cookies de publicidade.</p>

<h2>8. Seus direitos</h2>
<p>Você pode pedir, a qualquer momento, confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação dos dados e informações sobre compartilhamento, conforme o art. 18 da LGPD. Para isso, escreva para <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>

<h2>9. Alterações</h2>
<p>Podemos atualizar esta política. Quando a mudança for relevante, avisaremos pelo e-mail cadastrado ou pelo próprio serviço.</p>
`;

export const TERMOS_HTML = pagina("Termos de uso", TERMOS_CORPO);
export const PRIVACIDADE_HTML = pagina("Política de privacidade", PRIVACIDADE_CORPO);
