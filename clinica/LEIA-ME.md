# Psifra$

**Seu consultório cifrado. Suas contas em dia.** Um produto da Casal das Cifra$.

Plataforma por assinatura para psicólogas(os) e outros profissionais de saúde que atendem em consultório. Cada profissional cria a própria conta e passa a ter:

| O que | Como funciona |
|---|---|
| **Consultório on-line** | Página com link próprio (`agendar.html?u=seu-nome`). O paciente vê os horários livres e marca sozinho. Sessão on-line já sai com sala de vídeo (Jitsi, grátis) ou com o seu link fixo (Meet, Zoom). |
| **Evolução ditada** | Ao fim da sessão, toque em "Ditar evolução" e fale. O texto fica pronto para revisar e **assinar**. Depois de assinada não se edita mais: correções viram *adendo*, como pede a boa prática do registro documental. |
| **Documentos em PDF com timbre** | Declaração de comparecimento, declaração de acompanhamento, atestado, relatório psicológico (estrutura da Resolução CFP nº 06/2019) e documento livre, já preenchidos com os dados do paciente. Logotipo e cor do timbre configuráveis. |
| **Agenda** | Sessões avulsas ou recorrentes (semanal/quinzenal), bloqueio de horários e férias, confirmação pelo WhatsApp com link para o paciente confirmar ou desmarcar, registro de faltas. |
| **Financeiro** | Ao marcar a sessão como realizada, a cobrança entra sozinha. PIX com QR Code e "copia e cola" (o dinheiro cai direto na conta do profissional), recibo em PDF com valor por extenso, planilha mensal para o contador. |
| **Sigilo** | Cada conta só enxerga os próprios pacientes. Além disso, **tudo de paciente é cifrado no aparelho** com uma frase secreta que só o profissional sabe. Nem a administração do sistema consegue ler prontuário. |

**Planos** (14 dias grátis, sem comissão sobre as sessões):

| Plano | Preço | Inclui |
|---|---|---|
| Essencial | R$ 99/mês | Agenda e página de agendamento, prontuário cifrado com evolução ditada, documentos com timbre, financeiro com PIX e recibo |
| Premium | R$ 349/mês | Tudo do Essencial + relatório financeiro do consultório (só números, sem nomes) + revisão trimestral de 50 min com a Casal das Cifra$ + dúvidas financeiras pelo WhatsApp |

O Premium equivale ao sistema (R$ 99) mais o acompanhamento Essencial da consultoria (R$ 300), com desconto. Cada assinante Premium consome cerca de 4 horas de consultoria por ano: acompanhem a capacidade da agenda de vocês.

### Como a cobrança funciona
1. A profissional cria a conta e ganha 14 dias de teste automaticamente.
2. Na tela "Assinar" ela escolhe o plano, vê o QR Code PIX do valor certo (para a conta de vocês) e envia o comprovante pelo WhatsApp de vocês.
3. Vocês abrem `admin.html`, entram com a conta Google da administração, escolhem o plano na linha da pessoa e tocam em **+1 mês** (ou **+1 ano**). O painel mostra quantas assinantes estão no Premium, para planejar as revisões trimestrais.
4. Assinatura vencida: **nada é apagado**. Ela continua lendo, imprimindo e baixando tudo; só ficam bloqueados novos registros e novos agendamentos pela página. Isso protege vocês diante do CFP e da LGPD (prontuário é dela, e o acesso não pode ser sequestrado por cobrança).
5. O painel da administração mostra só e-mail e validade. Prontuários continuam ilegíveis para vocês.

Configure em `firebase-config.js` (bloco `BILLING`): nomes, preços e itens de cada plano, dias de teste, chave PIX, nome e cidade do recebedor (como no banco) e o WhatsApp que recebe comprovantes. Os e-mails da administração ficam em `ADMIN_EMAILS` e em `firestore.rules` (função `isAdmin`): os dois precisam ser iguais.

