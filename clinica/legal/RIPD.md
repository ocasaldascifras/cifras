# Relatório de Impacto à Proteção de Dados Pessoais (RIPD) · Psifra$

> **Minuta para revisão jurídica.** Documento interno da Casal das Cifra$. Não publicar no site.
> Versão 1.0 · elaborado em 22/11/2026 · próxima revisão: a cada mudança relevante do sistema ou em 12 meses.

## 1. Identificação

| Item | Preenchimento |
|---|---|
| Agente | Thalita Aladio Lopes - MEI, CNPJ 65.479.517/0001-50 |
| Papel | Controladora dos dados de profissionais; operadora dos dados de pacientes |
| Encarregado | Thalita Aládio Lopes · thalitaaladio.contato@gmail.com |
| Responsáveis pela elaboração | Thalita Aládio e Bruna Fernandes, sócias |
| Base normativa | LGPD (Lei nº 13.709/2018), art. 5º, XVII, e art. 38; orientações da ANPD |

**Por que fazer este relatório.** O Psifra$ trata dados sensíveis de saúde (art. 5º, II, e art. 11) de pacientes de vários profissionais. É tratamento de alto risco. Como operadora, a Casal das Cifra$ elabora este RIPD da plataforma para apoiar cada profissional (controlador) no RIPD do próprio consultório, e para documentar as próprias decisões como controladora dos dados de cadastro.

## 2. Descrição do tratamento

| Item | Descrição |
|---|---|
| Natureza | Agenda, prontuário eletrônico, documentos e financeiro de consultórios de saúde, com página pública de agendamento |
| Titulares | Profissionais de saúde (clientes); pacientes e seus responsáveis; pessoas que pedem agendamento |
| Volume esperado | Até [100] profissionais e [5.000] pacientes no primeiro ano |
| Dados de profissionais | Conta Google (nome, e-mail, identificador), registro profissional, CPF/CNPJ, contato, endereço, chave PIX, plano e pagamentos, registros de acesso |
| Dados de pacientes | Identificação e contato, agenda, evoluções clínicas, documentos psicológicos, cobranças (sensíveis) |
| Fluxo | Profissional digita ou dita, o aparelho cifra, o banco (Firebase, São Paulo) guarda só o texto cifrado, e o aparelho do profissional decifra. O paciente agenda na página pública e o pedido é cifrado no celular dele com a chave pública do profissional. |
| Quem acessa o conteúdo | Somente o profissional, com a frase secreta. A administração vê apenas e-mail, plano e validade. |
| Retenção | Pacientes: enquanto durar a conta, sem exclusão por inadimplência. Acesso: 6 meses. Fiscal: 5 anos. |

## 3. Necessidade e proporcionalidade

- **Bases legais.** Dados de pacientes (controlador): art. 11, II, "a" (obrigação regulatória de manter registro documental, Resolução CFP nº 001/2009) e "f" (tutela da saúde por profissional de saúde). Dados de profissionais (Casal das Cifra$): art. 7º, II, V e IX.
- **Minimização.** A plataforma não exige CPF do paciente (opcional, só para recibo). O relatório do plano Premium usa apenas números agregados. A página pública mostra horários ocupados sem nomes.
- **Finalidade.** Não há uso secundário: sem publicidade, venda, perfilamento ou treinamento de IA com dados de pacientes.
- **Transparência.** Termos de Uso, Política de Privacidade e Contrato de Operador publicados e aceitos na criação da conta.

## 4. Riscos identificados

Escala: probabilidade e impacto de 1 (baixo) a 3 (alto). Risco = P × I.

| # | Risco | P | I | Risco | Medidas | Risco residual |
|---|---|---|---|---|---|---|
| R1 | Vazamento do banco de dados | 2 | 3 | 6 | Criptografia de ponta a ponta; banco só tem texto cifrado | **Baixo**: conteúdo ilegível |
| R2 | Acesso de uma conta aos dados de outra | 1 | 3 | 3 | Regras do banco por conta, com 37 testes automatizados | Baixo |
| R3 | Alteração maliciosa do código do site (conta GitHub invadida) para capturar a frase secreta | 1 | 3 | 3 | Verificação em duas etapas, proteção do branch principal, revisão de mudanças, bibliotecas no próprio site | **Médio**: maior risco residual. Política de segurança de conteúdo (CSP) planejada |
| R4 | Frase secreta fraca e ataque de força bruta após vazamento | 1 | 3 | 3 | Frase forte obrigatória; PBKDF2 com 600 mil iterações | Baixo |
| R5 | Aparelho do profissional perdido, desbloqueado ou com vírus | 2 | 3 | 6 | Trancamento automático; orientação de senha no aparelho | **Médio**: depende do usuário |
| R6 | Perda de acesso pelo profissional (frase e código perdidos) | 2 | 2 | 4 | Código de recuperação obrigatório; cópia de dados sob demanda | Médio. Planejado: cópia automática cifrada |
| R7 | Conta Google do profissional tomada por golpe | 2 | 2 | 4 | Sem a frase secreta o prontuário segue ilegível; orientação de verificação em duas etapas | Baixo para o conteúdo |
| R8 | Áudio do ditado processado por Google/Apple | 3 | 2 | 6 | Aviso na tela; digitação como alternativa | **Médio**. Planejado: ditado no próprio aparelho |
| R9 | PDFs e cópias baixadas expostos no aparelho | 2 | 2 | 4 | Orientação ao profissional; cópia é ação deliberada | Médio |
| R10 | Pedidos falsos lotando a agenda pública | 2 | 1 | 2 | Pedido exige reserva de horário; profissional recusa e libera | Baixo. Planejado: App Check |
| R11 | Falta dos registros de acesso de 6 meses (Marco Civil, art. 15) | 2 | 2 | 4 | **Pendente**: ativar e reter os logs de auditoria do Google Cloud | **Médio até implementar** |
| R12 | Tratamento sem aceite registrado | 1 | 2 | 2 | Aceite com versão e data gravados na criação da conta | Baixo |

## 5. Plano de ação

| Ação | Responsável | Prazo |
|---|---|---|
| Revisão jurídica destes documentos | Sócias + advogada | Antes do lançamento |
| Verificação em duas etapas em Google, GitHub e Firebase da administração; proteção do branch `main` | [RESPONSÁVEL] | Antes do lançamento |
| Ativar e reter registros de acesso por 6 meses (R11) | [RESPONSÁVEL] | Antes do lançamento |
| Firebase App Check na página de agendamento (R10) | [RESPONSÁVEL] | 30 dias após o lançamento |
| Política de segurança de conteúdo (CSP) testada em domínio próprio (R3) | [RESPONSÁVEL] | 60 dias |
| Cópia de segurança cifrada automática (R6) | [RESPONSÁVEL] | 90 dias |
| Ditado no próprio aparelho (R8) | [RESPONSÁVEL] | 6 meses |
| Revisão externa de segurança | Empresa contratada | Antes de 50 assinantes |

## 6. Conclusão

Com as medidas adotadas, o principal risco (vazamento do banco) tem impacto residual baixo, porque o conteúdo clínico é ilegível sem a frase de cada profissional. Os riscos residuais médios (R3, R5, R6, R8, R9, R11) têm ações definidas. O tratamento é considerado **adequado para lançamento**, condicionado às ações marcadas "antes do lançamento".

| Aprovação | Nome | Data |
|---|---|---|
| Encarregado | Thalita Aládio Lopes | [DATA] |
| Sócia | Thalita Aládio | [DATA] |
| Sócia | Bruna Fernandes | [DATA] |
