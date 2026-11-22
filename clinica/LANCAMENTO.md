# Lançamento do Psifra$ · roteiro

Cada item diz **quem faz** e **quanto tempo leva**. Marquem `[x]` conforme concluírem.

## A. Já feito pelo Claude
- [x] Sistema completo (agenda, prontuário cifrado, documentos, financeiro, planos Essencial e Premium, painel de assinaturas)
- [x] Regras de segurança do banco (37 testes) e teste do fluxo completo (36 verificações)
- [x] PIX das assinaturas (CNPJ 65.479.517/0001-50) e WhatsApp (64) 99963-7532 configurados
- [x] Termos de Uso, Política de Privacidade e Contrato de Operador preenchidos, com aceite on-line registrado
- [x] RIPD, designação da encarregada (PDF para gov.br) e plano de incidente
- [x] Proteção contra robôs (App Check) pronta para ligar
- [x] Mensagens prontas para o contador e a advogada (`legal/briefing-contador.md` e `legal/briefing-advogada.md`)

## B. Vocês, antes de tudo (cerca de 1 hora no total)

### 1. Verificação em duas etapas (10 min) · Thalita e Bruna
- [ ] **Google** (ocasaldascifras@gmail.com e thalitaaladio.contato@gmail.com): myaccount.google.com > Segurança > Verificação em duas etapas.
- [ ] **GitHub**: github.com > foto > Settings > Password and authentication > Enable two-factor authentication.

### 2. Proteger o código publicado (5 min) · quem administra o GitHub
- [ ] github.com/ocasaldascifras/cifras > Settings > Branches > Add rule > `main` > marcar **Require a pull request before merging**.
  Assim nenhuma mudança vai ao ar sem passar por um pedido revisado. Isso protege contra o principal risco apontado no RIPD (código alterado).

### 3. Criar o Firebase do Psifra$ (20 min) · Thalita
Usem um **projeto novo**, separado do Casal das Cifras.
- [ ] console.firebase.google.com > Criar projeto > nome `psifras` (pode desligar o Analytics).
- [ ] Build > **Authentication** > Vamos começar > Google > Ativar > e-mail de suporte > Salvar.
- [ ] Build > **Firestore Database** > Criar > modo produção > região **southamerica-east1 (São Paulo)**.
- [ ] Firestore > aba **Regras** > apagar tudo > colar o conteúdo de `clinica/firestore.rules` > **Publicar**.
- [ ] Engrenagem > Configurações do projeto > Seus aplicativos > ícone `</>` > registrar app > copiar os valores do `firebaseConfig` e **me enviar** (não são segredo). Eu colo em `clinica/firebase-config.js`.
- [ ] Authentication > Settings > **Domínios autorizados** > Adicionar `ocasaldascifras.github.io`.

### 4. Registros de acesso por 6 meses (10 min) · Thalita
Exigência do Marco Civil da Internet (art. 15). O Firebase roda no Google Cloud, e é lá que se liga.
- [ ] console.cloud.google.com > escolher o projeto `psifras` > **IAM e administrador > Registros de auditoria**.
- [ ] Na lista, marcar **Cloud Firestore API** e **Identity Toolkit API** > marcar **Leitura de dados** e **Gravação de dados** > Salvar.
- [ ] **Logging > Armazenamento de registros** > bucket `_Default` > Editar > **Período de armazenamento: 180 dias** > Salvar.
  Os registros guardam data, hora e IP de cada acesso. Custo: gratuito até 50 GB por mês de registros; acima de 30 dias de guarda pode haver cobrança de centavos por GB. Pode ser necessário ativar o faturamento (plano Blaze) com alerta de orçamento de R$ 10.

### 5. Proteção contra robôs (10 min) · Thalita, depois do item 3
- [ ] Firebase > Build > **App Check** > registrar o app Web com **reCAPTCHA v3** > copiar a **chave do site** e me enviar.
- [ ] Depois de uma semana funcionando, em App Check > Firestore > **Aplicar** (enforce).

## C. Profissionais externos
- [ ] **Contador:** enviar `legal/briefing-contador.md`. Decisão sobre MEI ou ME.
- [ ] **Advogada de proteção de dados:** enviar `legal/briefing-advogada.md` com os documentos. Depois da revisão, eu retiro o aviso "Minuta" e preencho a data de publicação.
- [ ] **Thalita:** assinar a designação da encarregada no gov.br (assinador.iti.br) e guardar o PDF assinado.

## D. Ir ao ar
- [ ] Juntar o branch do Psifra$ ao `main` (pedido de junção aberto pelo Claude).
- [ ] Endereço do painel: `https://ocasaldascifras.github.io/cifras/clinica/`
- [ ] Teste real: criar uma conta de teste, agendar pela página pública com outro celular, gerar um PIX de R$ 1 e conferir no app do Inter.
- [ ] Liberar a primeira assinante em `.../clinica/admin.html`.

## E. Primeiros 90 dias (Claude faz quando pedirem)
- Política de segurança de conteúdo (CSP) em domínio próprio
- Cópia de segurança cifrada automática
- Fase 2: "Meu consultório dá lucro?" e reserva de imposto
- Lembretes de sessão com um toque
