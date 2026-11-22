# Plano de Resposta a Incidentes de Segurança · Psifra$

> **Minuta para revisão jurídica.** Documento interno. Imprimir e deixar acessível às sócias. Revisar a cada 12 meses ou após qualquer incidente.

## 1. O que é incidente

Qualquer evento, confirmado ou suspeito, que comprometa a confidencialidade, a integridade ou a disponibilidade de dados pessoais. Exemplos:

- Acesso indevido ao Firebase, ao GitHub ou às contas Google da administração;
- Alteração do código do site não feita por vocês;
- Profissional relatando dados de outra pessoa na própria conta;
- Vazamento ou exposição de dados de cadastro (e-mails, chaves PIX);
- Indisponibilidade prolongada (mais de 24 horas) ou perda de dados;
- Comprovantes ou conversas de WhatsApp com dados expostos por engano.

## 2. Equipe

| Papel | Pessoa | Contato |
|---|---|---|
| Coordenação (encarregado) | Thalita Aládio Lopes | (64) 99963-7532 · thalitaaladio.contato@gmail.com |
| Técnica | [NOME OU PRESTADOR] | [CONTATO] |
| Jurídico | [ADVOGADA] | [CONTATO] |
| Comunicação com clientes | [NOME] | [CONTATO] |

## 3. Passo a passo

### Hora 0 a 4: conter
1. **Registrar** no Registro de Incidentes (seção 6): quem percebeu, quando e o quê.
2. **Conter:**
   - Trocar senhas e encerrar sessões das contas Google, GitHub e Firebase da administração.
   - Revogar chaves e acessos suspeitos.
   - Se o código do site foi alterado: voltar o branch `main` para a última versão revisada e conferir o histórico de mudanças.
   - Se for preciso parar o sistema: no Firebase, trocar temporariamente as regras do banco para bloquear gravações (leitura continua para os profissionais baixarem seus dados).
3. **Preservar evidências:** prints, registros de acesso, histórico do GitHub. Não apagar nada.

### Hora 4 a 24: avaliar
4. Responder:
   - Quais dados foram afetados?
   - Os dados de pacientes estavam cifrados? **Se só texto cifrado saiu, o risco ao conteúdo clínico é baixo.**
   - O código foi alterado? Se sim, algum profissional destrancou o sistema nesse período? Nesse caso, considere que as frases secretas podem ter sido capturadas.
   - Quantos titulares e quais profissionais foram afetados?
5. **Classificar o risco**, considerando dados sensíveis, volume, possibilidade de identificação e dano possível:
   - **Risco ou dano relevante:** comunicar ANPD e titulares (passo 7).
   - **Sem risco relevante:** apenas registrar e justificar a decisão por escrito.

### Até 48 horas: avisar os profissionais (controladores)
6. Pelo e-mail e WhatsApp de cada profissional afetado, conforme a cláusula 10 do Contrato de Operador, informar:
   - o que aconteceu;
   - os dados envolvidos;
   - o que já foi feito;
   - o que o profissional deve fazer (ex.: **trocar a frase secreta** no Psifra$ e a senha do Google);
   - o contato do encarregado.

### Até 3 dias úteis: comunicar a ANPD e os titulares
7. Quando houver risco ou dano relevante (Resolução CD/ANPD nº 15/2024):
   - **ANPD:** formulário de comunicação de incidente no site gov.br/anpd. Informar natureza, dados, titulares, medidas, riscos e contato.
   - **Titulares:** linguagem simples, por canal direto. Para dados de pacientes, a comunicação é feita pelo profissional (controlador), com o apoio de vocês e um modelo de mensagem.
   - Informações que ainda faltem podem ser complementadas depois, dentro dos prazos da regulamentação.

### Depois: corrigir e aprender
8. Corrigir a causa, testar e publicar a correção.
9. Reunião de lições aprendidas em até 15 dias. Atualizar o RIPD e este plano.
10. Guardar o registro do incidente por no mínimo 5 anos.

## 4. Modelo de aviso ao profissional

> Assunto: Aviso de incidente de segurança no Psifra$
>
> Olá, [NOME]. Em [DATA] identificamos [DESCRIÇÃO SIMPLES]. Os dados envolvidos foram [DADOS]. Os prontuários e dados de pacientes ficam cifrados com a sua frase secreta, e [ELES FORAM / NÃO FORAM] afetados. Já fizemos [MEDIDAS]. Recomendamos que você [AÇÃO: trocar a frase secreta em Consultório > Segurança / trocar a senha do Google]. Estamos à disposição em thalitaaladio.contato@gmail.com. [NOME], encarregado(a) pela proteção de dados, Casal das Cifra$.

## 5. Contatos externos

| Quem | Como |
|---|---|
| ANPD | gov.br/anpd (comunicação de incidente de segurança) |
| Suporte Firebase / Google Cloud | console do Firebase > Suporte |
| Suporte GitHub | support.github.com |
| Advogada | [CONTATO] |

## 6. Registro de incidentes (art. 37 da LGPD)

| Data | Descrição | Dados e titulares | Risco relevante? | Comunicações (datas) | Medidas | Responsável |
|---|---|---|---|---|---|---|
| | | | | | | |
