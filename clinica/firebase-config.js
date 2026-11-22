/* PASSO 4 do LEIA-ME: cole aqui a configuração do app Web do Firebase (projeto próprio do consultório).
   Esses dados não são segredo: quem protege os dados são as regras (firestore.rules) e a criptografia no aparelho. */
window.FIREBASE_CONFIG = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI.firebaseapp.com",
  projectId: "COLE_AQUI",
  storageBucket: "COLE_AQUI.firebasestorage.app",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI"
};
/* App Check (proteção contra robôs na página de agendamento): cole a "chave do site" do reCAPTCHA v3
   criada no console do Firebase (Build > App Check). Vazio = desligado. */
window.APPCHECK_SITE_KEY = "";

/* Nome que aparece no topo das páginas. */
window.APP_NAME = "Psifra$";
window.APP_TAGLINE = "Seu consultório cifrado. Suas contas em dia.";

/* E-mails (conta Google) da administração: liberam assinaturas em admin.html. Use os mesmos de firestore.rules. */
window.ADMIN_EMAILS = ["ocasaldascifras@gmail.com", "thalitaaladio.contato@gmail.com"];

/* Assinatura. Dois planos: Essencial (sistema) e Premium (sistema + consultoria do consultório).
   pixType: cpf, cnpj, email, telefone ou aleatoria. whatsapp: número que recebe os comprovantes (com DDD). */
window.BILLING = {
  trialDays: 14,
  plans: {
    essencial: { name: "Essencial", price: 99, perks: ["Agenda e página de agendamento", "Prontuário cifrado com evolução ditada", "Documentos com timbre", "Financeiro com PIX e recibo"] },
    premium: { name: "Premium", price: 349, perks: ["Tudo do Essencial", "Relatório financeiro do consultório", "Revisão trimestral de 50 min com a Casal das Cifra$", "Dúvidas financeiras pelo WhatsApp"] }
  },
  pixType: "cnpj",
  pixKey: "65479517000150",
  pixName: "Thalita Aladio Lopes",
  pixCity: "Itumbiara",
  whatsapp: "64999637532"
};
