# Plataforma O Casal das Cifras: hospedagem gratuita

Páginas: `index.html` (início), `clientes.html` (cada cliente vê só o dele), `gestao.html` (só administração) e `importar.html` (uso único).
Custo: R$ 0 (GitHub Pages + Firebase no plano gratuito, sem cartão).

## Passo a passo (cerca de 20 minutos)

1. **Firebase.** Entre em https://console.firebase.google.com com a conta ocasaldascifras@gmail.com, clique em "Criar projeto" (nome: casal-das-cifras). Pode desligar o Google Analytics.
2. **Login.** Em Build > Authentication > "Vamos começar" > Google > Ativar. Escolha o e-mail de suporte e salve.
3. **Banco.** Em Build > Firestore Database > "Criar banco de dados" > modo produção > região `southamerica-east1` (São Paulo).
4. **Regras.** Na aba "Regras" do Firestore, apague tudo, cole o conteúdo de `firestore.rules` e clique em "Publicar". Se for incluir mais alguém na administração (Bruna), adicione o e-mail na função `isAdmin`.
5. **Configuração.** Em Configurações do projeto (engrenagem) > "Seus aplicativos" > ícone `</>` (Web) > registre o app. Copie o bloco `firebaseConfig` e cole os valores em `firebase-config.js`. Confira também `ADMIN_EMAILS`.
6. **GitHub.** Crie uma conta grátis em https://github.com, depois "New repository" (nome: cifras, público). Use "Add file > Upload files" e envie todos os arquivos desta pasta. Em Settings > Pages, escolha "Deploy from a branch", branch `main`, pasta `/ (root)` e salve. O endereço será `https://SEU-USUARIO.github.io/cifras/`.
7. **Domínio autorizado.** No Firebase, Authentication > Settings > Domínios autorizados > "Adicionar domínio": `SEU-USUARIO.github.io`.
8. **Dados iniciais.** Abra o endereço do site, entre com Google, clique em "Importar dados iniciais" e escolha o arquivo `seed-dados-iniciais.json` (ele não vai para o GitHub; fica só no seu computador).

## Como os clientes entram
Em Clientes, o botão "Acesso" guarda o(s) e-mail(s) Google do cliente. O cliente abre o site, clica em "Entrar com Google" e vê só os dados dele. Lucas e Natália já vêm com e-mails tirados dos convites de reunião; confirme com eles.

## Pré-lançamento automático
A cada mês (atual e próximo), tudo que está no orçamento do cliente vira lançamento "previsto". O cliente só toca em "✓ Pago", ou em "Marcar como pagos todos os vencidos até hoje". Se um item for excluído, ele não volta no mesmo mês.

## Segurança
- Quem protege os dados são as regras do Firestore, não o site. O código no GitHub é público, os dados não estão lá.
- Cliente só lê e grava dentro do próprio cadastro. Gestão, notas de sessão e regras são só da administração.
- Se `ADMIN_EMAILS` e `isAdmin` não estiverem iguais, a tela mostra o que não vale; as regras sempre valem.

## Limites do plano gratuito
50 mil leituras e 20 mil gravações por dia no Firestore, mais que suficiente para dezenas de clientes.


## Novidades (versão premium)
- **Início do cliente**: "Minha conta" (o que sobra depois das contas fixas), caixinhas do mês com emoji e % usado (toque para lançar um gasto) e gráfico de proximidade dos objetivos.
- **Meu kit**: Identificação, Mapeamento da queixa, Anamnese financeira, EPEF e Documentos. Cada cliente preenche e salva sozinho; você vê as respostas ao abrir o cliente. A pontuação da EPEF aparece só para você.
- **Lembretes**: você cria em "+ Lembrete" no Início do cliente; ele marca como feito.
- Suba também o arquivo `logo.webp` no GitHub, junto dos demais.

## Novidades: Fluxo de caixa e Agenda & Drive (Gestão)
- **Fluxo de caixa**: projeção de 6 meses (recebido, a vencer, em atraso), despesa estimada editável, resultado acumulado, atendimentos previstos e divisão sugerida do mês.
- **Agenda & Drive**: formulário que abre o Google Agenda já preenchido e registra o atendimento como "agendado"; link da pasta do Drive de cada cliente (campos novos em Contratos → Editar: e-mail e link da pasta).
- A criação direta do evento e a lista de arquivos do Drive dentro da página só funcionam na versão aberta no Claude (conectores Google Agenda/Drive).

## Aba "Meu negócio" (clientes autônomos)
Para ativar em um cliente, acrescente no documento dele em `clients/{id}` o campo `bizKind` com o valor `personal`, `psicologo` ou `geral`. O cliente passa a ver a aba com faturamento, custos (fixos e avulsos), cadastro de quem paga, meta e reserva de impostos. A administração vê a mesma aba abrindo o painel do cliente.
(Atualização: em Clientes > "Acesso", há agora o campo "Aba Meu negócio" para ativar por cliente, sem mexer no banco.)
