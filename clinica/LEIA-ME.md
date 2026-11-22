# Meu Consultório: plataforma gratuita para consultórios

Plataforma para psicólogas(os) e outros profissionais de saúde que atendem em consultório. Cada profissional cria a própria conta e passa a ter:

| O que | Como funciona |
|---|---|
| **Consultório on-line** | Página com link próprio (`agendar.html?u=seu-nome`). O paciente vê os horários livres e marca sozinho. Sessão on-line já sai com sala de vídeo (Jitsi, grátis) ou com o seu link fixo (Meet, Zoom). |
| **Evolução ditada** | Ao fim da sessão, toque em "Ditar evolução" e fale. O texto fica pronto para revisar e **assinar**. Depois de assinada não se edita mais: correções viram *adendo*, como pede a boa prática do registro documental. |
| **Documentos em PDF com timbre** | Declaração de comparecimento, declaração de acompanhamento, atestado, relatório psicológico (estrutura da Resolução CFP nº 06/2019) e documento livre, já preenchidos com os dados do paciente. Logotipo e cor do timbre configuráveis. |
| **Agenda** | Sessões avulsas ou recorrentes (semanal/quinzenal), bloqueio de horários e férias, confirmação pelo WhatsApp com link para o paciente confirmar ou desmarcar, registro de faltas. |
| **Financeiro** | Ao marcar a sessão como realizada, a cobrança entra sozinha. PIX com QR Code e "copia e cola" (o dinheiro cai direto na conta do profissional), recibo em PDF com valor por extenso, planilha mensal para o contador. |
| **Sigilo** | Cada conta só enxerga os próprios pacientes. Além disso, **tudo de paciente é cifrado no aparelho** com uma frase secreta que só o profissional sabe. Nem a administração do sistema consegue ler prontuário. |

**Custo: R$ 0.** GitHub Pages + Firebase no plano gratuito. Sem mensalidade e sem comissão.

---

## Instalação (cerca de 20 minutos, uma única vez)

Use um **projeto Firebase separado** do Casal das Cifras: são dados de outras pessoas, com regras diferentes.

1. **Projeto.** Em https://console.firebase.google.com, clique em "Criar projeto" (ex.: `meu-consultorio`). Pode desligar o Google Analytics.
2. **Login.** Build > Authentication > "Vamos começar" > Google > Ativar > escolha o e-mail de suporte > Salvar.
3. **Banco.** Build > Firestore Database > "Criar banco de dados" > modo produção > região `southamerica-east1` (São Paulo). Na aba **Regras**, apague tudo, cole o conteúdo de `firestore.rules` e clique em **Publicar**.
4. **Configuração.** Engrenagem > Configurações do projeto > "Seus aplicativos" > ícone `</>` (Web) > registre o app. Copie os valores do bloco `firebaseConfig` para `firebase-config.js`. Ali também dá para trocar o nome que aparece no topo (`APP_NAME`).
5. **Publicação.** Suba a pasta `clinica/` no GitHub (este repositório já serve: em Settings > Pages, "Deploy from a branch", `main`, pasta `/ (root)`). O painel fica em `https://SEU-USUARIO.github.io/cifras/clinica/`.
6. **Domínio autorizado.** No Firebase: Authentication > Settings > Domínios autorizados > Adicionar `SEU-USUARIO.github.io`.

Pronto. Qualquer profissional entra pelo endereço do painel com a conta Google e cria o próprio consultório.

## Primeiro acesso do profissional

1. Entrar com Google.
2. Criar a **frase secreta** (não é a senha do Google) e **guardar o código de recuperação**. Sem a frase e sem o código, os dados não podem ser recuperados por ninguém.
3. Em **Consultório**: nome, registro (ex.: "Psicóloga · CRP 06/123456"), cidade, valor da sessão, logotipo.
4. Criar a **página de agendamento**: escolher o endereço, horários de atendimento por dia, duração e antecedência mínima. Copiar o link e colocar na bio do Instagram, no WhatsApp Business, no Google Meu Negócio.
5. Cadastrar a **chave PIX**.

