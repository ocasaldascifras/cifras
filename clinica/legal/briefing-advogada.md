# Mensagem para a advogada de proteção de dados

> Copiar e enviar por e-mail, com os links ou arquivos dos documentos.

Olá! Preciso de uma revisão jurídica dos documentos de um sistema que vou lançar.

**O produto.** O Psifra$ é um sistema on-line para psicólogos e outros profissionais de saúde: agenda, prontuário eletrônico, documentos, financeiro e uma página pública onde pacientes marcam horário. A empresa é Thalita Aladio Lopes - MEI (CNPJ 65.479.517/0001-50), marca Casal das Cifra$. Assinatura mensal de R$ 99 (Essencial) ou R$ 349 (Premium, que inclui consultoria financeira trimestral).

**Arquitetura relevante para a LGPD.**
- Os dados de pacientes (inclusive evolução clínica) são cifrados no aparelho do profissional, com chave derivada de uma frase secreta que só ele conhece. Nós não temos acesso ao conteúdo.
- O banco fica no Google Firebase, região São Paulo. As páginas ficam hospedadas no GitHub Pages.
- Pedidos de agendamento são cifrados no celular do paciente com a chave pública do profissional.
- Com a assinatura vencida, nada é apagado: o profissional continua lendo e exportando, só não cria registros novos.
- Aceite dos documentos por clique, com registro de versão, data, conta e navegador.

**Entendimento atual:** o profissional é controlador dos dados dos pacientes; nós somos operadora (e controladora apenas dos dados de cadastro dos profissionais).

**Documentos para revisão:**
1. Termos de Uso (público)
2. Política de Privacidade (pública)
3. Contrato de Operador (público, aceito por clique)
4. Relatório de Impacto (RIPD), interno
5. Termo de designação da encarregada (Thalita), a ser assinado pelo gov.br
6. Plano de resposta a incidentes, interno

**Pontos em que quero sua opinião:**
1. O enquadramento controlador/operadora está correto, inclusive para a página pública de agendamento?
2. O aceite por clique é suficiente para o contrato de operador?
3. Os prazos de incidente (48 h ao profissional; 3 dias úteis à ANPD) estão adequados à Resolução CD/ANPD nº 15/2024?
4. Termos de Uso: Código de Defesa do Consumidor (o profissional pode ser consumidor?), direito de arrependimento, foro e limitação de responsabilidade.
5. A consultoria do plano Premium precisa de alguma ressalva adicional (ex.: não é recomendação de investimento)?
6. Transferência internacional (Google, GitHub, Meta, Jitsi): a redação atende o art. 33 e a Resolução CD/ANPD nº 19/2024?
7. A titular do MEI pode acumular a função de encarregada?
8. Marco Civil: os registros de acesso por 6 meses ficam no Google Cloud. Está adequado?
9. Algo que falte para profissionais de outros conselhos além do CFP (CRN, CREFITO, CRFa)?

Prazo desejado: [DATA]. Obrigada!
