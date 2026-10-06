/* Abre a escala: busca o arquivo criptografado, pede a senha (ou usa a chave lembrada) e inicia o site. */
(function () {
  'use strict';
  var REPO = { owner: 'JoaoVictorPV', name: 'escalascedav', branch: 'main' };
  var DATA_URL = 'data/escala.enc.json';
  var KEY_SLOT = 'escala-chave';
  var app = document.getElementById('app');

  // Tema claro/escuro: segue o aparelho até a pessoa escolher; a escolha fica neste navegador.
  (function () {
    var KEY = 'escala-tema', root = document.documentElement;
    var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
    function current() { return saved() || (mq && mq.matches ? 'dark' : 'light'); }
    var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>';
    var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>';
    var box = document.createElement('div');
    box.className = 'theme'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Tema');
    box.innerHTML = '<button type="button" data-t="light" title="Tema claro" aria-label="Tema claro">' + SUN + '</button>' +
      '<button type="button" data-t="dark" title="Tema escuro" aria-label="Tema escuro">' + MOON + '</button>';
    function paint() {
      var s = saved();
      if (s) root.setAttribute('data-theme', s); else root.removeAttribute('data-theme');
      var c = current();
      Array.prototype.forEach.call(box.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.dataset.t === c); });
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      try { localStorage.setItem(KEY, b.dataset.t); } catch (err) {}
      paint();
    });
    if (mq && mq.addEventListener) mq.addEventListener('change', paint);
    document.body.appendChild(box);
    paint();
  })();

  function stored() {
    try { return JSON.parse(localStorage.getItem(KEY_SLOT) || sessionStorage.getItem(KEY_SLOT) || 'null'); } catch (e) { return null; }
  }
  function forget() { try { localStorage.removeItem(KEY_SLOT); sessionStorage.removeItem(KEY_SLOT); } catch (e) {} }
  function remember(key, salt, persist) {
    return EscalaCrypto.exportKey(key).then(function (raw) {
      var v = JSON.stringify({ salt: salt, k: raw });
      try {
        if (persist === undefined) persist = !!localStorage.getItem(KEY_SLOT) || !sessionStorage.getItem(KEY_SLOT);
        forget();
        (persist ? localStorage : sessionStorage).setItem(KEY_SLOT, v);
      } catch (e) {}
    });
  }
  function ctx(key, env) {
    return { key: key, salt: env.salt, iter: env.iter, repo: REPO, remember: remember,
      lock: function () { forget(); location.reload(); } };
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function lockScreen(env, note) {
    app.innerHTML =
      '<main class="lock"><form class="lock-card" id="lock-form" autocomplete="on">' +
      '<div class="lock-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M12 13.2v3"/></svg></div>' +
      '<div class="eyebrow">Escalas de médicos · Matriz · Ecoimagem · Seminário</div>' +
      '<h1>Plantão de fim de semana</h1>' +
      '<p class="lock-lead">Escala protegida. Digite a senha para abrir.</p>' +
      '<input type="text" name="username" value="escala-cedav" autocomplete="username" hidden>' +
      '<label class="fld" for="pw"><span>Senha</span><input id="pw" name="password" type="password" autocomplete="current-password" required></label>' +
      '<label class="toggle"><input type="checkbox" id="keep" checked> Lembrar neste aparelho</label>' +
      '<p class="fmsg" id="lock-msg" role="alert">' + (note ? esc(note) : '') + '</p>' +
      '<button class="btn primary lock-btn" id="lock-go" type="submit">Abrir escala</button>' +
      '</form></main>';
    var form = document.getElementById('lock-form'), pw = document.getElementById('pw'), msg = document.getElementById('lock-msg'), go = document.getElementById('lock-go');
    pw.focus();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!pw.value) return;
      go.disabled = true; go.textContent = 'Abrindo…'; msg.textContent = '';
      var key;
      EscalaCrypto.deriveKey(pw.value, env.salt, env.iter).then(function (k) {
        key = k; return EscalaCrypto.openJSON(k, env);
      }).then(function (state) {
        return remember(key, env.salt, document.getElementById('keep').checked).then(function () { startApp(state, ctx(key, env)); });
      }).catch(function () {
        go.disabled = false; go.textContent = 'Abrir escala';
        msg.textContent = 'Senha incorreta.'; pw.select();
      });
    });
  }

  function fail() {
    app.innerHTML = '<main class="lock"><div class="lock-card"><h1>Plantão de fim de semana</h1><p class="lock-lead">Não consegui carregar a escala agora. Verifique a conexão e recarregue a página.</p></div></main>';
  }

  fetch(DATA_URL + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }).then(function (env) {
    var s = stored();
    if (s && s.salt === env.salt) {
      return EscalaCrypto.importKey(s.k).then(function (key) {
        return EscalaCrypto.openJSON(key, env).then(function (state) { startApp(state, ctx(key, env)); });
      }).catch(function () { forget(); lockScreen(env); });
    }
    if (s) { forget(); lockScreen(env, 'A senha da escala mudou. Digite a senha nova.'); return; }
    lockScreen(env);
  }).catch(fail);
})();
