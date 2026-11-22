/* Painel do profissional. Cada conta enxerga só o próprio consultório (regras do banco)
   e tudo de paciente é cifrado no aparelho com a frase secreta (core.js). */
(function () {
  'use strict';
  var C = window.CC, h = C.h, $ = function (s, r) { return (r || document).querySelector(s); };
  var S = { items: new Map(), confirms: new Map(), requests: new Map(), busy: [], tab: 'agenda', pid: null, ptab: 'evol' };
  var fs, auth, unsubs = [], app = $('#app'), idleTimer, queue = Promise.resolve();
  var DAY = 864e5, WEEK = 7 * DAY;
  var WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var STATUS = { agendado: ['Agendado', ''], confirmado: ['Confirmado', 'ok'], realizado: ['Realizado', 'ok'], falta: ['Falta', 'bad'], desmarcado: ['Desmarcado', ''] };
  var METHODS = ['PIX', 'Dinheiro', 'Cartão', 'Transferência', 'Convênio'];
  var ICON = {
    agenda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',
    pacientes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 0 0 0-6M22 21c0-3-2-5-4-5.6"/></svg>',
    financeiro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6 10v5M18 10v5"/></svg>',
    config: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg>'
  };

  /* ---------------- utilidades ---------------- */
  var cfg = function () { return (S.pro && S.pro.cfg) || {}; };
  var tz = function () { return cfg().tz == null ? -180 : cfg().tz; };
  var uid = function () { return S.user.uid; };
  var list = function (k) { var a = []; S.items.forEach(function (o) { if (o.k === k) a.push(o); }); return a; };
  var get = function (id) { return S.items.get(id); };
  var pname = function (pid) { var p = get(pid); return p ? p.name : 'Paciente removido'; };
  var dmy = function (t) { return C.dmy(t, tz()); };
  var hm = function (t) { return C.hm(t, tz()); };
  var dlong = function (t) { return C.fmt(t, tz(), { weekday: 'long', day: 'numeric', month: 'long' }); };
  var fv = function (form) { var o = {}; new FormData(form).forEach(function (v, k) { o[k] = typeof v === 'string' ? v.trim() : v; }); return o; };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var pubLink = function () { return S.pro.slug ? new URL('agendar.html?u=' + S.pro.slug, location.href).href : ''; };

  function screen(html) { closeSheet(); app.innerHTML = html; }
  function toast(msg, action, fn) {
    var old = $('.toast'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = '<span>' + h(msg) + '</span>' + (action ? '<button type="button">' + h(action) + '</button>' : '');
    if (action) t.querySelector('button').onclick = function () { t.remove(); fn(); };
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, action ? 9000 : 3500);
  }
  function busyBtn(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.l = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> ' + h(label || 'Aguarde'); }
    else { btn.disabled = false; btn.innerHTML = btn.dataset.l || btn.innerHTML; }
  }
  function openSheet(title, html, mount) {
    closeSheet(); var tt = $('.toast'); if (tt) tt.remove();
    var bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.id = 'sheet';
    bg.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + h(title) + '"><div class="sh"><h2>' + h(title) + '</h2><button class="btn ghost sm" data-a="close" aria-label="Fechar">✕</button></div>' + html + '</div>';
    bg.addEventListener('mousedown', function (e) { if (e.target === bg) closeSheet(); });
    document.body.appendChild(bg); document.body.style.overflow = 'hidden';
    var f = bg.querySelector('input,select,textarea'); if (f && matchMedia('(min-width:700px)').matches) f.focus();
    if (mount) mount(bg.querySelector('.sheet'));
  }
  function closeSheet() { var s = $('#sheet'); if (s) { s.remove(); document.body.style.overflow = ''; } if (S.rec) { try { S.rec.stop(); } catch (e) { } S.rec = null; } }

  /* ---------------- dados cifrados ---------------- */
  async function put(o) {
    if (!subActive()) { subSheet(); var e = new Error('Assinatura vencida.'); e.sub = true; throw e; }
    var id = o.id || C.token(20), data = Object.assign({}, o); delete data.id;
    data.u = Date.now();
    var e = await C.enc(S.key, data);
    S.items.set(id, Object.assign({}, data, { id: id }));
    await fs.doc('pros/' + uid() + '/items/' + id).set({ iv: e.iv, ct: e.ct, u: data.u });
    return id;
  }
  async function del(id) { if (!subActive()) { subSheet(); var e = new Error('Assinatura vencida.'); e.sub = true; throw e; } S.items.delete(id); await fs.doc('pros/' + uid() + '/items/' + id).delete(); }
  function busyRef(t) { return fs.doc('profiles/' + S.pro.slug + '/busy/' + String(t)); }
  async function setBusy(t, d, by) { if (S.pro.slug) await busyRef(t).set({ by: by || 'x', d: d, at: Date.now() }); }
  async function freeBusy(t) {
    if (!S.pro.slug) return;
    var still = list('appt').some(function (a) { return a.t === t && a.status !== 'desmarcado'; });
    if (!still) await busyRef(t).delete().catch(function () { });
  }

  function startSync() {
    stopSync();
    unsubs.push(fs.collection('pros/' + uid() + '/items').onSnapshot(function (snap) {
      var ch = snap.docChanges();
      queue = queue.then(async function () {
        for (var i = 0; i < ch.length; i++) {
          var c = ch[i];
          if (c.type === 'removed') { S.items.delete(c.doc.id); continue; }
          try { var o = await C.dec(S.key, c.doc.data()); o.id = c.doc.id; S.items.set(o.id, o); }
          catch (e) { console.warn('Registro ilegível', c.doc.id); }
        }
        S.loaded = true; softRender();
      }).catch(function (e) { console.error(e); });
    }, function (e) { toast('Sem conexão com o banco: ' + (e.code || e.message)); }));
    if (S.pro.slug) {
      var base = 'profiles/' + S.pro.slug;
      unsubs.push(fs.collection(base + '/requests').onSnapshot(function (snap) {
        var docs = snap.docs;
        queue = queue.then(async function () {
          var m = new Map();
          for (var i = 0; i < docs.length; i++) {
            var d = docs[i], old = S.requests.get(d.id);
            if (old) { m.set(d.id, old); continue; }
            try { var r = await C.openSealed(S.priv, d.data()); r.id = d.id; r.slot = +d.data().slot; m.set(d.id, r); }
            catch (e) { m.set(d.id, { id: d.id, bad: true, slot: +d.data().slot }); }
          }
          S.requests = m; softRender();
        }).catch(function (e) { console.error(e); });
      }));
      unsubs.push(fs.collection(base + '/confirms').onSnapshot(function (snap) {
        S.confirms = new Map(); snap.docs.forEach(function (d) { S.confirms.set(d.id, d.data()); }); softRender();
      }));
      unsubs.push(fs.collection(base + '/busy').onSnapshot(function (snap) {
        S.busy = snap.docs.map(function (d) { var x = d.data(); return { t: +d.id, d: x.d, by: x.by }; }); softRender();
      }));
    }
  }
  function stopSync() { unsubs.forEach(function (u) { try { u(); } catch (e) { } }); unsubs = []; }
  function cleanupBusy() {
    if (!S.pro.slug) return;
    var limit = Date.now() - 2 * DAY;
    fs.collection('profiles/' + S.pro.slug + '/busy').get().then(function (snap) {
      snap.docs.forEach(function (d) { var b = d.data(); if (+d.id + (b.d || 60) * 60000 < limit) d.ref.delete().catch(function () { }); });
    }).catch(function () { });
  }

  /* ---------------- entrada, cofre e bloqueio ---------------- */
  function boot() {
    if (!C.configured()) { screen('<div class="center"><div class="box"><h1 class="brand">' + h(C.appName) + '</h1><p class="err">Falta configurar o arquivo firebase-config.js (passo 4 do LEIA-ME).</p></div></div>'); return; }
    fs = C.fs(); auth = firebase.auth();
    auth.onAuthStateChanged(async function (u) {
      lock(true); S.user = u;
      if (!u) return loginScreen();
      screen('<div class="center"><span class="spin" aria-label="Carregando"></span></div>');
      try {
        var snap = await fs.doc('pros/' + u.uid).get();
        S.pro = snap.exists ? snap.data() : {};
        if (S.pro.vault) unlockScreen(); else setupScreen();
      } catch (e) { screen('<div class="center"><div class="box"><p class="err">Não foi possível abrir sua conta: ' + h(e.message) + '</p><button class="btn" data-a="logout">Sair</button></div></div>'); }
    });
  }
  function loginScreen() {
    screen('<div class="center"><div class="box">' +
      '<h1 class="brand">' + h(C.appName) + '</h1>' +
      '<p>Agenda, prontuário, documentos e financeiro do seu consultório, com página de agendamento on-line.</p>' +
      '<button class="btn pri" data-a="login">Entrar com Google</button>' +
      '<p class="small">' + C.billing.trialDays + ' dias grátis para testar. Depois, ' + C.money(C.billing.price) + ' por mês.</p>' +
      '<p class="small muted">Os prontuários são cifrados no seu aparelho com uma frase secreta que só você sabe. Nem a administração do sistema consegue ler.</p>' +
      '<p id="msg" class="small err" role="alert"></p></div></div>');
  }
  function setupScreen() {
    screen('<div class="center"><div class="box">' +
      '<h1 class="brand">Crie sua frase secreta</h1>' +
      '<p>Ela tranca seus prontuários. É pedida ao abrir o sistema e <b>não é a senha do Google</b>.</p>' +
      '<div class="note">Ninguém consegue recuperar essa frase por você, nem a administração. Por isso você vai receber também um código de recuperação para guardar em lugar seguro.</div>' +
      '<form id="fsetup" class="stack">' +
      '<label><span>Frase secreta (mínimo 10 caracteres)</span><input name="p1" type="password" minlength="10" required autocomplete="new-password"></label>' +
      '<label><span>Repita a frase</span><input name="p2" type="password" minlength="10" required autocomplete="new-password"></label>' +
      '<p class="small muted">Dica: use 3 ou 4 palavras soltas, como "janela azul do sábado".</p>' +
      '<button class="btn pri">Criar meu cofre</button><p id="msg" class="small err" role="alert"></p></form>' +
      '<button class="btn ghost sm" data-a="logout">Sair (' + h(S.user.email) + ')</button></div></div>');
  }
  function unlockScreen(rec) {
    screen('<div class="center"><div class="box">' +
      '<h1 class="brand">' + h(C.appName) + '</h1>' +
      '<p>Olá, ' + h((cfg().name || S.user.displayName || '').split(' ')[0]) + '. ' + (rec ? 'Digite seu código de recuperação.' : 'Digite sua frase secreta para abrir os prontuários.') + '</p>' +
      '<form id="funlock" class="stack" data-rec="' + (rec ? 1 : '') + '">' +
      (rec ? '<label><span>Código de recuperação</span><input name="s" required autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"></label>'
        : '<label><span>Frase secreta</span><input name="s" type="password" required autocomplete="current-password"></label>') +
      '<button class="btn pri">Abrir</button><p id="msg" class="small err" role="alert"></p></form>' +
      '<div class="row"><button class="btn ghost sm" data-a="' + (rec ? 'unlock-pass' : 'unlock-rec') + '">' + (rec ? 'Usar a frase secreta' : 'Esqueci a frase') + '</button>' +
      '<button class="btn ghost sm" data-a="logout">Sair</button></div></div></div>');
  }
  function lock(silent) {
    stopSync(); closeSheet(); clearPrint();
    var t = $('.toast'); if (t) t.remove();
    S.key = S.priv = S.dek = null; S.items = new Map(); S.requests = new Map(); S.confirms = new Map(); S.loaded = false;
    if (!silent && S.user && S.pro && S.pro.vault) unlockScreen();
  }
  async function opened(v) {
    S.key = v.key; S.priv = v.priv; S.dek = v.dek;
    await loadSub();
    S.tab = S.tab || 'agenda'; render(); startSync(); if (subActive()) cleanupBusy(); bumpIdle();
  }

  /* ---------------- assinatura ----------------
     subs/{uid} = { until (ms), trial, email }. Só a administração prorroga (regras do banco).
     Vencida: tudo continua legível e exportável; novos registros e agendamentos pela página ficam bloqueados. */
  async function loadSub() {
    try {
      var ref = fs.doc('subs/' + uid()), snap = await ref.get();
      if (snap.exists) S.sub = snap.data();
      else {
        S.sub = { until: Date.now() + C.billing.trialDays * DAY, trial: true, email: S.user.email || '', created: Date.now() };
        await ref.set(S.sub);
      }
    } catch (e) { console.warn('assinatura', e); S.sub = S.sub || { until: 0 }; }
  }
  function subActive() { return !!(S.sub && S.sub.until > Date.now()); }
  function subDays() { return S.sub ? Math.ceil((S.sub.until - Date.now()) / DAY) : 0; }
  function subBar() {
    if (!S.sub) return '';
    var d = subDays(), until = dmy(S.sub.until);
    if (!subActive()) return '<div class="subbar bad" role="status"><span><b>Assinatura vencida em ' + until + '.</b> Seus dados continuam disponíveis para ler, imprimir e baixar. Para voltar a registrar e receber agendamentos, assine.</span><button class="btn sm pri" data-a="sub">Assinar</button></div>';
    if (S.sub.trial) return '<div class="subbar" role="status"><span>Teste grátis: ' + (d <= 1 ? 'termina hoje' : 'faltam ' + d + ' dias') + '.</span><button class="btn sm" data-a="sub">Assinar por ' + C.money(C.billing.price) + '/mês</button></div>';
    if (d <= 5) return '<div class="subbar" role="status"><span>Sua assinatura vence em ' + until + '.</span><button class="btn sm" data-a="sub">Renovar</button></div>';
    return '';
  }
  function subSheet() {
    var b = C.billing, svg = '', code = '';
    if (b.pixKey) {
      code = C.pix({ key: C.pixKey(b.pixType, b.pixKey), name: b.pixName, city: b.pixCity, amount: b.price, txid: 'A' + uid().slice(0, 20) });
      try { var q = qrcode(0, 'M'); q.addData(code); q.make(); svg = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); } catch (e) { }
    }
    var msg = 'Olá! Fiz o PIX de ' + C.money(b.price) + ' da assinatura do ' + C.appName + '. Minha conta: ' + (S.user.email || '') + '. Segue o comprovante.';
    openSheet('Assinatura · ' + C.money(b.price) + '/mês', '<div class="stack">' +
      '<p>' + (subActive() ? (S.sub.trial ? 'Seu teste grátis vai até <b>' + dmy(S.sub.until) + '</b>.' : 'Sua assinatura vale até <b>' + dmy(S.sub.until) + '</b>.') : 'Sua assinatura venceu em <b>' + dmy(S.sub.until) + '</b>.') + '</p>' +
      '<p class="small muted">Inclui agenda e página de agendamento, prontuário cifrado com evolução ditada, documentos com timbre, financeiro com PIX e recibo.' + (b.annual ? ' Plano anual: ' + C.money(b.annual) + '.' : '') + '</p>' +
      (code ? '<div class="qr">' + svg + '</div><label><span>PIX copia e cola</span><textarea readonly class="mono" rows="4" style="min-height:90px">' + h(code) + '</textarea></label>' +
        '<button class="btn" data-a="copy" data-id="' + h(code) + '">Copiar código PIX</button>' : '<p class="note">Fale com a administração para receber os dados de pagamento.</p>') +
      (b.whatsapp ? '<a class="btn pri" target="_blank" rel="noopener" href="' + C.waLink(b.whatsapp, msg) + '">Enviar comprovante pelo WhatsApp</a>' : '') +
      '<p class="small muted">A liberação é feita em até 1 dia útil depois do comprovante. Seus dados nunca são apagados por falta de pagamento: você sempre pode ler e baixar tudo.</p></div>');
  }
  function bumpIdle() {
    clearTimeout(idleTimer);
    if (S.key) idleTimer = setTimeout(function () { lock(); toast('Bloqueado por inatividade.'); }, (cfg().idle || 20) * 60000);
  }
  ['click', 'keydown', 'touchstart'].forEach(function (e) { document.addEventListener(e, bumpIdle, { passive: true }); });

  /* ---------------- tela principal ---------------- */
  function render() {
    if (!S.key) return;
    var tabs = [['agenda', 'Agenda'], ['pacientes', 'Pacientes'], ['financeiro', 'Financeiro'], ['config', 'Consultório']];
    app.innerHTML = '<header class="top"><div class="in"><span class="brand">' + h(cfg().name || C.appName) + '</span>' +
      '<button class="btn sm" data-a="lock" title="Trancar os prontuários">🔒 Trancar</button></div></header>' +
      '<nav class="tabs" aria-label="Seções">' + tabs.map(function (t) {
        return '<button data-a="tab" data-id="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '>' + ICON[t[0]] + '<span>' + t[1] + '</span></button>';
      }).join('') + '</nav><div id="subwrap">' + subBar() + '</div><main id="main"></main>';
    renderMain();
  }
  function renderMain() {
    var m = $('#main'); if (!m) return;
    var v = { agenda: vAgenda, pacientes: S.pid ? vPatient : vPatients, financeiro: vFinance, config: vConfig }[S.tab];
    m.innerHTML = S.loaded || S.tab === 'config' ? v() : '<p class="muted"><span class="spin"></span> Abrindo seus dados…</p>';
    if (S.tab === 'config') mountConfig();
  }
  /* Atualizações que chegam do banco não redesenham formulários abertos na aba Consultório. */
  function softRender() { if (S.key && S.tab !== 'config') renderMain(); }

  /* ---------------- AGENDA ---------------- */
  function weekStart(t) { var off = tz(), w = C.wall(t, off); return C.fromWall(w.y, w.m, w.d - ((w.wd + 6) % 7), 0, off); }
  function vAgenda() {
    var off = tz(), ws = S.week || weekStart(Date.now()), today = C.dayStart(Date.now(), off);
    var reqs = Array.from(S.requests.values()).sort(function (a, b) { return a.slot - b.slot; });
    var html = '';
    if (reqs.length) {
      html += '<section class="card stack" aria-label="Pedidos de agendamento"><h2>Pedidos pela página (' + reqs.length + ')</h2>' + reqs.map(function (r) {
        if (r.bad) return '<div class="item"><div class="main"><b>Pedido ilegível</b><span class="small muted">' + dlong(r.slot) + ' · ' + hm(r.slot) + '</span></div><button class="btn sm dan" data-a="req-no" data-id="' + r.id + '">Remover</button></div>';
        return '<div class="item"><div class="main"><b>' + h(r.name) + ' <span class="chip acc">' + (r.mode === 'presencial' ? 'presencial' : 'on-line') + '</span></b>' +
          '<span class="small">' + dlong(r.slot) + ' às ' + hm(r.slot) + ' · ' + h(r.phone) + (r.email ? ' · ' + h(r.email) : '') + '</span>' +
          (r.msg ? '<p class="small muted">“' + h(r.msg) + '”</p>' : '') + '</div>' +
          '<div class="row"><button class="btn sm pri" data-a="req-ok" data-id="' + r.id + '">Aceitar</button><button class="btn sm dan" data-a="req-no" data-id="' + r.id + '">Recusar</button></div></div>';
      }).join('') + '</section>';
    }
    var wEnd = ws + WEEK;
    var appts = list('appt').filter(function (a) { return a.t >= ws && a.t < wEnd && (a.status !== 'desmarcado' || S.showCanceled); });
    var blocks = S.busy.filter(function (b) { return b.by === 'b' && b.t + b.d * 60000 > ws && b.t < wEnd; });
    var fin = C.fmt(wEnd - DAY, off, { day: 'numeric', month: 'short' });
    html += '<div class="head"><div class="row"><button class="btn sm" data-a="wk" data-id="-1" aria-label="Semana anterior">‹</button>' +
      '<h2>' + C.fmt(ws, off, { day: 'numeric', month: 'short' }) + ' – ' + fin + '</h2>' +
      '<button class="btn sm" data-a="wk" data-id="1" aria-label="Próxima semana">›</button><button class="btn sm ghost" data-a="wk" data-id="0">Hoje</button></div>' +
      '<div class="row"><button class="btn sm" data-a="block-new">Bloquear horário</button><button class="btn sm pri" data-a="appt-new">+ Sessão</button></div></div>';
    if (!S.pro.slug) html += '<div class="note info">Crie sua página de agendamento em <a href="#" data-a="tab" data-id="config">Consultório</a> para pacientes marcarem sozinhos.</div>';
    for (var i = 0; i < 7; i++) {
      var d0 = ws + i * DAY, d1 = d0 + DAY;
      var dayA = appts.filter(function (a) { return a.t >= d0 && a.t < d1; }).sort(function (a, b) { return a.t - b.t; });
      var dayB = blocks.filter(function (b) { return b.t < d1 && b.t + b.d * 60000 > d0; });
      if (!dayA.length && !dayB.length && i > 4 && d0 !== today) continue;
      html += '<section class="day' + (d0 === today ? ' today' : '') + '"><h3>' + cap(C.fmt(d0, off, { weekday: 'long', day: 'numeric', month: 'short' })) + (d0 === today ? ' · hoje' : '') + '</h3>';
      if (!dayA.length && !dayB.length) html += '<p class="empty">Livre</p>';
      dayB.forEach(function (b) {
        html += '<div class="appt block"><div class="t">' + (b.d >= 1440 ? 'Dia' : hm(b.t)) + '<small>' + (b.d >= 1440 ? 'inteiro' : 'até ' + hm(b.t + b.d * 60000)) + '</small></div><div class="who">Horário bloqueado</div>' +
          '<div class="acts"><button class="btn sm" data-a="block-del" data-id="' + b.t + '">Liberar</button></div></div>';
      });
      dayA.forEach(function (a) { html += apptRow(a); });
      html += '</section>';
    }
    html += '<button class="btn ghost sm" data-a="toggle-canceled">' + (S.showCanceled ? 'Esconder desmarcadas' : 'Mostrar desmarcadas') + '</button>';
    return html;
  }
  function apptRow(a) {
    var st = STATUS[a.status] || STATUS.agendado, cf = a.tok && S.confirms.get(a.tok), past = a.t + (a.d || 50) * 60000 < Date.now();
    var extra = '';
    if (cf && (a.status === 'agendado' || a.status === 'confirmado')) extra = cf.s === 'ok' ? '<span class="chip ok">paciente confirmou</span>' : '<span class="chip bad">paciente pediu para desmarcar</span>';
    var acts = '';
    if (a.status === 'agendado' || a.status === 'confirmado') {
      if (!past) acts += '<button class="btn sm" data-a="appt-wa" data-id="' + a.id + '">Confirmar pelo WhatsApp</button>';
      if (a.mode !== 'presencial' && a.room) acts += '<a class="btn sm" href="' + h(a.room) + '" target="_blank" rel="noopener">Sala de vídeo</a>';
      acts += '<button class="btn sm" data-a="appt-done" data-id="' + a.id + '">Realizada</button><button class="btn sm" data-a="appt-miss" data-id="' + a.id + '">Falta</button>';
    } else if (a.status === 'realizado') {
      var has = list('note').some(function (n) { return n.apptId === a.id; });
      acts += '<button class="btn sm' + (has ? '' : ' pri') + '" data-a="note-new" data-id="' + a.id + '">' + (has ? 'Ver evolução' : 'Ditar evolução') + '</button>';
    }
    acts += '<button class="btn sm ghost" data-a="appt-more" data-id="' + a.id + '" aria-label="Mais opções">⋯</button>';
    return '<div class="appt st-' + a.status + '"><div class="t">' + hm(a.t) + '<small>' + (a.d || 50) + ' min</small></div>' +
      '<div class="who"><b data-a="patient" data-id="' + a.pid + '">' + h(pname(a.pid)) + '</b><span class="chip ' + st[1] + '">' + st[0] + '</span>' +
      '<span class="small muted">' + (a.mode === 'presencial' ? 'presencial' : 'on-line') + '</span>' + extra + '</div><div class="acts">' + acts + '</div></div>';
  }
  function patientOptions(sel) {
    return list('patient').filter(function (p) { return p.active !== false || p.id === sel; }).sort(byName)
      .map(function (p) { return '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' + h(p.name) + '</option>'; }).join('');
  }
  function byName(a, b) { return a.name.localeCompare(b.name, 'pt-BR'); }
  function apptForm(a, pid) {
    var off = tz(), t = a ? a.t : (S.week && S.week > Date.now() ? S.week + 9 * 36e5 : Math.ceil(Date.now() / 36e5) * 36e5);
    var p = get(pid || (a && a.pid));
    openSheet(a ? 'Remarcar sessão' : 'Nova sessão', '<form id="fappt" class="stack" data-id="' + (a ? a.id : '') + '">' +
      (a ? '<p><b>' + h(pname(a.pid)) + '</b></p>' :
        '<label><span>Paciente</span><select name="pid" required><option value="">Escolha…</option><option value="_new">+ Novo paciente</option>' + patientOptions(pid) + '</select></label>' +
        '<div id="newp" class="grid2" hidden><label><span>Nome</span><input name="nname"></label><label><span>WhatsApp</span><input name="nphone" inputmode="tel"></label></div>') +
      '<div class="grid2"><label><span>Dia</span><input type="date" name="date" required value="' + C.dateInput(t, off) + '"></label>' +
      '<label><span>Horário</span><input type="time" name="time" required value="' + hm(t) + '"></label></div>' +
      '<div class="grid2"><label><span>Duração (min)</span><input type="number" name="d" min="10" max="240" value="' + ((a && a.d) || S.prof && S.prof.dur || 50) + '"></label>' +
      '<label><span>Modalidade</span><select name="mode"><option value="online">On-line</option><option value="presencial"' + (((a && a.mode) || (p && p.mode)) === 'presencial' ? ' selected' : '') + '>Presencial</option></select></label></div>' +
      (a ? '' : '<label><span>Repetir</span><select name="rep"><option value="1">Só esta sessão</option><option value="4">Toda semana, por 4 semanas</option><option value="8">Toda semana, por 8 semanas</option><option value="12">Toda semana, por 12 semanas</option><option value="24">Toda semana, por 24 semanas</option><option value="2q">A cada 15 dias, 6 vezes</option></select></label>') +
      '<button class="btn pri">Salvar</button></form>', function (sh) {
        var sel = sh.querySelector('[name=pid]');
        if (sel) sel.onchange = function () { sh.querySelector('#newp').hidden = sel.value !== '_new'; };
      });
  }
  function roomFor() {
    if (cfg().roomMode === 'fixo' && cfg().roomUrl) return cfg().roomUrl;
    return 'https://meet.jit.si/' + (S.pro.slug || 'consulta') + '-' + C.token(12);
  }
  async function saveAppt(form) {
    var v = fv(form), off = tz(), id = form.dataset.id, t = C.fromInputs(v.date, v.time, off), d = +v.d || 50;
    if (id) {
      var a = get(id), old = a.t;
      Object.assign(a, { t: t, d: d, mode: v.mode, status: 'agendado', tok: C.token(20) });
      await put(a); await setBusy(t, d); if (old !== t) await freeBusy(old);
      closeSheet(); toast('Sessão remarcada.', 'Avisar pelo WhatsApp', function () { waConfirm(a); }); return;
    }
    var pid = v.pid;
    if (pid === '_new') {
      if (!v.nname) return toast('Escreva o nome do paciente.');
      pid = await put({ k: 'patient', name: v.nname, phone: v.nphone, mode: v.mode, price: cfg().price || 0, active: true, created: Date.now() });
    }
    if (!pid) return toast('Escolha o paciente.');
    var n = v.rep === '2q' ? 6 : (+v.rep || 1), gap = v.rep === '2q' ? 2 * WEEK : WEEK, room = roomFor();
    for (var i = 0; i < n; i++) {
      var ti = t + i * gap;
      await put({ k: 'appt', pid: pid, t: ti, d: d, mode: v.mode, room: v.mode === 'online' ? room : '', status: 'agendado', tok: C.token(20), src: 'painel' });
      await setBusy(ti, d);
    }
    closeSheet(); S.week = weekStart(t); renderMain();
    toast(n > 1 ? n + ' sessões agendadas.' : 'Sessão agendada.');
  }
  function confirmUrl(a) {
    if (!S.pro.slug) return '';
    var u = new URL('confirmar.html', location.href);
    u.search = new URLSearchParams({ u: S.pro.slug, t: a.tok, d: String(a.t), r: a.mode === 'online' ? (a.room || '') : '' }).toString();
    return u.href;
  }
  function waConfirm(a) {
    var p = get(a.pid) || {}, first = (p.name || '').split(' ')[0];
    var txt = 'Olá, ' + first + '! Passando para confirmar sua sessão ' + C.fmt(a.t, tz(), { weekday: 'long', day: 'numeric', month: 'long' }) + ', às ' + hm(a.t) + '.';
    var cu = confirmUrl(a);
    if (cu) txt += '\nConfirme ou desmarque por aqui: ' + cu;
    if (a.mode === 'online' && a.room) txt += '\nSala de vídeo: ' + a.room;
    else if (cfg().address) txt += '\nEndereço: ' + cfg().address;
    window.open(C.waLink(p.phone, txt), '_blank', 'noopener');
  }
  async function apptDone(a) {
    a.status = 'realizado';
    var p = get(a.pid) || {};
    if (!a.payId && p.price > 0) a.payId = await put({ k: 'pay', pid: a.pid, apptId: a.id, due: a.t, amount: p.price, desc: 'Sessão de ' + dmy(a.t), paid: null });
    await put(a); renderMain();
    toast('Sessão realizada' + (a.payId ? ' e cobrança lançada.' : '.'), 'Ditar evolução', function () { noteForm(null, a.id); });
  }
  async function apptMiss(a) {
    a.status = 'falta';
    var p = get(a.pid) || {};
    if (!a.payId && p.price > 0 && confirm('Registrar cobrança desta falta (' + C.money(p.price) + ')? Use conforme o seu contrato com o paciente.'))
      a.payId = await put({ k: 'pay', pid: a.pid, apptId: a.id, due: a.t, amount: p.price, desc: 'Falta em ' + dmy(a.t), paid: null });
    await put(a); renderMain(); toast('Falta registrada.');
  }
  function apptMore(a) {
    openSheet(pname(a.pid) + ' · ' + dmy(a.t) + ' ' + hm(a.t), '<div class="stack">' +
      '<button class="btn" data-a="patient" data-id="' + a.pid + '">Abrir paciente</button>' +
      '<button class="btn" data-a="note-new" data-id="' + a.id + '">Escrever evolução desta sessão</button>' +
      (a.status !== 'desmarcado' ? '<button class="btn" data-a="appt-resched" data-id="' + a.id + '">Remarcar</button>' : '') +
      (a.status !== 'agendado' ? '<button class="btn" data-a="appt-reset" data-id="' + a.id + '">Voltar para "agendado"</button>' : '') +
      (confirmUrl(a) ? '<button class="btn" data-a="copy" data-id="' + h(confirmUrl(a)) + '">Copiar link de confirmação</button>' : '') +
      (a.status !== 'desmarcado' ? '<button class="btn dan" data-a="appt-cancel" data-id="' + a.id + '">Desmarcar</button>' : '') +
      '<button class="btn dan" data-a="appt-del" data-id="' + a.id + '">Excluir do histórico</button></div>');
  }
  async function acceptRequest(r) {
    var digits = C.digits(r.phone).slice(-9);
    var p = list('patient').find(function (x) { return (digits && C.digits(x.phone).slice(-9) === digits) || (r.email && x.email && x.email.toLowerCase() === r.email.toLowerCase()); });
    var pid = p ? p.id : await put({ k: 'patient', name: r.name, phone: r.phone, email: r.email || '', mode: r.mode, price: cfg().price || 0, active: true, created: Date.now(), src: 'página' });
    var a = { k: 'appt', pid: pid, t: r.slot, d: r.d || 50, mode: r.mode === 'presencial' ? 'presencial' : 'online', room: r.mode === 'presencial' ? '' : r.room, status: 'agendado', tok: r.tok, src: 'página' };
    a.id = await put(a);
    await fs.doc('profiles/' + S.pro.slug + '/requests/' + r.id).delete();
    S.requests.delete(r.id); renderMain();
    toast('Agendado' + (p ? ' (paciente já cadastrado).' : ' e paciente cadastrado.'), 'Avisar pelo WhatsApp', function () { waConfirm(a); });
  }
  async function rejectRequest(r) {
    if (!confirm('Recusar este pedido e liberar o horário?')) return;
    await fs.doc('profiles/' + S.pro.slug + '/requests/' + r.id).delete();
    await busyRef(r.slot).delete().catch(function () { });
    S.requests.delete(r.id); renderMain();
    if (!r.bad && r.phone) toast('Pedido recusado.', 'Avisar pelo WhatsApp', function () {
      window.open(C.waLink(r.phone, 'Olá, ' + r.name.split(' ')[0] + '! Infelizmente não consigo atender no horário de ' + dmy(r.slot) + ' às ' + hm(r.slot) + '. ' + (pubLink() ? 'Você pode escolher outro horário aqui: ' + pubLink() : '')), '_blank', 'noopener');
    });
  }
  function blockForm() {
    var off = tz(), t = S.week && S.week > Date.now() ? S.week : Date.now();
    openSheet('Bloquear horário', '<form id="fblock" class="stack"><p class="small muted">Bloqueios somem da sua página de agendamento. Use para férias, supervisão, compromissos.</p>' +
      '<div class="grid2"><label><span>De (dia)</span><input type="date" name="date" required value="' + C.dateInput(t, off) + '"></label><label><span>Até (dia)</span><input type="date" name="date2" value=""></label></div>' +
      '<label class="check"><input type="checkbox" name="all" checked> <span>Dia(s) inteiro(s)</span></label>' +
      '<div class="grid2"><label><span>Das</span><input type="time" name="t1" value="12:00"></label><label><span>Até</span><input type="time" name="t2" value="13:00"></label></div>' +
      '<button class="btn pri">Bloquear</button></form>');
  }
  async function saveBlock(form) {
    if (!S.pro.slug) return toast('Crie primeiro sua página de agendamento (aba Consultório).');
    var v = fv(form), off = tz();
    var d0 = C.fromInputs(v.date, '00:00', off), d1 = v.date2 ? C.fromInputs(v.date2, '00:00', off) : d0;
    for (var d = d0; d <= d1; d += DAY) {
      if (v.all) await setBusy(d, 1440, 'b');
      else { var a = C.toMin(v.t1), b = C.toMin(v.t2); if (b > a) await setBusy(d + a * 60000, b - a, 'b'); }
    }
    closeSheet(); toast('Horário bloqueado.');
  }

  /* ---------------- PACIENTES ---------------- */
  function nextAppt(pid) {
    var now = Date.now();
    return list('appt').filter(function (a) { return a.pid === pid && a.t > now && a.status !== 'desmarcado'; }).sort(function (a, b) { return a.t - b.t; })[0];
  }
  function due(pid) { return list('pay').filter(function (p) { return (!pid || p.pid === pid) && !p.paid; }).reduce(function (s, p) { return s + (+p.amount || 0); }, 0); }
  function vPatients() {
    var ps = list('patient').filter(function (p) { return S.showArch ? p.active === false : p.active !== false; }).sort(byName);
    return '<div class="head"><h2>Pacientes</h2><button class="btn sm pri" data-a="patient-new">+ Paciente</button></div>' +
      '<input type="search" id="psearch" placeholder="Buscar por nome ou telefone" aria-label="Buscar paciente">' +
      '<div class="list" id="plist">' + (ps.length ? ps.map(function (p) {
        var n = nextAppt(p.id), d = due(p.id);
        return '<div class="item clickable" data-a="patient" data-id="' + p.id + '" data-s="' + h((p.name + ' ' + C.digits(p.phone)).toLowerCase()) + '"><div class="main"><b>' + h(p.name) + '</b>' +
          '<span class="small muted">' + (n ? 'Próxima: ' + dmy(n.t) + ' ' + hm(n.t) : 'Sem sessão marcada') + (p.phone ? ' · ' + h(p.phone) : '') + '</span></div>' +
          (d > 0 ? '<span class="chip warn">A receber ' + C.money(d) + '</span>' : '') + '</div>';
      }).join('') : '<p class="empty">' + (S.showArch ? 'Nenhum paciente arquivado.' : 'Nenhum paciente ainda. Cadastre aqui ou receba pedidos pela sua página.') + '</p>') + '</div>' +
      '<button class="btn ghost sm" data-a="toggle-arch">' + (S.showArch ? 'Ver ativos' : 'Ver arquivados') + '</button>';
  }
  function patientForm(p) {
    p = p || {};
    openSheet(p.id ? 'Editar paciente' : 'Novo paciente', '<form id="fpatient" class="stack" data-id="' + (p.id || '') + '">' +
      '<label><span>Nome completo</span><input name="name" required value="' + h(p.name) + '"></label>' +
      '<div class="grid2"><label><span>WhatsApp</span><input name="phone" inputmode="tel" value="' + h(p.phone) + '"></label><label><span>E-mail</span><input name="email" type="email" value="' + h(p.email) + '"></label></div>' +
      '<div class="grid2"><label><span>CPF (para recibo)</span><input name="cpf" inputmode="numeric" value="' + h(p.cpf) + '"></label><label><span>Nascimento</span><input name="birth" type="date" value="' + h(p.birth) + '"></label></div>' +
      '<div class="grid2"><label><span>Valor da sessão (R$)</span><input name="price" inputmode="decimal" value="' + (p.price ? String(p.price).replace('.', ',') : (cfg().price ? String(cfg().price).replace('.', ',') : '')) + '"></label>' +
      '<label><span>Modalidade</span><select name="mode"><option value="online">On-line</option><option value="presencial"' + (p.mode === 'presencial' ? ' selected' : '') + '>Presencial</option></select></label></div>' +
      '<label><span>Responsável financeiro / quem paga (se não for o paciente)</span><input name="payer" value="' + h(p.payer) + '"></label>' +
      '<label><span>Contato de emergência</span><input name="emerg" value="' + h(p.emerg) + '"></label>' +
      '<label><span>Observações administrativas</span><textarea name="obs" rows="3" style="min-height:80px">' + h(p.obs) + '</textarea></label>' +
      '<button class="btn pri">Salvar</button>' +
      (p.id ? '<button type="button" class="btn" data-a="patient-arch" data-id="' + p.id + '">' + (p.active === false ? 'Reativar paciente' : 'Arquivar (encerrou o atendimento)') + '</button>' : '') + '</form>');
  }
  async function savePatient(form) {
    var v = fv(form), id = form.dataset.id, p = id ? get(id) : { k: 'patient', active: true, created: Date.now() };
    Object.assign(p, { name: v.name, phone: v.phone, email: v.email, cpf: v.cpf, birth: v.birth, price: C.parseMoney(v.price), mode: v.mode, payer: v.payer, emerg: v.emerg, obs: v.obs });
    var nid = await put(p); closeSheet();
    if (!id) { S.tab = 'pacientes'; S.pid = nid; render(); } else renderMain();
    toast('Paciente salvo.');
  }
  function vPatient() {
    var p = get(S.pid);
    if (!p) { S.pid = null; return vPatients(); }
    var age = p.birth ? Math.floor((Date.now() - new Date(p.birth + 'T12:00')) / (365.25 * DAY)) : null, n = nextAppt(p.id), d = due(p.id);
    var tabs = [['evol', 'Evolução'], ['docs', 'Documentos'], ['sess', 'Sessões'], ['fin', 'Financeiro']];
    var html = '<div class="row"><button class="btn sm ghost" data-a="back">‹ Pacientes</button></div>' +
      '<section class="card stack"><div class="head"><div><h2>' + h(p.name) + (p.active === false ? ' <span class="chip">arquivado</span>' : '') + '</h2>' +
      '<p class="small muted">' + [age != null && age >= 0 ? age + ' anos' : '', p.phone, p.email, p.mode === 'presencial' ? 'presencial' : 'on-line', p.price ? C.money(p.price) + '/sessão' : ''].filter(Boolean).map(h).join(' · ') + '</p>' +
      '<p class="small">' + (n ? 'Próxima sessão: <b>' + dlong(n.t) + ' às ' + hm(n.t) + '</b>' : 'Sem próxima sessão') + (d > 0 ? ' · <span class="chip warn">A receber ' + C.money(d) + '</span>' : '') + '</p></div>' +
      '<div class="row"><button class="btn sm" data-a="patient-edit" data-id="' + p.id + '">Editar</button>' + (p.phone ? '<a class="btn sm" target="_blank" rel="noopener" href="' + C.waLink(p.phone, '') + '">WhatsApp</a>' : '') +
      '<button class="btn sm pri" data-a="appt-for" data-id="' + p.id + '">Agendar</button></div></div>' + (p.obs ? '<p class="small muted">' + h(p.obs) + '</p>' : '') + '</section>' +
      '<div class="subtabs" role="tablist">' + tabs.map(function (t) { return '<button role="tab" data-a="ptab" data-id="' + t[0] + '" aria-current="' + (S.ptab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    html += { evol: pEvol, docs: pDocs, sess: pSess, fin: pFin }[S.ptab](p);
    return html;
  }
  function pEvol(p) {
    var ns = list('note').filter(function (n) { return n.pid === p.id; }).sort(function (a, b) { return b.date - a.date || b.u - a.u; });
    return '<div class="row"><button class="btn pri" data-a="note-new">🎙 Nova evolução</button>' + (ns.length ? '<button class="btn" data-a="print-record">Imprimir prontuário</button>' : '') + '</div>' +
      '<div class="list">' + (ns.length ? ns.map(function (n) {
        return '<article class="card stack"><div class="head"><div><b>' + dmy(n.date) + '</b> ' + (n.addOf ? '<span class="chip">adendo</span> ' : '') +
          (n.signed ? '<span class="chip ok">assinada ' + dmy(n.signed.at) + ' ' + hm(n.signed.at) + '</span>' : '<span class="chip warn">rascunho</span>') + '</div>' +
          '<div class="row">' + (n.signed ? '<button class="btn sm" data-a="note-add" data-id="' + n.id + '">Adendo</button>' :
            '<button class="btn sm" data-a="note-edit" data-id="' + n.id + '">Revisar</button><button class="btn sm pri" data-a="note-sign" data-id="' + n.id + '">Assinar</button>') + '</div></div>' +
          '<div class="note-text">' + h(n.text) + '</div>' + (n.signed ? '<p class="small muted mono">Código de integridade: ' + n.signed.hash.slice(0, 16) + '</p>' : '') + '</article>';
      }).join('') : '<p class="empty">Nenhuma evolução registrada.</p>') + '</div>';
  }
  function pDocs(p) {
    var ds = list('doc').filter(function (d) { return d.pid === p.id; }).sort(function (a, b) { return b.date - a.date; });
    return '<div class="row"><button class="btn pri" data-a="doc-new">+ Documento</button></div><div class="list">' + (ds.length ? ds.map(function (d) {
      return '<div class="item"><div class="main"><b>' + h(d.title) + '</b><span class="small muted">' + dmy(d.date) + '</span></div><div class="row"><button class="btn sm" data-a="doc-open" data-id="' + d.id + '">Abrir</button><button class="btn sm pri" data-a="doc-print" data-id="' + d.id + '">PDF</button></div></div>';
    }).join('') : '<p class="empty">Nenhum documento emitido.</p>') + '</div>';
  }
  function pSess(p) {
    var as = list('appt').filter(function (a) { return a.pid === p.id; }).sort(function (a, b) { return b.t - a.t; });
    var c = { realizado: 0, falta: 0 }; as.forEach(function (a) { if (c[a.status] != null) c[a.status]++; });
    return '<p class="small muted">' + c.realizado + ' realizadas · ' + c.falta + ' faltas</p><div class="list">' + (as.length ? as.map(apptRow).join('') : '<p class="empty">Nenhuma sessão.</p>') + '</div>';
  }
  function pFin(p) {
    var ps = list('pay').filter(function (x) { return x.pid === p.id; }).sort(function (a, b) { return b.due - a.due; });
    return '<div class="row"><button class="btn pri" data-a="pay-new" data-id="' + p.id + '">+ Cobrança</button></div><div class="list">' + (ps.length ? ps.map(payRow).join('') : '<p class="empty">Nenhum lançamento.</p>') + '</div>';
  }
  async function archivePatient(p) {
    p.active = p.active === false; await put(p); closeSheet(); renderMain();
    toast(p.active ? 'Paciente reativado.' : 'Paciente arquivado. O prontuário continua guardado.');
  }

  /* ---------------- EVOLUÇÃO (ditada) ---------------- */
  var NOTE_TEMPLATE = 'Demanda / tema trazido:\n\nIntervenções e manejo:\n\nObservações clínicas:\n\nEncaminhamentos e plano:\n';
  function noteForm(n, apptId, addOf) {
    var a = apptId ? get(apptId) : null;
    if (a && !n) { var ex = list('note').find(function (x) { return x.apptId === apptId; }); if (ex) { S.tab = 'pacientes'; S.pid = ex.pid; S.ptab = 'evol'; render(); if (!ex.signed) noteForm(ex); return; } }
    var pid = (n && n.pid) || (a && a.pid) || (addOf && get(addOf).pid) || S.pid;
    if (!pid) return toast('Abra um paciente primeiro.');
    var date = (n && n.date) || (a && a.t) || Date.now(), SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    openSheet((addOf ? 'Adendo · ' : 'Evolução · ') + pname(pid), '<form id="fnote" class="stack" data-id="' + ((n && n.id) || '') + '" data-pid="' + pid + '" data-appt="' + (apptId || (n && n.apptId) || '') + '" data-add="' + (addOf || '') + '">' +
      '<label><span>Data da sessão</span><input type="date" name="date" value="' + C.dateInput(date, tz()) + '" required></label>' +
      '<div class="row">' + (SR ? '<button type="button" class="btn pri" id="mic">🎙 Ditar</button>' : '') +
      '<button type="button" class="btn sm" id="tpl">Inserir roteiro</button></div>' +
      (SR ? '<p class="small muted" id="micinfo">Toque em Ditar e fale. Diga "vírgula", "ponto", "nova linha" ou "parágrafo" para pontuar. O áudio não é gravado; o reconhecimento de voz é feito pelo navegador (Google no Chrome/Android, Apple no iPhone).</p>'
        : '<p class="small muted">Para ditar, toque no campo abaixo e use o microfone do teclado do celular.</p>') +
      '<label><span>Texto</span><textarea name="text" rows="12" style="min-height:260px">' + h((n && n.text) || '') + '</textarea></label>' +
      '<div class="row"><button class="btn" name="go" value="draft">Salvar rascunho</button><button class="btn pri" name="go" value="sign">Salvar e assinar</button></div>' +
      '<p class="small muted">Depois de assinada, a evolução não pode mais ser editada; correções entram como adendo.</p></form>', function (sh) {
        var ta = sh.querySelector('textarea');
        sh.querySelector('#tpl').onclick = function () { ta.value = (ta.value ? ta.value.trimEnd() + '\n\n' : '') + NOTE_TEMPLATE; ta.focus(); };
        var mic = sh.querySelector('#mic'); if (mic) mic.onclick = function () { toggleDictation(mic, ta); };
      });
  }
  function spoken(s) {
    return s.replace(/\s*\b(nova linha)\b\s*/gi, '\n').replace(/\s*\b(parágrafo|paragrafo)\b\s*/gi, '\n\n')
      .replace(/\s*\bvírgula\b/gi, ',').replace(/\s*\bvirgula\b/gi, ',').replace(/\s*\bponto final\b/gi, '.').replace(/\s*\bponto de interrogação\b/gi, '?')
      .replace(/\s*\bdois pontos\b/gi, ':').replace(/\s*\bponto\b(?! de)/gi, '.')
      .replace(/(^|[.?!]\s+|\n)([a-zà-ú])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }
  function toggleDictation(btn, ta) {
    if (S.rec) { S.rec.stop(); return; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = new SR(), base = ta.value, info = $('#micinfo');
    rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true;
    var sep = function () { return base && !/\s$/.test(base) ? ' ' : ''; };
    rec.onresult = function (e) {
      var fin = '', tmp = '';
      for (var i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) fin += e.results[i][0].transcript; else tmp += e.results[i][0].transcript; }
      if (fin) base += sep() + spoken(fin.trim());
      ta.value = base + (tmp ? sep() + tmp : ''); ta.scrollTop = ta.scrollHeight;
    };
    rec.onerror = function (e) { if (info) info.textContent = e.error === 'not-allowed' ? 'O navegador bloqueou o microfone. Libere nas configurações do site.' : 'O ditado parou (' + e.error + '). Toque em Ditar para continuar.'; };
    rec.onend = function () {
      if (S.rec === rec) { S.rec = null; btn.className = 'btn pri'; btn.textContent = '🎙 Ditar'; ta.value = base; }
    };
    ta.addEventListener('input', function () { base = ta.value; });
    S.rec = rec; rec.start(); btn.className = 'btn rec'; btn.textContent = '■ Parar ditado';
  }
  async function signNote(n) {
    n.signed = { at: Date.now(), by: cfg().name || S.user.email, reg: cfg().reg || '' };
    n.signed.hash = await C.sha256([n.pid, n.date, n.text, n.signed.at, n.signed.by].join('|'));
    await put(n);
  }
  async function saveNote(form, go) {
    var v = fv(form), id = form.dataset.id;
    if (!v.text) return toast('O texto está vazio.');
    if (go === 'sign' && !confirm('Assinar agora? Depois não será possível editar, só acrescentar adendo.')) return;
    var n = id ? get(id) : { k: 'note', pid: form.dataset.pid, apptId: form.dataset.appt || null, addOf: form.dataset.add || null, created: Date.now(), signed: null };
    if (n.signed) return toast('Evolução já assinada.');
    n.text = v.text; n.date = C.fromInputs(v.date, '12:00', tz());
    if (go === 'sign') await signNote(n); else await put(n);
    closeSheet(); S.tab = 'pacientes'; S.pid = n.pid; S.ptab = 'evol'; render();
    toast(go === 'sign' ? 'Evolução assinada.' : 'Rascunho salvo.');
  }

  /* ---------------- DOCUMENTOS ---------------- */
  function docTemplates(p, a) {
    var c = cfg(), off = tz(), city = c.city || '[cidade]';
    var cpf = p.cpf ? ', CPF ' + p.cpf : '';
    var when = a ? dmy(a.t) : dmy(Date.now()), from = a ? hm(a.t) : '[início]', to = a ? hm(a.t + (a.d || 50) * 60000) : '[término]';
    var first = list('appt').filter(function (x) { return x.pid === p.id && x.status === 'realizado'; }).sort(function (x, y) { return x.t - y.t; })[0];
    var since = first ? C.fmt(first.t, off, { month: 'long', year: 'numeric' }) : '[mês/ano]';
    var prof = (c.name || '[nome]') + (c.reg ? ', ' + c.reg : '');
    return {
      decl: ['Declaração de comparecimento', 'Declaro, para os devidos fins, que ' + p.name + cpf + ', compareceu a atendimento psicológico no dia ' + when + ', das ' + from + ' às ' + to + '.\n\nEsta declaração não contém informações sobre o conteúdo do atendimento.'],
      acomp: ['Declaração de acompanhamento', 'Declaro, para os devidos fins, que ' + p.name + cpf + ', está em acompanhamento psicológico comigo desde ' + since + ', com frequência [semanal/quinzenal].'],
      atest: ['Atestado psicológico', 'Atesto, para os devidos fins, que ' + p.name + cpf + ', foi avaliado(a) por mim e apresenta [condição psicológica observada, descrita sem detalhes desnecessários], necessitando de [afastamento de suas atividades por __ dias, a partir de ' + when + ' / outra finalidade].\n\nFinalidade: [informar a quem e para que se destina].'],
      rel: ['Relatório psicológico', '1. IDENTIFICAÇÃO\nAutor(a): ' + prof + '\nInteressado(a): [quem solicitou]\nPessoa atendida: ' + p.name + '\nFinalidade: [para que se destina]\n\n2. DESCRIÇÃO DA DEMANDA\n[motivo do atendimento e de onde veio a solicitação]\n\n3. PROCEDIMENTO\nAtendimentos psicológicos ' + (p.mode === 'presencial' ? 'presenciais' : 'on-line') + ' desde ' + since + ', [número] sessões realizadas, [recursos e técnicas utilizados].\n\n4. ANÁLISE\n[descrição do que foi observado, apenas o necessário para a finalidade]\n\n5. CONCLUSÃO\n[síntese e encaminhamentos]'],
      livre: ['Documento', '']
    };
  }
  function docForm(d, pid) {
    var p = get((d && d.pid) || pid || S.pid); if (!p) return;
    var last = list('appt').filter(function (x) { return x.pid === p.id && x.status === 'realizado'; }).sort(function (x, y) { return y.t - x.t; })[0];
    var T = docTemplates(p, last);
    openSheet(d ? d.title : 'Novo documento · ' + p.name, '<form id="fdoc" class="stack" data-id="' + ((d && d.id) || '') + '" data-pid="' + p.id + '">' +
      (d ? '' : '<label><span>Modelo</span><select name="type"><option value="decl">Declaração de comparecimento</option><option value="acomp">Declaração de acompanhamento</option><option value="atest">Atestado psicológico</option><option value="rel">Relatório psicológico</option><option value="livre">Em branco</option></select></label>') +
      '<label><span>Título</span><input name="title" required value="' + h(d ? d.title : T.decl[0]) + '"></label>' +
      '<label><span>Texto</span><textarea name="body" rows="14" style="min-height:300px">' + h(d ? d.body : T.decl[1]) + '</textarea></label>' +
      '<p class="small muted">Revise os trechos entre [colchetes]. Siga a Resolução CFP nº 06/2019 (elaboração de documentos psicológicos): informe só o necessário para a finalidade.</p>' +
      '<div class="row"><button class="btn" name="go" value="save">Salvar</button><button class="btn pri" name="go" value="print">Salvar e gerar PDF</button></div>' +
      (d ? '<button type="button" class="btn dan sm" data-a="doc-del" data-id="' + d.id + '">Excluir documento</button>' : '') + '</form>', function (sh) {
        var sel = sh.querySelector('[name=type]');
        if (sel) sel.onchange = function () { var t = T[sel.value]; sh.querySelector('[name=title]').value = t[0]; sh.querySelector('[name=body]').value = t[1]; };
      });
  }
  async function saveDoc(form, go) {
    var v = fv(form), id = form.dataset.id, d = id ? get(id) : { k: 'doc', pid: form.dataset.pid, date: Date.now() };
    d.title = v.title; d.body = v.body; await put(d); closeSheet(); renderMain();
    if (go === 'print') printDoc(d.title, d.body); else toast('Documento salvo.');
  }
  function letterhead() {
    var c = cfg();
    return '<div class="lh">' + (c.logo ? '<img src="' + h(c.logo) + '" alt="">' : '') + '<div><b>' + h(c.name || '') + '</b><span>' + h(c.reg || '') + '</span></div></div>';
  }
  function footer() { var c = cfg(); return '<div class="ft">' + [c.address, c.phone, c.email].filter(Boolean).map(h).join(' · ') + '</div>'; }
  function signature() { var c = cfg(); return '<div class="sig">' + h(c.name || '') + '<br>' + h(c.reg || '') + '</div>'; }
  function placeDate(t) { return '<p class="place">' + h(cfg().city || '') + (cfg().city ? ', ' : '') + C.fmt(t || Date.now(), tz(), { day: 'numeric', month: 'long', year: 'numeric' }) + '.</p>'; }
  function doPrint(inner, title) {
    var el = $('#print'); el.style.setProperty('--pc', cfg().color || '#4E3658');
    el.innerHTML = letterhead() + inner + footer();
    var old = document.title; document.title = title || old;
    setTimeout(function () { window.print(); document.title = old; }, 60);
  }
  function clearPrint() { var el = $('#print'); if (el) el.innerHTML = ''; }
  window.addEventListener('afterprint', function () { setTimeout(clearPrint, 500); });
  function printDoc(title, body) { doPrint('<h1>' + h(title) + '</h1><div class="body">' + h(body) + '</div>' + placeDate() + signature(), title); }
  function printRecord(p) {
    var ns = list('note').filter(function (n) { return n.pid === p.id && n.signed; }).sort(function (a, b) { return a.date - b.date; });
    doPrint('<h1>Registro documental · ' + h(p.name) + '</h1>' + ns.map(function (n) {
      return '<div class="entry"><b>' + dmy(n.date) + (n.addOf ? ' (adendo)' : '') + '</b><div class="body">' + h(n.text) + '</div><small>Assinado por ' + h(n.signed.by) + ' ' + h(n.signed.reg) + ' em ' + dmy(n.signed.at) + ' ' + hm(n.signed.at) + ' · integridade ' + n.signed.hash.slice(0, 16) + '</small></div>';
    }).join('') + placeDate() + signature(), 'Prontuário ' + p.name);
  }

  /* ---------------- FINANCEIRO ---------------- */
  function monthStart(t) { var w = C.wall(t, tz()); return C.fromWall(w.y, w.m, 1, 0, tz()); }
  function nextMonth(t) { var w = C.wall(t, tz()); return C.fromWall(w.y, w.m + 1, 1, 0, tz()); }
  function payRow(x) {
    var late = !x.paid && x.due < C.dayStart(Date.now(), tz());
    return '<div class="item"><div class="main"><b>' + h(pname(x.pid)) + ' · ' + C.money(x.amount) + '</b><span class="small muted">' + h(x.desc || '') + ' · vence ' + dmy(x.due) + '</span></div>' +
      '<div class="row">' + (x.paid ? '<span class="chip ok">Recebido ' + dmy(x.paid.at) + ' · ' + h(x.paid.method) + '</span><button class="btn sm" data-a="receipt" data-id="' + x.id + '">Recibo</button>'
        : '<span class="chip ' + (late ? 'bad' : 'warn') + '">' + (late ? 'Em atraso' : 'A receber') + '</span><button class="btn sm" data-a="pix" data-id="' + x.id + '">PIX</button><button class="btn sm pri" data-a="pay-recv" data-id="' + x.id + '">Recebi</button>') +
      '<button class="btn sm ghost" data-a="pay-edit" data-id="' + x.id + '" aria-label="Editar lançamento">✎</button></div></div>';
  }
  function vFinance() {
    var m0 = S.month || monthStart(Date.now()), m1 = nextMonth(m0), off = tz();
    var pays = list('pay'), inMonth = pays.filter(function (x) { return x.due >= m0 && x.due < m1; });
    var recv = pays.filter(function (x) { return x.paid && x.paid.at >= m0 && x.paid.at < m1; }).reduce(function (s, x) { return s + (+x.amount || 0); }, 0);
    var open = inMonth.filter(function (x) { return !x.paid; }).reduce(function (s, x) { return s + (+x.amount || 0); }, 0);
    var late = pays.filter(function (x) { return !x.paid && x.due < C.dayStart(Date.now(), off); }).reduce(function (s, x) { return s + (+x.amount || 0); }, 0);
    var ap = list('appt').filter(function (a) { return a.t >= m0 && a.t < m1; });
    var done = ap.filter(function (a) { return a.status === 'realizado'; }).length, miss = ap.filter(function (a) { return a.status === 'falta'; }).length;
    return '<div class="head"><div class="row"><button class="btn sm" data-a="mo" data-id="-1" aria-label="Mês anterior">‹</button><h2>' + cap(C.fmt(m0, off, { month: 'long', year: 'numeric' })) + '</h2><button class="btn sm" data-a="mo" data-id="1" aria-label="Próximo mês">›</button></div>' +
      '<div class="row"><button class="btn sm" data-a="csv">Exportar para o contador</button><button class="btn sm pri" data-a="pay-new">+ Lançamento</button></div></div>' +
      '<div class="kpis"><div class="kpi"><b class="okc">' + C.money(recv) + '</b><span>Recebido no mês</span></div><div class="kpi"><b>' + C.money(open) + '</b><span>A receber no mês</span></div>' +
      '<div class="kpi"><b class="' + (late ? 'err' : '') + '">' + C.money(late) + '</b><span>Em atraso (total)</span></div><div class="kpi"><b>' + done + ' <small class="muted">/ ' + miss + '</small></b><span>Sessões realizadas / faltas</span></div></div>' +
      (cfg().pix && cfg().pix.key ? '' : '<div class="note info">Cadastre sua chave PIX em <a href="#" data-a="tab" data-id="config">Consultório</a> para gerar QR Code de cobrança.</div>') +
      '<div class="list">' + (inMonth.length ? inMonth.sort(function (a, b) { return a.due - b.due; }).map(payRow).join('') : '<p class="empty">Nenhum lançamento neste mês. Ao marcar uma sessão como realizada, a cobrança entra aqui sozinha (se o paciente tiver valor cadastrado).</p>') + '</div>' +
      '<p class="small muted">Profissionais de saúde pessoa física devem emitir o recibo oficial pelo app Receita Saúde (Receita Federal). O recibo daqui serve de comprovante para o paciente e para o seu controle.</p>';
  }
  function payForm(x, pid) {
    x = x || { due: Date.now(), pid: pid || '' };
    var p = get(x.pid);
    openSheet(x.id ? 'Editar lançamento' : 'Novo lançamento', '<form id="fpay" class="stack" data-id="' + (x.id || '') + '">' +
      '<label><span>Paciente</span><select name="pid" required><option value="">Escolha…</option>' + patientOptions(x.pid) + '</select></label>' +
      '<div class="grid2"><label><span>Valor (R$)</span><input name="amount" inputmode="decimal" required value="' + (x.amount ? String(x.amount).replace('.', ',') : (p && p.price ? String(p.price).replace('.', ',') : '')) + '"></label>' +
      '<label><span>Vencimento</span><input type="date" name="due" required value="' + C.dateInput(x.due, tz()) + '"></label></div>' +
      '<label><span>Descrição</span><input name="desc" value="' + h(x.desc || 'Sessão de psicoterapia') + '"></label>' +
      '<label class="check"><input type="checkbox" name="paid"' + (x.paid ? ' checked' : '') + '> <span>Já recebido</span></label>' +
      '<label><span>Forma de pagamento</span><select name="method">' + METHODS.map(function (m) { return '<option' + (x.paid && x.paid.method === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label>' +
      '<button class="btn pri">Salvar</button>' + (x.id ? '<button type="button" class="btn dan" data-a="pay-del" data-id="' + x.id + '">Excluir lançamento</button>' : '') + '</form>');
  }
  async function savePay(form) {
    var v = fv(form), id = form.dataset.id, x = id ? get(id) : { k: 'pay' };
    x.pid = v.pid; x.amount = C.parseMoney(v.amount); x.due = C.fromInputs(v.due, '12:00', tz()); x.desc = v.desc;
    x.paid = v.paid ? { at: (x.paid && x.paid.at) || Date.now(), method: v.method } : null;
    if (!(x.amount > 0)) return toast('Informe o valor.');
    await put(x); closeSheet(); renderMain(); toast('Lançamento salvo.');
  }
  function recvForm(x) {
    openSheet('Recebimento · ' + pname(x.pid), '<form id="frecv" class="stack" data-id="' + x.id + '"><p><b>' + C.money(x.amount) + '</b> · ' + h(x.desc) + '</p>' +
      '<div class="grid2"><label><span>Forma</span><select name="method">' + METHODS.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select></label>' +
      '<label><span>Data</span><input type="date" name="at" value="' + C.dateInput(Date.now(), tz()) + '"></label></div><button class="btn pri">Confirmar recebimento</button></form>');
  }
  async function saveRecv(form) {
    var v = fv(form), x = get(form.dataset.id);
    x.paid = { at: C.fromInputs(v.at, '12:00', tz()), method: v.method }; await put(x); closeSheet(); renderMain();
    toast('Recebido.', 'Gerar recibo', function () { printReceipt(x); });
  }
  function pixFor(x) {
    var px = cfg().pix || {};
    return C.pix({ key: C.pixKey(px.type, px.key), name: px.name || cfg().name, city: px.city || cfg().city, amount: x.amount, txid: 'S' + x.id.slice(0, 12) });
  }
  function pixSheet(x) {
    var px = cfg().pix || {};
    if (!px.key) { S.tab = 'config'; render(); return toast('Cadastre sua chave PIX primeiro.'); }
    var code = pixFor(x), p = get(x.pid) || {}, svg = '';
    try { var q = qrcode(0, 'M'); q.addData(code); q.make(); svg = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); } catch (e) { svg = '<p class="small err">Não foi possível desenhar o QR Code; use o copia e cola.</p>'; }
    var msg = 'Olá, ' + (p.name || '').split(' ')[0] + '! Segue o PIX de ' + C.money(x.amount) + ' (' + (x.desc || 'sessão') + ').\n\nPIX copia e cola:\n' + code;
    openSheet('PIX · ' + C.money(x.amount), '<div class="stack"><div class="qr">' + svg + '</div>' +
      '<label><span>PIX copia e cola</span><textarea readonly class="mono" rows="4" style="min-height:90px">' + h(code) + '</textarea></label>' +
      '<div class="row"><button class="btn" data-a="copy" data-id="' + h(code) + '">Copiar código</button>' + (p.phone ? '<a class="btn pri" target="_blank" rel="noopener" href="' + C.waLink(p.phone, msg) + '">Enviar pelo WhatsApp</a>' : '') + '</div>' +
      '<p class="small muted">O dinheiro cai direto na sua conta. Quando chegar, toque em "Recebi".</p></div>');
  }
  function printReceipt(x) {
    var p = get(x.pid) || {}, c = cfg(), payer = p.payer || p.name;
    var body = 'Recebi de ' + payer + (p.cpf && !p.payer ? ', CPF ' + p.cpf : '') + ', a quantia de ' + C.money(x.amount) + ' (' + C.extenso(x.amount) + '), referente a ' + (x.desc || 'atendimento psicológico').toLowerCase() +
      (p.payer ? ' prestado a ' + p.name + (p.cpf ? ', CPF ' + p.cpf : '') : '') + ', pago via ' + (x.paid ? x.paid.method : '—') + ' em ' + (x.paid ? dmy(x.paid.at) : '—') + '.' +
      (c.doc ? '\n\nProfissional: ' + c.name + ' · ' + c.doc + (c.reg ? ' · ' + c.reg : '') : '');
    doPrint('<h1>Recibo</h1><p style="text-align:right;font-weight:700">' + C.money(x.amount) + '</p><div class="body">' + h(body) + '</div>' + placeDate(x.paid && x.paid.at) + signature(), 'Recibo ' + (p.name || ''));
  }
  function exportCsv() {
    var m0 = S.month || monthStart(Date.now()), m1 = nextMonth(m0);
    var rows = [['data_recebimento', 'paciente', 'cpf_paciente', 'responsavel_pagamento', 'descricao', 'valor', 'forma']];
    list('pay').filter(function (x) { return x.paid && x.paid.at >= m0 && x.paid.at < m1; }).sort(function (a, b) { return a.paid.at - b.paid.at; }).forEach(function (x) {
      var p = get(x.pid) || {}; rows.push([dmy(x.paid.at), p.name || '', p.cpf || '', p.payer || '', x.desc || '', String(x.amount).replace('.', ','), x.paid.method]);
    });
    download('recebimentos-' + C.dateInput(m0, tz()).slice(0, 7) + '.csv', '﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\n'), 'text/csv');
  }
  function download(name, text, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------------- CONSULTÓRIO (configurações) ---------------- */
  function vConfig() {
    var c = cfg(), pr = S.prof || {}, px = c.pix || {}, av = pr.av || { 1: [[480, 720], [840, 1080]], 2: [[480, 720], [840, 1080]], 3: [[480, 720], [840, 1080]], 4: [[480, 720], [840, 1080]], 5: [[480, 720]] };
    var link = pubLink();
    return '<h2>Consultório</h2>' +
      '<form id="fcfg" class="card stack"><h3>Identificação e timbre</h3>' +
      '<div class="grid2"><label><span>Nome profissional</span><input name="name" required value="' + h(c.name || S.user.displayName) + '"></label>' +
      '<label><span>Profissão e registro</span><input name="reg" placeholder="Psicóloga · CRP 06/123456" value="' + h(c.reg) + '"></label></div>' +
      '<div class="grid2"><label><span>CPF ou CNPJ (sai no recibo)</span><input name="doc" value="' + h(c.doc) + '"></label><label><span>Telefone</span><input name="phone" inputmode="tel" value="' + h(c.phone) + '"></label></div>' +
      '<div class="grid2"><label><span>E-mail de contato</span><input name="email" type="email" value="' + h(c.email || S.user.email) + '"></label><label><span>Cidade</span><input name="city" value="' + h(c.city) + '"></label></div>' +
      '<label><span>Endereço do consultório (se atende presencial)</span><input name="address" value="' + h(c.address) + '"></label>' +
      '<div class="grid2"><label><span>Logotipo (opcional)</span><input type="file" name="logo" accept="image/*"></label><label><span>Cor do timbre</span><input type="color" name="color" value="' + h(c.color || '#4E3658') + '" style="padding:4px"></label></div>' +
      (c.logo ? '<div class="row"><img src="' + h(c.logo) + '" alt="Logotipo atual" style="max-height:48px"><button type="button" class="btn sm" data-a="logo-del">Remover logotipo</button></div>' : '') +
      '<div class="grid2"><label><span>Valor padrão da sessão (R$)</span><input name="price" inputmode="decimal" value="' + (c.price ? String(c.price).replace('.', ',') : '') + '"></label>' +
      '<label><span>Fuso horário</span><select name="tz">' + [[-120, 'Fernando de Noronha'], [-180, 'Brasília'], [-240, 'Manaus / Cuiabá'], [-300, 'Rio Branco']].map(function (z) { return '<option value="' + z[0] + '"' + (tz() === z[0] ? ' selected' : '') + '>' + z[1] + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="grid2"><label><span>Sala de vídeo</span><select name="roomMode"><option value="jitsi">Automática (Jitsi, grátis)</option><option value="fixo"' + (c.roomMode === 'fixo' ? ' selected' : '') + '>Meu link fixo (Meet, Zoom…)</option></select></label>' +
      '<label><span>Link fixo da sala</span><input name="roomUrl" type="url" placeholder="https://meet.google.com/…" value="' + h(c.roomUrl) + '"></label></div>' +
      '<button class="btn pri">Salvar identificação</button></form>' +

      '<form id="fprof" class="card stack"><h3>Página de agendamento</h3>' +
      (S.pro.slug ? '<p>Seu link: <a href="' + h(link) + '" target="_blank" rel="noopener">' + h(link) + '</a></p><div class="row"><button type="button" class="btn sm" data-a="copy" data-id="' + h(link) + '">Copiar link</button>' +
        '<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent('Agende sua sessão comigo por aqui: ' + link) + '">Enviar pelo WhatsApp</a></div>' +
        '<label class="check"><input type="checkbox" name="on"' + (pr.on !== false ? ' checked' : '') + '> <span>Página aberta para novos agendamentos</span></label>'
        : '<label><span>Endereço da sua página (só letras minúsculas, números e hífen; não muda depois)</span><input name="slug" required pattern="[a-z0-9\\-]{3,40}" placeholder="ana-souza-psi" value="' + h(slugify(c.name || S.user.displayName || '')) + '"></label>') +
      '<label><span>Apresentação curta (aparece para o paciente)</span><textarea name="bio" rows="3" style="min-height:80px" placeholder="Psicoterapia para adultos, abordagem…">' + h(pr.bio) + '</textarea></label>' +
      '<div class="grid2"><label><span>Duração da sessão (min)</span><input type="number" name="dur" min="10" max="240" value="' + (pr.dur || 50) + '"></label>' +
      '<label><span>Intervalo entre inícios (min)</span><input type="number" name="step" min="10" max="240" value="' + (pr.step || 60) + '"></label></div>' +
      '<div class="grid2"><label><span>Antecedência mínima (horas)</span><input type="number" name="notice" min="0" max="336" value="' + (pr.notice == null ? 12 : pr.notice) + '"></label>' +
      '<label><span>Mostrar horários até (dias à frente)</span><input type="number" name="days" min="1" max="90" value="' + (pr.days || 21) + '"></label></div>' +
      '<div class="grid2"><label><span>Atendimento</span><select name="mode"><option value="online">Só on-line</option><option value="presencial"' + (pr.mode === 'presencial' ? ' selected' : '') + '>Só presencial</option><option value="ambos"' + (pr.mode === 'ambos' ? ' selected' : '') + '>On-line e presencial</option></select></label>' +
      '<label><span>WhatsApp público (opcional)</span><input name="wa" inputmode="tel" value="' + h(pr.wa) + '"></label></div>' +
      '<label class="check"><input type="checkbox" name="showPrice"' + (pr.price ? ' checked' : '') + '> <span>Mostrar o valor da sessão na página</span></label>' +
      '<fieldset class="stack" style="border:1px solid var(--line);border-radius:10px;padding:12px"><legend class="small"><b>Horários de atendimento</b> (ex.: 08:00-12:00, 14:00-18:00)</legend>' +
      [1, 2, 3, 4, 5, 6, 0].map(function (d) { return '<div class="av-row"><span>' + WD[d] + '</span><input name="av' + d + '" aria-label="Horários de ' + WD[d] + '" value="' + h(C.rangesText(av[d])) + '" placeholder="fechado"></div>'; }).join('') + '</fieldset>' +
      '<button class="btn pri">' + (S.pro.slug ? 'Salvar página' : 'Criar minha página') + '</button><p id="profmsg" class="small err" role="alert"></p></form>' +

      '<form id="fpix" class="card stack"><h3>PIX</h3>' +
      '<div class="grid2"><label><span>Tipo de chave</span><select name="type">' + [['cpf', 'CPF'], ['cnpj', 'CNPJ'], ['email', 'E-mail'], ['telefone', 'Telefone'], ['aleatoria', 'Chave aleatória']].map(function (t) { return '<option value="' + t[0] + '"' + (px.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></label>' +
      '<label><span>Chave</span><input name="key" value="' + h(px.key) + '"></label></div>' +
      '<div class="grid2"><label><span>Nome do recebedor (como no banco)</span><input name="name" value="' + h(px.name || c.name) + '"></label><label><span>Cidade</span><input name="city" value="' + h(px.city || c.city) + '"></label></div>' +
      '<button class="btn pri">Salvar PIX</button></form>' +

      '<section class="card stack"><h3>Segurança e dados</h3>' +
      '<p class="small muted">Prontuários, pacientes, documentos e lançamentos são cifrados no seu aparelho. A administração do sistema só vê texto embaralhado. Se você perder a frase secreta <b>e</b> o código de recuperação, ninguém consegue recuperar os dados.</p>' +
      '<form id="fpass" class="stack"><label><span>Nova frase secreta</span><input type="password" name="p1" minlength="10" autocomplete="new-password" required></label><label><span>Repita</span><input type="password" name="p2" minlength="10" autocomplete="new-password" required></label><button class="btn">Trocar frase secreta</button></form>' +
      '<label><span>Trancar sozinho depois de (minutos parado)</span><select id="idle">' + [10, 20, 30, 60].map(function (m) { return '<option' + ((c.idle || 20) === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label>' +
      '<div class="row"><button class="btn" data-a="backup">Baixar cópia dos meus dados</button><button class="btn ghost" data-a="logout">Sair da conta (' + h(S.user.email) + ')</button></div>' +
      '<p class="small muted">A cópia sai legível (sem cifra), para você guardar com segurança. O CFP pede guarda do registro documental por no mínimo 5 anos.</p></section>';
  }
  function slugify(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
  function mountConfig() {
    var idle = $('#idle'); if (idle) idle.onchange = async function () { S.pro.cfg = Object.assign({}, cfg(), { idle: +idle.value }); await savePro({ cfg: S.pro.cfg }); bumpIdle(); toast('Salvo.'); };
  }
  async function savePro(patch) { Object.assign(S.pro, patch); await fs.doc('pros/' + uid()).set(patch, { merge: true }); }
  function readLogo(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 320 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        res(cv.toDataURL('image/png'));
      };
      img.onerror = rej; img.src = url;
    });
  }
  async function saveCfg(form) {
    var v = fv(form), c = Object.assign({}, cfg());
    ['name', 'reg', 'doc', 'phone', 'email', 'city', 'address', 'color', 'roomMode', 'roomUrl'].forEach(function (k) { c[k] = v[k]; });
    c.price = C.parseMoney(v.price); c.tz = +v.tz;
    if (form.logo.files[0]) c.logo = await readLogo(form.logo.files[0]);
    await savePro({ cfg: c });
    if (S.pro.slug && S.prof) await saveProfile(null, true);
    toast('Identificação salva.'); renderMain();
  }
  async function saveProfile(form, silent) {
    var c = cfg(), pr = Object.assign({}, S.prof || {}), msg = $('#profmsg');
    if (form) {
      var v = fv(form), av = {};
      [0, 1, 2, 3, 4, 5, 6].forEach(function (d) { var r = C.parseRanges(v['av' + d]); if (r.length) av[d] = r; });
      Object.assign(pr, { bio: v.bio, dur: +v.dur || 50, step: +v.step || 60, notice: +v.notice, days: +v.days || 21, mode: v.mode, wa: v.wa, av: av, on: S.pro.slug ? !!v.on : true, price: v.showPrice ? (c.price || 0) : 0 });
    }
    Object.assign(pr, { uid: uid(), name: c.name || S.user.displayName || '', reg: c.reg || '', tz: tz(), pub: S.pro.vault.pub, roomMode: c.roomMode || 'jitsi', roomUrl: c.roomMode === 'fixo' ? (c.roomUrl || '') : '', address: pr.mode === 'online' ? '' : (c.address || ''), city: c.city || '' });
    if (pr.price && form == null) pr.price = c.price || pr.price;
    var slug = S.pro.slug;
    try {
      if (!slug) {
        slug = slugify(v.slug);
        if (slug.length < 3) throw new Error('Endereço muito curto.');
        var ex = await fs.doc('profiles/' + slug).get();
        if (ex.exists) throw new Error('Esse endereço já está em uso. Tente outro.');
      }
      await fs.doc('profiles/' + slug).set(pr);
      S.prof = pr;
      if (!S.pro.slug) { await savePro({ slug: slug }); startSync(); }
      if (!silent) { toast('Página salva.'); renderMain(); }
    } catch (e) {
      if (msg) msg.textContent = e.code === 'permission-denied' ? 'Esse endereço já pertence a outra conta.' : e.message;
    }
  }
  async function savePix(form) {
    var v = fv(form), c = Object.assign({}, cfg(), { pix: { type: v.type, key: v.key, name: v.name, city: v.city } });
    await savePro({ cfg: c }); toast('PIX salvo.');
  }
  async function changePass(form) {
    var v = fv(form);
    if (v.p1 !== v.p2) return toast('As frases não são iguais.');
    var vault = await C.vaultRepass(S.pro.vault, S.dek, v.p1);
    await savePro({ vault: vault }); form.reset(); toast('Frase secreta trocada.');
  }
  function backup() {
    var data = { exportado: new Date().toISOString(), profissional: cfg(), registros: Array.from(S.items.values()) };
    download('backup-consultorio-' + C.dateInput(Date.now(), tz()) + '.json', JSON.stringify(data, null, 2), 'application/json');
  }

  /* ---------------- eventos ---------------- */
  var A = {
    close: closeSheet,
    login: function () { var m = $('#msg'); if (m) m.textContent = ''; auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(function (e) { if (m) m.textContent = e.code === 'auth/unauthorized-domain' ? 'Este endereço não está autorizado no Firebase (passo 6 do LEIA-ME).' : 'Não foi possível entrar. Tente de novo.'; }); },
    logout: function () { lock(true); auth.signOut(); },
    lock: function () { lock(); },
    sub: subSheet,
    'unlock-rec': function () { unlockScreen(true); }, 'unlock-pass': function () { unlockScreen(false); },
    tab: function (id) { S.tab = id; if (id !== 'pacientes') S.pid = null; if (id === 'pacientes' && S.tab === id) S.pid = null; render(); scrollTo(0, 0); },
    wk: function (id) { S.week = id === '0' ? null : (S.week || weekStart(Date.now())) + (+id) * WEEK; renderMain(); },
    mo: function (id) { var m = S.month || monthStart(Date.now()); S.month = id === '1' ? nextMonth(m) : monthStart(m - DAY); renderMain(); },
    'toggle-canceled': function () { S.showCanceled = !S.showCanceled; renderMain(); },
    'toggle-arch': function () { S.showArch = !S.showArch; renderMain(); },
    'appt-new': function () { apptForm(null); }, 'appt-for': function (id) { apptForm(null, id); },
    'appt-wa': function (id) { waConfirm(get(id)); },
    'appt-done': function (id) { apptDone(get(id)); }, 'appt-miss': function (id) { apptMiss(get(id)); },
    'appt-more': function (id) { apptMore(get(id)); }, 'appt-resched': function (id) { apptForm(get(id)); },
    'appt-reset': async function (id) { var a = get(id); a.status = 'agendado'; await put(a); await setBusy(a.t, a.d || 50); closeSheet(); renderMain(); },
    'appt-cancel': async function (id) { var a = get(id); a.status = 'desmarcado'; await put(a); await freeBusy(a.t); closeSheet(); renderMain(); toast('Sessão desmarcada e horário liberado.'); },
    'appt-del': async function (id) { if (!confirm('Excluir esta sessão do histórico?')) return; var a = get(id); await del(id); await freeBusy(a.t); closeSheet(); renderMain(); },
    'req-ok': function (id) { acceptRequest(S.requests.get(id)); }, 'req-no': function (id) { rejectRequest(S.requests.get(id)); },
    'block-new': blockForm,
    'block-del': async function (id) { await busyRef(id).delete(); toast('Horário liberado.'); },
    patient: function (id) { closeSheet(); S.tab = 'pacientes'; S.pid = id; S.ptab = 'evol'; render(); scrollTo(0, 0); },
    'patient-new': function () { patientForm(null); }, 'patient-edit': function (id) { patientForm(get(id)); },
    'patient-arch': function (id) { archivePatient(get(id)); },
    back: function () { S.pid = null; renderMain(); },
    ptab: function (id) { S.ptab = id; renderMain(); },
    'note-new': function (id) { closeSheet(); id ? noteForm(null, id) : noteForm(null); },
    'note-edit': function (id) { noteForm(get(id)); },
    'note-add': function (id) { noteForm(null, null, id); },
    'note-sign': async function (id) { if (!confirm('Assinar? Depois não será possível editar, só acrescentar adendo.')) return; await signNote(get(id)); renderMain(); toast('Evolução assinada.'); },
    'print-record': function () { printRecord(get(S.pid)); },
    'doc-new': function () { docForm(null, S.pid); }, 'doc-open': function (id) { docForm(get(id)); },
    'doc-print': function (id) { var d = get(id); printDoc(d.title, d.body); },
    'doc-del': async function (id) { if (!confirm('Excluir este documento?')) return; await del(id); closeSheet(); renderMain(); },
    'pay-new': function (id) { payForm(null, id || S.pid); }, 'pay-edit': function (id) { payForm(get(id)); },
    'pay-del': async function (id) { if (!confirm('Excluir este lançamento?')) return; await del(id); closeSheet(); renderMain(); },
    'pay-recv': function (id) { recvForm(get(id)); }, pix: function (id) { pixSheet(get(id)); }, receipt: function (id) { printReceipt(get(id)); },
    csv: exportCsv, backup: backup,
    'logo-del': async function () { var c = Object.assign({}, cfg()); delete c.logo; await savePro({ cfg: c }); renderMain(); },
    copy: function (id) { (navigator.clipboard ? navigator.clipboard.writeText(id) : Promise.reject()).then(function () { toast('Copiado.'); }, function () { prompt('Copie:', id); }); }
  };
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-a]'); if (!el || !A[el.dataset.a]) return;
    if (el.tagName === 'A') e.preventDefault();
    e.preventDefault(); A[el.dataset.a](el.dataset.id, el);
  });
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'psearch') return;
    var q = e.target.value.toLowerCase().trim(), qd = C.digits(q);
    document.querySelectorAll('#plist [data-s]').forEach(function (r) { var s = r.dataset.s; r.hidden = !!q && s.indexOf(q) < 0 && !(qd && s.indexOf(qd) >= 0); });
  });
  var FORMS = {
    fsetup: async function (f, btn) {
      var v = fv(f), m = $('#msg');
      if (v.p1 !== v.p2) { m.textContent = 'As frases não são iguais.'; return; }
      busyBtn(btn, true, 'Criando cofre');
      try {
        var r = await C.vaultCreate(v.p1);
        var c = { name: S.user.displayName || '', email: S.user.email || '', tz: -180 };
        await fs.doc('pros/' + uid()).set({ vault: r.vault, cfg: c, created: Date.now() }, { merge: true });
        S.pro = Object.assign(S.pro || {}, { vault: r.vault, cfg: c });
        screen('<div class="center"><div class="box"><h1 class="brand">Guarde este código</h1>' +
          '<p>É o único jeito de abrir seus prontuários se você esquecer a frase secreta. Anote em papel ou guarde no seu gerenciador de senhas.</p>' +
          '<div class="code" id="rec">' + h(r.rec) + '</div><button class="btn" data-a="copy" data-id="' + h(r.rec) + '">Copiar código</button>' +
          '<label class="check"><input type="checkbox" id="saved"> <span>Guardei o código em lugar seguro.</span></label>' +
          '<button class="btn pri" id="go" disabled>Continuar</button></div></div>');
        $('#saved').onchange = function () { $('#go').disabled = !this.checked; };
        $('#go').onclick = function () { S.tab = 'config'; opened(r); toast('Bem-vinda(o)! Complete seus dados e crie sua página de agendamento.'); };
      } catch (e) { busyBtn(btn, false); m.textContent = 'Erro ao criar o cofre: ' + e.message; }
    },
    funlock: async function (f, btn) {
      var v = fv(f), m = $('#msg'), rec = !!f.dataset.rec;
      busyBtn(btn, true, 'Abrindo');
      try {
        var r = await C.vaultOpen(S.pro.vault, v.s, rec);
        if (rec) {
          var np = prompt('Código aceito. Crie uma nova frase secreta (mínimo 10 caracteres):') || '';
          if (np.length >= 10) { var nv = await C.vaultRepass(S.pro.vault, r.dek, np); await fs.doc('pros/' + uid()).set({ vault: nv }, { merge: true }); S.pro.vault = nv; toast('Nova frase secreta salva.'); }
          else toast('Frase não trocada. Troque em Consultório > Segurança.');
        }
        if (S.pro.slug) { var ps = await fs.doc('profiles/' + S.pro.slug).get(); S.prof = ps.exists ? ps.data() : null; }
        opened(r);
      } catch (e) { busyBtn(btn, false); m.textContent = rec ? 'Código incorreto.' : 'Frase secreta incorreta.'; }
    },
    fappt: function (f) { return saveAppt(f); }, fblock: function (f) { return saveBlock(f); },
    fpatient: function (f) { return savePatient(f); },
    fnote: function (f, btn) { return saveNote(f, btn && btn.value); },
    fdoc: function (f, btn) { return saveDoc(f, btn && btn.value); },
    fpay: function (f) { return savePay(f); }, frecv: function (f) { return saveRecv(f); },
    fcfg: function (f) { return saveCfg(f); }, fprof: function (f) { return saveProfile(f); }, fpix: function (f) { return savePix(f); },
    fpass: function (f) { return changePass(f); }
  };
  document.addEventListener('submit', async function (e) {
    var f = e.target, fn = FORMS[f.id]; if (!fn) return;
    e.preventDefault();
    var btn = e.submitter || f.querySelector('button:not([type=button])');
    if (f.id === 'fsetup' || f.id === 'funlock') return fn(f, btn);
    var val = btn && btn.value;
    busyBtn(btn, true, 'Salvando');
    try { await fn(f, { value: val }); } catch (err) { if (err && err.sub) return; console.error(err); toast('Não foi possível salvar: ' + (err.code || err.message)); }
    finally { if (document.body.contains(btn)) busyBtn(btn, false); }
  });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#sheet')) closeSheet(); });

  boot();
})();
