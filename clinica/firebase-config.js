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
/* Nome que aparece no topo das páginas. */
window.APP_NAME = "Meu Consultório";

/* E-mails (conta Google) da administração: liberam assinaturas em admin.html. Use os mesmos de firestore.rules. */
window.ADMIN_EMAILS = ["ocasaldascifras@gmail.com", "thalitaaladio.contato@gmail.com"];

/* Assinatura. price = valor mensal; annual = valor do plano anual (0 = não oferecer).
   pixType: cpf, cnpj, email, telefone ou aleatoria. whatsapp: número que recebe os comprovantes (com DDD). */
window.BILLING = {
  price: 150,
  annual: 0,
  trialDays: 14,
  pixType: "email",
  pixKey: "",
  pixName: "O Casal das Cifras",
  pixCity: "",
  whatsapp: ""
};
