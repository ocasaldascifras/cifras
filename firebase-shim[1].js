/* Conecta as páginas ao Firebase: login com Google e acesso ao banco.
   Cliente só lê o que as regras permitem. A lista ADMIN_EMAILS só muda o que aparece na tela; a segurança está em firestore.rules. */
(function () {
  var CFG = window.FIREBASE_CONFIG || {};
  var ADM = (window.ADMIN_EMAILS || []).map(function (s) { return String(s).toLowerCase(); });
  var ok = CFG.apiKey && String(CFG.apiKey).indexOf('COLE') < 0 && window.firebase;
  var state = { admin: false, email: '', uid: '' };
  var resolveReady, ready = new Promise(function (r) { resolveReady = r; });
  var st = document.createElement('style');
  st.textContent = '#cc-login{position:fixed;inset:0;z-index:9999;background:#FCFAF6;color:#3D2B1F;display:grid;place-items:center;padding:24px;font:16px/1.5 system-ui,sans-serif}' +
    '#cc-login .box{max-width:380px;width:100%;text-align:center;display:grid;gap:14px}#cc-login h1{font:700 30px Georgia,serif;color:#3D2B1F;margin:0}' +
    '#cc-login button{background:#3D2B1F;color:#F5F0E8;border:0;border-radius:4px;box-shadow:inset 0 -3px 0 #C9891A;padding:13px 18px;font:600 15px system-ui,sans-serif;cursor:pointer}' +
    '#cc-login img{width:min(320px,80%);margin:0 auto}#cc-login p{margin:0;color:#8B7355;font-size:14px}#cc-login .err{color:#B3361B}' +
    '#cc-bar{position:fixed;left:max(10px,env(safe-area-inset-left,0px));bottom:max(10px,env(safe-area-inset-bottom,0px));z-index:50;display:flex;gap:6px;flex-wrap:wrap;font:12px system-ui,sans-serif}' +
    '#cc-bar a,#cc-bar button{background:#3D2B1F;color:#F5F0E8;border:0;border-radius:99px;padding:6px 12px;cursor:pointer;text-decoration:none;opacity:.88;font:12px system-ui,sans-serif}';
  document.head.appendChild(st);
  var ov = document.createElement('div');
  ov.id = 'cc-login';
  ov.innerHTML = '<div class="box"><img src="logo.webp" alt="O Casal das Cifras — Decisões patrimoniais"><p>Acesso privado para clientes</p><button id="cc-go" type="button">Entrar com Google</button><p id="cc-msg"></p></div>';
  document.body.appendChild(ov);
  var msg = function (t, bad) { var m = document.getElementById('cc-msg'); m.textContent = t || ''; m.className = bad ? 'err' : ''; };
  if (!ok) { document.getElementById('cc-go').hidden = true; msg('Falta configurar o arquivo firebase-config.js (passo 5 do LEIA-ME).', true); window.claude = { use: function () { return new Promise(function () {}); } }; return; }
  firebase.initializeApp(CFG);
  var auth = firebase.auth(), fs = firebase.firestore();
  window.CC_FS = fs;
  document.getElementById('cc-go').onclick = function () {
    msg('Abrindo o login…');
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(function (e) {
      msg(e && e.code === 'auth/unauthorized-domain' ? 'Este endereço ainda não foi autorizado no Firebase (passo 7 do LEIA-ME).' : 'Não foi possível entrar. Tente de novo.', true);
    });
  };
  function bar() {
    var b = document.getElementById('cc-bar'); if (b) b.remove();
    b = document.createElement('div'); b.id = 'cc-bar';
    if (state.admin) b.innerHTML = '<a href="index.html">Início</a><a href="clientes.html">Clientes</a><a href="gestao.html">Gestão</a>';
    var o = document.createElement('button'); o.type = 'button'; o.textContent = 'Sair (' + state.email + ')';
    o.onclick = function () { auth.signOut().then(function () { location.href = 'index.html'; }); };
    b.appendChild(o); document.body.appendChild(b);
  }
  auth.onAuthStateChanged(function (u) {
    if (!u) { ov.hidden = false; ov.style.display = 'grid'; return; }
    if (!u.emailVerified) { auth.signOut(); msg('Esse e-mail não está verificado. Entre com uma conta Google.', true); return; }
    state.email = String(u.email || '').toLowerCase(); state.uid = u.uid; state.admin = ADM.indexOf(state.email) >= 0;
    window.CC_ROLE = state.admin ? 'admin' : 'client'; window.CC_EMAIL = state.email;
    ov.style.display = 'none'; bar(); resolveReady(true);
  });
  var DBW = {
    doc: function (p) { return fs.doc(p); },
    collection: function (p) {
      var c = fs.collection(p);
      return (p === 'clients' && !state.admin) ? c.where('emails', 'array-contains', state.email) : c;
    }
  };
  var USR = {
    id: function () { return Promise.resolve(state.uid); },
    me: function () { return Promise.resolve({ id: state.uid }); },
    isOwner: function () { return state.admin; },
    canEdit: function () { return state.admin; },
    can: function () { return Promise.resolve(true); }
  };
  window.claude = {
    use: function (n) { return ready.then(function () { return n === 'db' ? DBW : n === 'user' ? USR : null; }); }
  };
})();
