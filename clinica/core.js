/* Núcleo compartilhado: criptografia, PIX, horários e utilidades.
   Tudo o que é dado de paciente é cifrado AQUI, no aparelho do profissional, antes de ir para o banco.
   O banco (e quem administra o Firebase) só guarda texto cifrado. */
(function () {
  'use strict';
  var C = (window.CC = {});
  var te = new TextEncoder(), td = new TextDecoder();
  var sub = window.crypto && window.crypto.subtle;

  C.appName = window.APP_NAME || 'Meu Consultório';
  /* Assinatura: valores em firebase-config.js (window.BILLING). */
  C.billing = Object.assign({ trialDays: 14, pixType: 'email', pixKey: '', pixName: '', pixCity: '', whatsapp: '' }, window.BILLING || {});
  C.billing.plans = Object.assign({
    essencial: { name: 'Essencial', price: 99, perks: ['Agenda e página de agendamento', 'Prontuário cifrado com evolução ditada', 'Documentos com timbre', 'Financeiro com PIX e recibo'] },
    premium: { name: 'Premium', price: 349, perks: ['Tudo do Essencial', 'Relatório financeiro do consultório', 'Revisão trimestral de 50 min com a Casal das Cifra$', 'Dúvidas financeiras pelo WhatsApp'] }
  }, C.billing.plans || {});
  C.configured = function () {
    var c = window.FIREBASE_CONFIG || {};
    return !!(window.firebase && c.apiKey && String(c.apiKey).indexOf('COLE') < 0);
  };
  C.fs = function () {
    if (!C._fs) { firebase.initializeApp(window.FIREBASE_CONFIG); C._fs = firebase.firestore(); }
    return C._fs;
  };

  /* ---------- utilidades ---------- */
  C.h = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  C.rand = function (n) { return crypto.getRandomValues(new Uint8Array(n)); };
  C.token = function (n) {
    var a = 'abcdefghijkmnpqrstuvwxyz23456789';
    return Array.prototype.map.call(C.rand(n || 20), function (b) { return a[b % 32]; }).join('');
  };
  C.b64 = function (buf) {
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  };
  C.unb64 = function (s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); };
  C.digits = function (s) { return String(s || '').replace(/\D/g, ''); };
  C.money = function (v) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  C.parseMoney = function (s) {
    s = String(s || '').replace(/[^\d,.-]/g, '');
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s); return isFinite(n) ? Math.round(n * 100) / 100 : 0;
  };
  C.waLink = function (phone, text) {
    var d = C.digits(phone);
    if (d && d.length <= 11) d = '55' + d;
    return 'https://wa.me/' + d + '?text=' + encodeURIComponent(text || '');
  };

  /* ---------- fuso e horários ----------
     Horários ficam em milissegundos UTC. "off" é o deslocamento do fuso do consultório em minutos (Brasília = -180).
     O Brasil não tem horário de verão desde 2019, então o deslocamento é fixo. */
  C.wall = function (utc, off) {
    var d = new Date(utc + off * 60000);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay(), hh: d.getUTCHours(), mi: d.getUTCMinutes() };
  };
  C.fromWall = function (y, m, d, minutes, off) { return Date.UTC(y, m, d, 0, minutes || 0) - off * 60000; };
  C.dayStart = function (utc, off) { var w = C.wall(utc, off); return C.fromWall(w.y, w.m, w.d, 0, off); };
  C.fmt = function (utc, off, opt) {
    return new Date(utc + off * 60000).toLocaleString('pt-BR', Object.assign({ timeZone: 'UTC' }, opt));
  };
  C.hm = function (utc, off) { var w = C.wall(utc, off); return pad(w.hh) + ':' + pad(w.mi); };
  C.dmy = function (utc, off) { return C.fmt(utc, off, { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  C.dateInput = function (utc, off) { var w = C.wall(utc, off); return w.y + '-' + pad(w.m + 1) + '-' + pad(w.d); };
  C.fromInputs = function (date, time, off) {
    var p = String(date).split('-'), t = String(time || '00:00').split(':');
    return C.fromWall(+p[0], +p[1] - 1, +p[2], (+t[0]) * 60 + (+t[1] || 0), off);
  };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  C.pad = pad;
  C.toMin = function (s) { var p = String(s).trim().split(':'); return (+p[0]) * 60 + (+p[1] || 0); };
  /* "08:00-12:00, 14:00-18:00" -> [[480,720],[840,1080]] */
  C.parseRanges = function (s) {
    var out = [];
    String(s || '').split(/[,;]/).forEach(function (r) {
      var m = r.match(/(\d{1,2})(?:[:h](\d{2}))?h?\s*(?:-|–|às|a)\s*(\d{1,2})(?:[:h](\d{2}))?/);
      if (!m) return;
      var a = (+m[1]) * 60 + (+m[2] || 0), b = (+m[3]) * 60 + (+m[4] || 0);
      if (b > a && b <= 1440) out.push([a, b]);
    });
    return out;
  };
  C.rangesText = function (rs) {
    return (rs || []).map(function (r) { return pad(Math.floor(r[0] / 60)) + ':' + pad(r[0] % 60) + '-' + pad(Math.floor(r[1] / 60)) + ':' + pad(r[1] % 60); }).join(', ');
  };
  /* Horários livres para a página pública. busy = [{t, d}] (início em ms e duração em minutos). */
  C.freeSlots = function (p, busy, now) {
    var off = p.tz == null ? -180 : p.tz, dur = p.dur || 50, step = p.step || 60;
    var minT = now + (p.notice == null ? 12 : p.notice) * 3600000;
    var w = C.wall(now, off), out = [];
    for (var i = 0; i <= (p.days || 21); i++) {
      var wd = new Date(Date.UTC(w.y, w.m, w.d + i)).getUTCDay();
      (p.av && p.av[wd] || []).forEach(function (r) {
        for (var t = r[0]; t + dur <= r[1]; t += step) {
          var s = C.fromWall(w.y, w.m, w.d + i, t, off), e = s + dur * 60000;
          if (s < minT) continue;
          var clash = busy.some(function (b) { return s < b.t + (b.d || dur) * 60000 && b.t < e; });
          if (!clash) out.push(s);
        }
      });
    }
    return out.sort(function (a, b) { return a - b; });
  };

  /* ---------- criptografia ---------- */
  var PASS_ITER = 600000, REC_ITER = 100000;
  C.kdf = function (secret, salt, iter) {
    return sub.importKey('raw', te.encode(String(secret).normalize('NFC')), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return sub.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  };
  C.aesKey = function (raw) { return sub.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); };
  C.encBytes = function (key, bytes) {
    var iv = C.rand(12);
    return sub.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes).then(function (ct) { return { iv: C.b64(iv), ct: C.b64(ct) }; });
  };
  C.decBytes = function (key, o) {
    return sub.decrypt({ name: 'AES-GCM', iv: C.unb64(o.iv) }, key, C.unb64(o.ct)).then(function (b) { return new Uint8Array(b); });
  };
  C.enc = function (key, obj) { return C.encBytes(key, te.encode(JSON.stringify(obj))); };
  C.dec = function (key, o) { return C.decBytes(key, o).then(function (b) { return JSON.parse(td.decode(b)); }); };
  C.sha256 = function (s) {
    return sub.digest('SHA-256', te.encode(s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
    });
  };
  /* Código de recuperação: 20 caracteres (100 bits), em grupos de 4. */
  /* Frase secreta forte: protege o prontuário mesmo se o banco inteiro vazar (o atacante teria de adivinhar a frase). */
  C.passProblem = function (p) {
    p = String(p || '');
    var words = p.trim().split(/\s+/).filter(function (w) { return w.length >= 3; }).length;
    var kinds = [/[a-zà-ú]/, /[A-ZÀ-Ú]/, /\d/, /[^\w\sà-úÀ-Ú]/].filter(function (r) { return r.test(p); }).length;
    if (p.length < 12) return 'Use pelo menos 12 caracteres.';
    if (/^(.)\1+$/.test(p) || /^(?:0?123456789|abcdefghij|qwertyuiop)/i.test(p.replace(/\s/g, ''))) return 'Essa frase é fácil demais de adivinhar.';
    if (/senha|password|psicolog|consult[oó]rio|prontu[aá]rio/i.test(p) && words < 4) return 'Evite palavras óbvias como "senha" ou "consultório".';
    if (words < 3 && kinds < 3) return 'Use 3 ou mais palavras soltas (ex.: "janela azul do sábado") ou misture letras, números e símbolos.';
    return '';
  };
  C.newRecovery = function () { return C.token(20).toUpperCase().match(/.{4}/g).join('-'); };
  C.normRecovery = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };

  /* Cofre: uma chave de dados aleatória (DEK) cifra tudo. Ela é guardada duas vezes:
     embrulhada pela frase secreta e pelo código de recuperação. Junto vai o par de chaves RSA
     que permite ao paciente enviar o pedido de agendamento cifrado só para o profissional. */
  C.vaultCreate = async function (pass) {
    var dek = C.rand(32), salt = C.rand(16), rsalt = C.rand(16), rec = C.newRecovery();
    var kek = await C.kdf(pass, salt, PASS_ITER), rkek = await C.kdf(C.normRecovery(rec), rsalt, REC_ITER);
    var key = await C.aesKey(dek);
    var kp = await sub.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
    var priv = new Uint8Array(await sub.exportKey('pkcs8', kp.privateKey));
    var pub = await sub.exportKey('jwk', kp.publicKey);
    var vault = {
      v: 1, salt: C.b64(salt), iter: PASS_ITER, rsalt: C.b64(rsalt), riter: REC_ITER,
      wp: await C.encBytes(kek, dek), wr: await C.encBytes(rkek, dek), priv: await C.encBytes(key, priv),
      pub: { kty: pub.kty, n: pub.n, e: pub.e, alg: pub.alg }
    };
    return { vault: vault, rec: rec, key: key, dek: dek, priv: kp.privateKey };
  };
  C.vaultOpen = async function (vault, secret, isRecovery) {
    var kek = isRecovery
      ? await C.kdf(C.normRecovery(secret), C.unb64(vault.rsalt), vault.riter)
      : await C.kdf(secret, C.unb64(vault.salt), vault.iter);
    var dek = await C.decBytes(kek, isRecovery ? vault.wr : vault.wp);
    var key = await C.aesKey(dek);
    var privBytes = await C.decBytes(key, vault.priv);
    var priv = await sub.importKey('pkcs8', privBytes, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
    return { key: key, dek: dek, priv: priv };
  };
  C.vaultRepass = async function (vault, dek, pass) {
    var salt = C.rand(16), kek = await C.kdf(pass, salt, PASS_ITER);
    return Object.assign({}, vault, { salt: C.b64(salt), iter: PASS_ITER, wp: await C.encBytes(kek, dek) });
  };
  /* Paciente cifra o pedido com a chave pública do profissional (RSA-OAEP + AES-GCM). */
  C.sealFor = async function (pubJwk, obj) {
    var pub = await sub.importKey('jwk', { kty: pubJwk.kty, n: pubJwk.n, e: pubJwk.e, alg: 'RSA-OAEP-256', ext: true },
      { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    var raw = C.rand(32), e = await C.enc(await C.aesKey(raw), obj);
    var wk = await sub.encrypt({ name: 'RSA-OAEP' }, pub, raw);
    return { wk: C.b64(wk), iv: e.iv, ct: e.ct };
  };
  C.openSealed = async function (priv, o) {
    var raw = await sub.decrypt({ name: 'RSA-OAEP' }, priv, C.unb64(o.wk));
    return C.dec(await C.aesKey(new Uint8Array(raw)), o);
  };

  /* ---------- PIX (BR Code "copia e cola", padrão EMV do Banco Central) ---------- */
  function crc16(s) {
    var crc = 0xFFFF;
    for (var i = 0; i < s.length; i++) {
      crc ^= s.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
  C.crc16 = crc16;
  function ascii(s, n) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 .,\-]/g, '').trim().slice(0, n).trim();
  }
  C.pixKey = function (type, key) {
    key = String(key || '').trim();
    if (type === 'cpf' || type === 'cnpj') return C.digits(key);
    if (type === 'email') return key.toLowerCase();
    if (type === 'telefone') { var d = C.digits(key); if (d.length <= 11) d = '55' + d; return '+' + d; }
    return key;
  };
  C.pix = function (o) {
    var f = function (id, v) { return id + String(v.length).padStart(2, '0') + v; };
    var txid = String(o.txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
    var p = f('00', '01') + f('26', f('00', 'br.gov.bcb.pix') + f('01', o.key)) + f('52', '0000') + f('53', '986') +
      (o.amount > 0 ? f('54', Number(o.amount).toFixed(2)) : '') + f('58', 'BR') +
      f('59', ascii(o.name, 25) || 'RECEBEDOR') + f('60', ascii(o.city, 15) || 'BRASIL') + f('62', f('05', txid)) + '6304';
    return p + crc16(p);
  };

  /* ---------- valor por extenso (recibo) ---------- */
  var U = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  var D = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  var H = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  function ate999(n) {
    if (n === 100) return 'cem';
    var c = Math.floor(n / 100), r = n % 100, p = [];
    if (c) p.push(H[c]);
    if (r < 20) { if (r) p.push(U[r]); } else { p.push(D[Math.floor(r / 10)] + (r % 10 ? ' e ' + U[r % 10] : '')); }
    return p.join(' e ');
  }
  function inteiro(n) {
    if (n === 0) return 'zero';
    var mi = Math.floor(n / 1e6), mil = Math.floor((n % 1e6) / 1000), r = n % 1000, p = [];
    if (mi) p.push(mi === 1 ? 'um milhão' : ate999(mi) + ' milhões');
    if (mil) p.push(mil === 1 ? 'mil' : ate999(mil) + ' mil');
    if (r) p.push(ate999(r));
    var last = r && (r < 100 || r % 100 === 0) ? ' e ' : ' ';
    if (p.length > 1) return p.slice(0, -1).join(', ') + last + p[p.length - 1];
    return p[0];
  }
  C.extenso = function (v) {
    v = Math.round((Number(v) || 0) * 100);
    var r = Math.floor(v / 100), c = v % 100, s = '';
    if (r) s = inteiro(r) + (r % 1e6 === 0 ? ' de' : '') + (r === 1 ? ' real' : ' reais');
    if (c) s += (r ? ' e ' : '') + inteiro(c) + (c === 1 ? ' centavo' : ' centavos');
    return s || 'zero real';
  };
})();