Quando passar de umas 30 assinantes, vale automatizar a cobrança (assinatura recorrente no cartão/PIX automático por um intermediador como Asaas, Mercado Pago ou Stripe). Isso exige um servidor (Cloud Functions, plano Blaze do Firebase) e tem taxa por transação.

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

## Prontuário: como fica legal e protegido

**O que a lei e o CFP pedem, e como a plataforma atende**

| Exigência | Onde está | Como a plataforma atende |
|---|---|---|
| Registro documental obrigatório, com evolução datada e identificação de quem registrou | Resolução CFP nº 001/2009 | Evolução com data, autor, registro e código de integridade; assinada não se edita, correção vira adendo |
| Sigilo profissional | Código de Ética do Psicólogo | Só a própria profissional lê; nem a administração tem a chave |
| Guarda por no mínimo 5 anos | Resolução CFP nº 001/2009 | Nada é apagado por falta de pagamento; paciente encerrado é arquivado; cópia completa a qualquer momento |
| Documentos escritos (declaração, atestado, relatório) | Resolução CFP nº 06/2019 | Modelos com a estrutura da resolução e aviso para informar só o necessário |
| Dado de saúde é dado sensível | LGPD, art. 11 | Cifrado no aparelho (AES-256); pedido do paciente cifrado com a chave pública da profissional |
| Medidas de segurança adequadas | LGPD, art. 46 | Criptografia, regras do banco testadas, trancamento automático, frase forte obrigatória, bibliotecas hospedadas no próprio site |
| Atendimento on-line | Resolução CFP nº 11/2018 | A profissional precisa do cadastro e-Psi; a plataforma lembra disso no guia |

**Papéis na LGPD.** A profissional é a *controladora* dos dados dos pacientes dela. A Casal das Cifra$ é *operadora*: guarda e transporta, mas não decide nem lê. O Google (Firebase, servidores em São Paulo) é *suboperador*. Isso precisa estar escrito nos termos de uso e num contrato de operador que a profissional aceita ao assinar.

**Por que um vazamento do banco não expõe prontuário.** Quem roubar o banco inteiro leva só texto cifrado. Para ler, teria de adivinhar a frase secreta de cada profissional, e cada tentativa custa 600 mil rodadas de cálculo. Com uma frase de 3 ou mais palavras, isso é impraticável.

**Riscos que continuam existindo (e o que fazer)**
1. **Celular ou computador da profissional desbloqueado ou com vírus.** Trancamento automático, senha no aparelho, não instalar extensões desconhecidas no navegador.
2. **Alguém alterar o código do site** (conta do GitHub invadida). É o maior risco de qualquer sistema cifrado no navegador: código malicioso poderia capturar a frase. Proteção: verificação em duas etapas no GitHub e no Google da administração, proteção do branch `main`, toda mudança revisada antes de publicar.
3. **PDFs e cópias baixadas** ficam legíveis no aparelho. Orientar a guardar em pasta protegida.
4. **Ditado de voz** passa pelo Google ou pela Apple. Quem quiser sigilo total digita.
5. **Golpe para roubar a conta Google.** Exigir verificação em duas etapas na conta da profissional.

**Antes de abrir ao público:** termos de uso, política de privacidade, contrato de operador, relatório de impacto (RIPD), encarregado nomeado e plano de resposta a incidente revisados por uma advogada de proteção de dados.

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
| `admin.html` | Painel da administração: liberar e encerrar assinaturas |
| `core.js` | Criptografia, PIX, horários (compartilhado) |
| `vendor/` | Bibliotecas do Firebase e do QR Code, guardadas no próprio site |
| `style.css` | Visual no design system Casal das Cifra$ (ameixa, cobre, camel, creme; Montserrat e Figtree), claro e escuro |
| `firestore.rules` | Regras de segurança do banco |
| `firebase-config.js` | Configuração do seu projeto Firebase |