## Como o sigilo funciona (para explicar a quem perguntar)

- **Duas camadas.** (1) As regras do banco só deixam cada conta ler o próprio consultório. (2) Mesmo assim, o que vai para o banco já sai **cifrado do aparelho** (AES-256-GCM, chave derivada da frase secreta com PBKDF2 de 600 mil rodadas). Quem administra o Firebase só vê texto embaralhado.
- **Pedido do paciente.** Nome, telefone e recado de quem agenda pela página são cifrados no celular do paciente com a chave pública do profissional (RSA-OAEP). Só o aparelho do profissional, destrancado, consegue ler.
- **O que fica visível para a administração:** o nome e os dados públicos da página de cada profissional, os horários ocupados (só início e duração, sem nomes), a chave PIX e o timbre do profissional, e a quantidade de registros. Nenhum conteúdo de paciente.
- **Trancamento.** O painel tranca sozinho após 10 a 60 minutos parado (configurável) e no botão "Trancar".
- **Assinatura.** "Assinar" registra data, hora, autor e um código de integridade (SHA-256) e trava o texto. **Não é assinatura digital ICP-Brasil.** Para documentos que exigem isso, gere o PDF e assine grátis pelo gov.br (assinador.iti.br).
- **Ditado.** O áudio não é gravado pelo sistema, mas o reconhecimento de voz é feito pelo navegador: no Chrome/Android passa pelos servidores do Google e no iPhone pelos da Apple. Quem preferir pode digitar ou usar o microfone do teclado.

## Limites e cuidados (leia antes de divulgar)

- **Plano gratuito do Firebase:** 50 mil leituras e 20 mil gravações por dia. Cada vez que o profissional abre o painel, todos os registros dele são lidos. Na prática dá para algumas dezenas de profissionais ativos. Acima disso, ative o plano Blaze (paga só o excedente, centavos por 100 mil leituras) e configure um alerta de orçamento.
- **Frase perdida = dados perdidos.** É o preço do "nem a administração lê". Reforce o código de recuperação e o botão "Baixar cópia dos meus dados".
- **Guarda do prontuário:** o CFP exige guarda do registro documental por no mínimo 5 anos. Pacientes encerrados são *arquivados*, não apagados.
- **Página pública e abuso:** qualquer pessoa pode pedir horário. Se alguém lotar a agenda de pedidos falsos, basta recusar (o horário volta). Se virar problema recorrente, ative o Firebase App Check.
- **Recibo:** profissionais de saúde pessoa física devem emitir o recibo oficial pelo app **Receita Saúde** (Receita Federal). O recibo daqui é comprovante para o paciente e controle interno; a planilha "Exportar para o contador" traz CPF e valores para lançar lá e no Carnê-Leão.
- **Sala Jitsi:** gratuita; no site público `meet.jit.si` quem abre a sala (o profissional) faz login com Google uma vez. Quem preferir pode usar link fixo próprio.
- **LGPD:** o profissional é o controlador dos dados dos pacientes. Antes de oferecer a outros profissionais, publique termos de uso e política de privacidade dizendo quem opera a plataforma, onde os dados ficam (Google Cloud, São Paulo) e o que é cifrado.

## Arquivos

| Arquivo | Para quê |
|---|---|
| `index.html` + `app.js` | Painel do profissional |
| `agendar.html` | Página pública de agendamento |
| `confirmar.html` | Link que o paciente recebe para confirmar ou desmarcar |
| `core.js` | Criptografia, PIX, horários (compartilhado) |
| `style.css` | Visual no design system Casal das Cifra$ (ameixa, cobre, camel, creme; Montserrat e Figtree), claro e escuro |
| `firestore.rules` | Regras de segurança do banco |
| `firebase-config.js` | Configuração do seu projeto Firebase |
