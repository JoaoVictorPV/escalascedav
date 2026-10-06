function startApp(STATE, CTX) {
  'use strict';
  var P = EscalaParser, norm = P.norm, T = P.TURNOS, U = P.UNITS;
  var PAGE_TITLE = 'Plantão de Fim de Semana';
  var FONT_URL = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Mono:wght@500&display=swap';
  var XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  var D = STATE.data;
  var HIST = STATE.history || [];
  var app = document.getElementById('app');

  var WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var WD_FULL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var MON_FULL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var ICON = {
    'sex-noite': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    'sab-manha': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 4v3M4.9 9.9l2 2M19.1 9.9l-2 2"/></svg>',
    'sab-tarde': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    'dom': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    'feriado': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M7 9l5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg>',
    sheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 11h6M9 14h6M9 17h6"/></svg>'
  };
  ICON.outro = ICON.dom;
  ICON.download = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parseISO(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function toISO(dt) { return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate()); }
  function addDays(s, n) { var d = parseISO(s); d.setUTCDate(d.getUTCDate() + n); return toISO(d); }
  function ddmm(s) { var p = s.split('-'); return p[2] + '/' + p[1]; }
  function nowLocalISO() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  var TODAY = nowLocalISO();

  var DOC = {};
  function indexData() {
    DOC = {};
    D.doctors.forEach(function (d) { DOC[d.key] = d; });
    D.rows.forEach(function (r) {
      var dt = parseISO(r.date), wd = dt.getUTCDay();
      r.wd = wd;
      r.gk = groupKey(r);
      var hay = [WD[wd], WD_FULL[wd], ddmm(r.date), r.d + '/' + r.m, ddmm(r.date) + '/' + r.y, MON_FULL[r.m - 1],
        (T[r.turno] || {}).label, (U[r.unit] || {}).label, r.raw, r.note, (r.tags || []).join(' '), r.holiday || '', r.sheet];
      r.docs.forEach(function (k) { hay.push(DOC[k] ? DOC[k].name : k); });
      if (r.holiday) hay.push('feriado');
      r.hay = norm(hay.join(' | '));
    });
  }
  // Weekend group = the Friday of that weekend; a holiday on a weekday stands alone.
  function groupKey(r) {
    var wd = r.wd;
    if (wd === 5) return r.date;
    if (wd === 6) return addDays(r.date, -1);
    if (wd === 0) return addDays(r.date, -2);
    return r.date;
  }
  indexData();

  // Every slot that changed in some import: sheet|date -> [{at, kind, from, to}], newest first.
  var CH = {};
  function buildCH() {
    CH = {};
    HIST.forEach(function (h) {
      (h.changes || []).forEach(function (c) {
        var k = c.sheet + '|' + c.date;
        (CH[k] || (CH[k] = [])).push({ at: h.at, kind: c.kind, from: c.from, to: c.to });
      });
    });
  }
  buildCH();
  function fmtAt(at, withYear) {
    return new Date(at).toLocaleString('pt-BR', withYear ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  // ---------- per-viewer filters ----------
  var F = { q: '', units: [], turnos: [], doc: '', month: '', past: false, tab: 'escala', dsort: 'nome' };
  try { var saved = JSON.parse(localStorage.getItem('escala-filtros') || 'null'); if (saved) { ['units', 'turnos', 'doc', 'month', 'past', 'tab', 'dsort'].forEach(function (k) { if (saved[k] != null) F[k] = saved[k]; }); } } catch (e) {}
  function saveF() { try { localStorage.setItem('escala-filtros', JSON.stringify({ units: F.units, turnos: F.turnos, doc: F.doc, month: F.month, past: F.past, tab: F.tab, dsort: F.dsort })); } catch (e) {} }
  if (F.doc && !DOC[F.doc]) F.doc = '';

  var canWrite = false;

  // ---------- render ----------
  function unitPill(u) { return '<span class="u u-' + esc(u) + '">' + esc((U[u] || U.outra).label) + '</span>'; }
  function qTokens() { return norm(F.q).split(' ').filter(Boolean); }
  function hl(text, toks) {
    var t = esc(text);
    if (!toks.length) return t;
    var plain = norm(text);
    // Highlight when the accent-free string lines up with the original (same length).
    if (plain.length !== String(text).length) return t;
    var marks = [];
    toks.forEach(function (tk) { var i = plain.indexOf(tk); while (i >= 0) { marks.push([i, i + tk.length]); i = plain.indexOf(tk, i + tk.length); } });
    if (!marks.length) return t;
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', pos = 0, s = String(text);
    marks.forEach(function (m) { if (m[0] < pos) return; out += esc(s.slice(pos, m[0])) + '<mark>' + esc(s.slice(m[0], m[1])) + '</mark>'; pos = m[1]; });
    return out + esc(s.slice(pos));
  }

  function filtered() {
    var toks = qTokens();
    return D.rows.filter(function (r) {
      if (!F.past && !F.month && r.date < TODAY) return false;
      if (F.units.length && F.units.indexOf(r.unit) < 0 && !(r.unit === 'matriz-eco' && (F.units.indexOf('matriz') >= 0 || F.units.indexOf('eco') >= 0))) return false;
      if (F.turnos.length && F.turnos.indexOf(r.turno) < 0) return false;
      if (F.doc && r.docs.indexOf(F.doc) < 0) return false;
      if (F.month && r.m !== +F.month) return false;
      for (var i = 0; i < toks.length; i++) if (r.hay.indexOf(toks[i]) < 0) return false;
      return true;
    });
  }

  function lastUpdated() {
    var m = '';
    D.sheets.forEach(function (s) { var v = s.versions[s.current]; if (v && v.updated > m) m = v.updated; });
    return m;
  }

  function renderHeader() {
    var yr = D.sheets.length ? D.sheets[0].year : '';
    var lu = lastUpdated();
    var impTxt = HIST[0] ? fmtAt(HIST[0].at) : '';
    return '<header class="top"><div class="top-main">' +
      '<div class="eyebrow">Escalas de médicos · ' + esc(yr) + ' · Matriz · Ecoimagem · Seminário</div>' +
      '<h1>Plantão de fim de semana</h1>' +
      '<div class="meta"><span><b class="num">' + D.rows.length + '</b> plantões em <b class="num">' + D.sheets.length + '</b> abas</span>' +
      (lu ? '<span>Alteração mais recente na planilha: <b class="num">' + P.fmtBR(lu) + '</b></span>' : '') +
      (impTxt ? '<span>Espelho importado em <b class="num">' + esc(impTxt) + '</b></span>' : '') + '</div></div>' +
      '<div class="upd" id="upd" hidden><button class="btn primary" id="pick">' + ICON.upload + 'Atualizar planilha</button>' +
      '<span class="hint">ou arraste o .xlsx para a página</span>' +
      '<input type="file" id="file" accept=".xlsx,.xlsm,.xls" hidden></div></header>';
  }

  function nextWeekend() {
    var upcoming = D.rows.filter(function (r) { return r.date >= TODAY && r.turno !== 'feriado' && r.wd >= 5 || (r.date >= TODAY && r.wd === 0 && r.turno !== 'feriado'); });
    if (!upcoming.length) return '';
    var gk = upcoming[0].gk;
    var rows = D.rows.filter(function (r) { return r.gk === gk && r.turno !== 'feriado'; });
    var fri = parseISO(gk), sun = parseISO(addDays(gk, 2));
    var isNow = TODAY >= gk && TODAY <= addDays(gk, 2);
    var when = 'Sex ' + fri.getUTCDate() + ' a dom ' + sun.getUTCDate() + ' de ' + MON_FULL[sun.getUTCMonth()];
    var order = ['sex-noite', 'sab-manha', 'sab-tarde', 'dom'];
    var slots = order.map(function (tk) {
      var rs = rows.filter(function (r) { return r.turno === tk; });
      var dt = tk === 'sex-noite' ? gk : tk === 'dom' ? addDays(gk, 2) : addDays(gk, 1);
      var body = rs.length ? rs.map(function (r) {
        return '<div class="slot-r">' + unitPill(r.unit) + ' <span class="who">' + whoText(r) + '</span></div>';
      }).join('') : '<div class="slot-empty">Sem escala</div>';
      return '<div class="slot"><div class="slot-t">' + ICON[tk] + esc(T[tk].short) + '<span class="d num">' + ddmm(dt) + '</span></div><div class="slot-l">' + body + '</div></div>';
    }).join('');
    var limit = addDays(TODAY, 21);
    var hols = D.rows.filter(function (r) { return r.turno === 'feriado' && r.date >= TODAY && r.date <= limit; });
    var holHtml = hols.length ? '<div class="hol-strip">' + hols.map(function (r) {
      return '<span class="hol-pill">' + ICON.feriado + '<span><b>' + WD[r.wd] + ' ' + ddmm(r.date) + '</b> · ' + esc(r.holiday) + ' · ' + whoText(r) + '</span></span>';
    }).join('') + '</div>' : '';
    return '<section class="next" aria-label="Próximo fim de semana"><div class="next-head"><h2>' + (isNow ? 'Este fim de semana' : 'Próximo fim de semana') + '</h2><span class="when">' + esc(when) + '</span></div>' +
      '<div class="slots">' + slots + '</div>' + holHtml + '</section>';
  }

  function whoText(r) {
    if (r.docs.length) return r.docs.map(function (k) { return esc(DOC[k] ? DOC[k].name : k); }).join(' · ');
    if (r.status === 'feriado') return 'Feriado';
    if (r.status === 'fechado') return 'Fechado';
    if (r.status === 'vazio') return '<span class="slot-empty">Em aberto</span>';
    return esc(r.raw);
  }

  function renderBar(count) {
    var unitChips = ['matriz', 'eco', 'seminario'].map(function (u) {
      return '<button class="chip" data-unit="' + u + '" aria-pressed="' + (F.units.indexOf(u) >= 0) + '">' + esc(U[u].label) + '</button>';
    }).join('');
    var turnoChips = Object.keys(T).map(function (t) {
      return '<button class="chip" data-turno="' + t + '" aria-pressed="' + (F.turnos.indexOf(t) >= 0) + '">' + esc(T[t].short) + '</button>';
    }).join('');
    var docOpts = '<option value="">Todos os médicos</option>' + D.doctors.map(function (d) {
      return '<option value="' + esc(d.key) + '"' + (F.doc === d.key ? ' selected' : '') + '>' + esc(d.name) + '</option>';
    }).join('');
    var monOpts = '<option value="">Todos os meses</option>' + MON_FULL.map(function (m, i) {
      return '<option value="' + (i + 1) + '"' + (+F.month === i + 1 ? ' selected' : '') + '>' + m.charAt(0).toUpperCase() + m.slice(1) + '</option>';
    }).join('');
    var cnt = { avisos: warnGroups().length, historico: HIST.filter(function (h) { return !h.baseline; }).length };
    var tabs = [['escala', 'Escala completa'], ['medicos', 'Por médico'], ['historico', 'Histórico'], ['avisos', 'Avisos']].map(function (t) {
      return '<button class="tab" role="tab" data-tab="' + t[0] + '" aria-selected="' + (F.tab === t[0]) + '">' + t[1] + (cnt[t[0]] ? '<span class="cnt">' + cnt[t[0]] + '</span>' : '') + '</button>';
    }).join('');
    return '<div class="bar"><div class="tabs" role="tablist">' + tabs + '</div>' +
      '<div class="search">' + ICON.search + '<input id="q" type="search" autocomplete="off" placeholder="Buscar médico, data (10/10), unidade, turno, feriado…" value="' + esc(F.q) + '" aria-label="Buscar"><button class="clear" id="qclear" aria-label="Limpar busca"' + (F.q ? '' : ' hidden') + '>×</button></div>' +
      '<div class="filters"><div class="fgroup"><span class="flabel">Unidade</span>' + unitChips + '</div>' +
      '<div class="fgroup"><span class="flabel">Turno</span>' + turnoChips + '</div>' +
      '<div class="fgroup"><select class="sel" id="doc" aria-label="Médico">' + docOpts + '</select><select class="sel" id="month" aria-label="Mês">' + monOpts + '</select>' +
      '<label class="toggle"><input type="checkbox" id="past"' + (F.past ? ' checked' : '') + (F.month ? ' disabled' : '') + '> Incluir datas passadas</label></div></div>' +
      '<div class="summary" id="summary"></div></div>';
  }

  function summaryHtml(list) {
    var active = F.q || F.units.length || F.turnos.length || F.doc || F.month || F.past;
    var txt = '<span><b class="num">' + list.length + '</b> ' + (list.length === 1 ? 'plantão' : 'plantões') +
      (F.month ? ' em ' + MON_FULL[F.month - 1] : (F.past ? ' no ano' : ' a partir de hoje')) +
      (F.doc && DOC[F.doc] ? ' com <b>' + esc(DOC[F.doc].name) + '</b>' : '') + '</span>';
    return txt + (active ? '<button class="linkbtn" id="reset">Limpar filtros</button>' : '');
  }

  function renderRoster(list) {
    if (!list.length) return '<div class="empty">Nenhum plantão com esses filtros. Tente outro termo ou limpe os filtros.</div>';
    var toks = qTokens();
    var groups = [], cur = null;
    list.forEach(function (r) {
      if (!cur || cur.k !== r.gk) { cur = { k: r.gk, rows: [] }; groups.push(cur); }
      cur.rows.push(r);
    });
    return groups.map(function (g) {
      var first = g.rows[0];
      var isWeekend = first.wd >= 5 || first.wd === 0 || g.rows.some(function (r) { return r.wd >= 5 || r.wd === 0; });
      var fri = parseISO(g.k), sun = parseISO(addDays(g.k, 2));
      var title;
      if (isWeekend && parseISO(g.k).getUTCDay() === 5) {
        title = 'Sex ' + fri.getUTCDate() + (fri.getUTCMonth() !== sun.getUTCMonth() ? ' ' + MON[fri.getUTCMonth()] : '') + ' – Dom ' + sun.getUTCDate() + ' ' + MON[sun.getUTCMonth()];
      } else {
        title = WD[first.wd] + ' ' + first.d + ' ' + MON[first.m - 1];
      }
      var hols = {};
      g.rows.forEach(function (r) { if (r.holiday) hols[r.holiday] = 1; });
      var tags = Object.keys(hols).map(function (h) { return '<span class="tag">' + esc(h) + '</span>'; }).join('');
      var now = TODAY >= g.k && TODAY <= addDays(g.k, isWeekend ? 2 : 0);
      if (now) tags = '<span class="tag now">' + (isWeekend ? 'Este fim de semana' : 'Hoje') + '</span>' + tags;
      var prevDate = '', prevSlot = '';
      var rowsHtml = g.rows.map(function (r) {
        var slot = r.date + r.turno;
        var showDate = r.date !== prevDate, showTurno = slot !== prevSlot;
        var sub = !showTurno;
        prevDate = r.date; prevSlot = slot;
        var docs = r.docs.length ? r.docs.map(function (k) {
          var d = DOC[k] || { name: k, short: k };
          var hit = (F.doc === k) || toks.some(function (tk) { return norm(d.name).indexOf(tk) >= 0; });
          return '<button class="doc' + (hit ? ' hit' : '') + '" data-doc="' + esc(k) + '" title="Ver só ' + esc(d.name) + '">' + hl(d.name, toks) + '</button>';
        }).join('') : '<span class="st st-' + r.status + '">' + ({ feriado: 'Feriado', fechado: 'Fechado', vazio: 'Em aberto' }[r.status] || esc(r.raw)) + '</span>';
        var notes = '';
        if (r.holiday && r.turno !== 'feriado') notes += '<span class="note hol">' + hl(r.holiday, toks) + '</span>';
        if (r.turno === 'feriado') notes += '<span class="note hol">' + hl(r.holiday, toks) + '</span>';
        (r.tags || []).forEach(function (t) {
          if (t === 'feriado' && !r.docs.length) return;
          if (t === 'fechado' && !r.docs.length) return;
          notes += '<span class="note' + (t === 'trocar' ? ' warn' : '') + '">' + esc({ fechado: 'Fechado', trocar: 'Trocar', feriado: 'Feriado', vago: 'Vago', adefinir: 'A definir' }[t] || t) + '</span>';
        });
        if (r.note && !(r.tags || []).length) notes += '<span class="note">' + esc(r.note) + '</span>';
        var ch = CH[r.sheet + '|' + r.date];
        if (ch) {
          var tip = ch.map(function (c) { return fmtAt(c.at) + ': ' + (c.kind === 'novo' ? 'incluído (' + c.to + ')' : c.kind === 'removido' ? 'removido' : (c.from + ' → ' + c.to)); }).join('\n');
          notes += '<button class="chg-dot" data-hist="' + esc(ddmm(r.date)) + '" title="' + esc('Alterado\n' + tip) + '" aria-label="Ver histórico deste plantão"><i></i>' + (ch.length > 1 ? ch.length + ' alterações' : 'alterado') + '</button>';
        }
        return '<div class="row' + (sub ? ' sub' : '') + (r.date < TODAY ? ' past' : '') + '">' +
          '<div class="c-date' + (showDate ? '' : ' dim') + '"><span class="wd">' + WD[r.wd] + '</span>' + ddmm(r.date) + '</div>' +
          '<div class="c-turno' + (showTurno ? '' : ' dim') + '">' + (ICON[r.turno] || '') + esc((T[r.turno] || { short: r.turno }).short) + '</div>' +
          '<div class="c-unit">' + unitPill(r.unit) + '</div>' +
          '<div class="docs">' + docs + '</div><div class="notes">' + notes + '</div></div>';
      }).join('');
      return '<section class="group"><div class="ghead"><h3>' + esc(title) + '</h3>' + tags + '</div><div class="rows">' + rowsHtml + '</div></section>';
    }).join('');
  }

  function renderDoctors() {
    var stats = {};
    D.doctors.forEach(function (d) { stats[d.key] = { d: d, total: 0, rest: 0, next: null, units: {} }; });
    D.rows.forEach(function (r) {
      if (F.units.length && F.units.indexOf(r.unit) < 0) return;
      if (F.turnos.length && F.turnos.indexOf(r.turno) < 0) return;
      r.docs.forEach(function (k) {
        var s = stats[k]; if (!s) return;
        s.total++; s.units[r.unit] = (s.units[r.unit] || 0) + 1;
        if (r.date >= TODAY) { s.rest++; if (!s.next || r.date < s.next.date) s.next = r; }
      });
    });
    var list = Object.keys(stats).map(function (k) { return stats[k]; }).filter(function (s) { return s.total > 0; });
    var toks = qTokens();
    if (toks.length) list = list.filter(function (s) { var n = norm(s.d.name); return toks.every(function (t) { return n.indexOf(t) >= 0; }); });
    if (F.dsort === 'total') list.sort(function (a, b) { return b.total - a.total || a.d.short.localeCompare(b.d.short, 'pt-BR'); });
    else if (F.dsort === 'prox') list.sort(function (a, b) { return (a.next ? a.next.date : '9') < (b.next ? b.next.date : '9') ? -1 : 1; });
    else list.sort(function (a, b) { return a.d.short.localeCompare(b.d.short, 'pt-BR'); });
    var max = Math.max.apply(null, list.map(function (s) { return s.total; }).concat([1]));
    var colors = { matriz: 'var(--u-matriz)', eco: 'var(--u-eco)', seminario: 'var(--u-sem)', 'matriz-eco': 'var(--u-fer)', outra: 'var(--muted)' };
    var rows = list.map(function (s) {
      var bar = ['matriz', 'eco', 'seminario', 'matriz-eco', 'outra'].map(function (u) {
        var n = s.units[u] || 0; if (!n) return '';
        return '<span style="width:' + (n / max * 100).toFixed(2) + '%;background:' + colors[u] + '" title="' + esc(U[u].label) + ': ' + n + '"></span>';
      }).join('');
      var nx = s.next ? WD[s.next.wd] + ' ' + ddmm(s.next.date) + ' · ' + esc(T[s.next.turno].short) + ' · ' + esc(U[s.next.unit].label) : '<span class="hint">—</span>';
      return '<tr><td><button class="dname" data-doc="' + esc(s.d.key) + '">' + hl(s.d.name, toks) + '</button></td><td class="mono" style="font-size:13px">' + nx + '</td>' +
        '<td class="n">' + s.rest + '</td><td class="n">' + s.total + '</td><td><div class="bar-u">' + bar + '</div></td></tr>';
    }).join('');
    var sorts = [['nome', 'A–Z'], ['total', 'Mais plantões'], ['prox', 'Próximo plantão']].map(function (x) {
      return '<button class="chip" data-dsort="' + x[0] + '" aria-pressed="' + (F.dsort === x[0]) + '">' + x[1] + '</button>';
    }).join('');
    var legend = ['matriz', 'eco', 'seminario', 'matriz-eco'].map(function (u) { return '<span>' + unitPill(u) + '</span>'; }).join('');
    return '<div class="dsort">' + sorts + '</div>' +
      (list.length ? '<div class="dtable-wrap"><table class="dtable"><thead><tr><th>Médico</th><th>Próximo plantão</th><th class="n">Restantes</th><th class="n">No ano</th><th>Distribuição por unidade</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="legend">' + legend + '<span>Contagens respeitam os filtros de unidade e turno. Clique num nome para ver a escala dele.</span></div>'
        : '<div class="empty">Nenhum médico encontrado.</div>');
  }

  var WTYPES = {
    versao: ['Duas versões na mesma aba', 'A aba tem uma versão antiga lado a lado com a atual. O site usa a de data mais recente; abaixo, as datas em que as duas discordam.'],
    ano: ['Ano digitado diferente', 'Datas digitadas com outro ano. O site considera o ano da escala.'],
    vazio: ['Plantão sem médico', 'Datas que aparecem na planilha sem nome preenchido.'],
    trocar: ['Marcado para troca', 'Anotações de troca feitas na própria planilha.'],
    diasemana: ['Dia da semana não confere', 'A data não cai no dia da semana da aba.'],
    data: ['Data inexistente', 'Dia que não existe no mês indicado.'],
    duplicado: ['Data repetida', 'A mesma data aparece mais de uma vez na aba.']
  };
  function warnGroups() {
    var g = {}, out = [];
    (D.warnings || []).forEach(function (w) {
      var k = w.type + '|' + w.sheet;
      if (!g[k]) { g[k] = { type: w.type, sheet: w.sheet, items: [] }; out.push(g[k]); }
      g[k].items.push(w);
    });
    return out;
  }
  function changeList(changes, limit) {
    var lab = { novo: 'Novo', removido: 'Removido', mudou: 'Troca', texto: 'Ajuste' };
    var shown = changes.slice(0, limit || changes.length);
    return '<ul class="wlist">' + shown.map(function (c) {
      var wd = WD[parseISO(c.date).getUTCDay()];
      var txt = c.kind === 'mudou' ? esc(c.from) + ' → <b>' + esc(c.to) + '</b>' : c.kind === 'novo' ? '<b>' + esc(c.to) + '</b>' : '<s>' + esc(c.from) + '</s>';
      return '<li><span class="mono">' + wd + ' ' + ddmm(c.date) + '</span><span><span class="k chg-' + c.kind + '">' + lab[c.kind] + '</span> ' + esc(sheetLabel(c.sheet)) + ' · ' + txt + '</span></li>';
    }).join('') + (limit && changes.length > limit ? '<li><span></span><span class="hint">e mais ' + (changes.length - limit) + '…</span></li>' : '') + '</ul>';
  }
  function sheetLabel(name) {
    var s = D.sheets.filter(function (x) { return x.name === name; })[0];
    if (!s || !T[s.turno]) return name;
    return T[s.turno].short + ' · ' + (U[s.unit] || U.outra).label;
  }
  function renderWarnings() {
    var groups = warnGroups();
    var w = '<section class="wsec"><h3>Inconsistências na planilha</h3><p class="lead">Coisas que o site encontrou ao ler o arquivo. Nada disso é alterado na planilha original; servem para conferir com quem faz a escala.</p>' +
      (groups.length ? groups.map(function (g) {
        var t = WTYPES[g.type] || [g.type, ''];
        return '<details class="wcard"><summary><span class="wt">' + esc(t[0]) + '</span><span class="wn">' + g.items.length + '</span><span class="ws">' + esc(g.sheet) + '</span></summary>' +
          '<p class="lead" style="padding:0 14px">' + esc(t[1]) + '</p><ul class="wlist">' + g.items.map(function (x) {
            return '<li><span class="mono">' + (x.type === 'ano' ? '—' : WD[parseISO(x.date).getUTCDay()] + ' ' + ddmm(x.date)) + '</span><span>' + esc(x.msg) + '</span></li>';
          }).join('') + '</ul></details>';
      }).join('') : '<p class="ok">Nenhuma inconsistência encontrada.</p>') + '</section>';
    var sheets = '<section class="wsec"><h3>Abas lidas</h3><div class="dtable-wrap"><table class="dtable"><thead><tr><th>Aba</th><th>Turno</th><th>Unidade</th><th class="n">Plantões</th><th>Atualizada em</th></tr></thead><tbody>' +
      D.sheets.map(function (s) {
        var v = s.versions[s.current];
        return '<tr><td>' + esc(s.name) + '</td><td>' + esc((T[s.turno] || { label: '—' }).label) + '</td><td>' + unitPill(s.unit) + '</td><td class="n">' + s.count + '</td><td class="mono">' + (v ? P.fmtBR(v.updated) : '—') + (s.versions.length > 1 ? ' <span class="hint">(' + s.versions.length + ' versões)</span>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></section>';
    return w + sheets;
  }

  var KIND = { novo: ['Novo', 'chg-novo'], removido: ['Removido', 'chg-removido'], mudou: ['Troca', 'chg-mudou'], texto: ['Ajuste', 'chg-texto'] };
  function renderHistory() {
    if (!HIST.length) return '<div class="empty">O histórico começa na próxima atualização da planilha.</div>';
    var toks = qTokens();
    var parts = HIST.map(function (h, hi) {
      var when = fmtAt(h.at, true);
      var by = h.file ? '<button class="arch" data-arch="' + esc(h.file) + '" data-name="' + esc(h.fileName || 'planilha.xlsx') + '" title="Baixar a planilha exatamente como foi importada">' + ICON.download + 'arquivo original</button>' : '';
      if (h.baseline) {
        if (toks.length) return '';
        return '<li class="tl-i base"><span class="tl-n"></span><div class="tl-c"><div class="tl-h"><span class="tl-when">' + esc(when) + '</span><span class="tl-file">' + esc(h.fileName || '') + '</span>' + by + '</div>' +
          '<p class="tl-base">Versão inicial do espelho: <b class="num">' + (h.rows || '') + '</b> plantões em <b class="num">' + (h.sheetCount || '') + '</b> abas.</p></div></li>';
      }
      var ch = (h.changes || []).filter(function (c) {
        if (!toks.length) return true;
        var hay = norm([ddmm(c.date), c.date.split('-').reverse().join('/'), WD_FULL[parseISO(c.date).getUTCDay()], MON_FULL[+c.date.slice(5, 7) - 1], sheetLabel(c.sheet), c.sheet, c.from, c.to, KIND[c.kind][0]].join(' | '));
        return toks.every(function (t) { return hay.indexOf(t) >= 0; });
      });
      if (toks.length && !ch.length) return '';
      var counts = {}; (h.changes || []).forEach(function (c) { counts[c.kind] = (counts[c.kind] || 0) + 1; });
      var chips = ['mudou', 'novo', 'removido', 'texto'].filter(function (k) { return counts[k]; }).map(function (k) {
        return '<span class="cc ' + KIND[k][1] + '"><b class="num">' + counts[k] + '</b> ' + (k === 'mudou' ? (counts[k] > 1 ? 'trocas' : 'troca') : k === 'novo' ? (counts[k] > 1 ? 'novos' : 'novo') : k === 'removido' ? (counts[k] > 1 ? 'removidos' : 'removido') : (counts[k] > 1 ? 'ajustes' : 'ajuste')) + '</span>';
      }).join('');
      if (!chips) chips = '<span class="cc">Nenhum plantão mudou</span>';
      var tabsMoved = (h.sheetChanges || []).filter(function (x) { return x.kind === 'data'; });
      var sheetsTxt = tabsMoved.length ? '<p class="tl-tabs">Abas com nova data de atualização: ' + tabsMoved.map(function (x) { return esc(sheetLabel(x.sheet)) + ' <span class="num">(' + P.fmtBR(x.to) + ')</span>'; }).join(', ') + '</p>' : '';
      var other = (h.sheetChanges || []).filter(function (x) { return x.kind !== 'data'; });
      if (other.length) sheetsTxt += '<p class="tl-tabs">' + other.map(function (x) { return (x.kind === 'nova' ? 'Aba nova: ' : 'Aba removida: ') + esc(x.sheet); }).join(' · ') + '</p>';
      // Group the entries by tab so a long import stays easy to scan.
      var bySheet = {}, order = [];
      ch.forEach(function (c) { if (!bySheet[c.sheet]) { bySheet[c.sheet] = []; order.push(c.sheet); } bySheet[c.sheet].push(c); });
      var detail = order.map(function (sh) {
        return '<div class="tl-g"><div class="tl-gh">' + esc(sheetLabel(sh)) + '</div><ul class="tl-l">' + bySheet[sh].map(function (c) {
          var dt = parseISO(c.date), past = c.date < TODAY;
          var txt = c.kind === 'novo' ? '<b>' + hl(c.to, toks) + '</b>' : c.kind === 'removido' ? '<s>' + hl(c.from, toks) + '</s>' :
            '<span class="from">' + hl(c.from, toks) + '</span><span class="arr">→</span><b>' + hl(c.to, toks) + '</b>';
          return '<li' + (past ? ' class="past"' : '') + '><span class="mono">' + WD[dt.getUTCDay()] + ' ' + ddmm(c.date) + '</span><span class="k ' + KIND[c.kind][1] + '">' + KIND[c.kind][0] + '</span><span class="tx">' + txt + '</span></li>';
        }).join('') + '</ul></div>';
      }).join('');
      var open = toks.length || hi === 0;
      return '<li class="tl-i"><span class="tl-n"></span><div class="tl-c"><details' + (open ? ' open' : '') + '><summary><div class="tl-h"><span class="tl-when">' + esc(when) + '</span><span class="tl-file">' + esc(h.fileName || '') + '</span>' + by + '</div>' +
        '<div class="tl-sum">' + chips + '</div></summary>' + sheetsTxt + (detail || '') + '</details></div></li>';
    }).join('');
    if (!parts) return '<div class="empty">Nada no histórico corresponde à busca.</div>';
    return '<ol class="tl">' + parts + '</ol>';
  }

  function renderMain() {
    var main = document.getElementById('main');
    var list = filtered();
    var sumEl = document.getElementById('summary');
    sumEl.innerHTML = F.tab === 'escala' ? summaryHtml(list) : F.tab === 'medicos' ? '<span>Panorama do ano por médico</span>' :
      F.tab === 'historico' ? '<span>Cada planilha importada fica registrada aqui, com tudo o que mudou.</span>' + (F.q ? '<button class="linkbtn" id="reset">Limpar busca</button>' : '') : '';
    document.querySelector('.filters').hidden = F.tab === 'avisos' || F.tab === 'historico';
    document.querySelector('.search').hidden = F.tab === 'avisos';
    sumEl.hidden = F.tab === 'avisos';
    main.innerHTML = F.tab === 'escala' ? renderRoster(list) : F.tab === 'medicos' ? renderDoctors() : F.tab === 'historico' ? renderHistory() : renderWarnings();
    var rs = document.getElementById('reset'); if (rs) rs.onclick = resetFilters;
  }

  function resetFilters() {
    F.q = ''; F.units = []; F.turnos = []; F.doc = ''; F.month = ''; F.past = false;
    saveF(); renderAll();
  }

  function renderAll() {
    app.innerHTML = renderHeader() + nextWeekend() + renderBar() + '<main id="main"></main>' +
      '<footer class="foot"><span>Espelho da planilha “Plantão final de semana MATRIZ · ECO · SEMINÁRIO”. Em caso de dúvida, vale a planilha original.</span>' +
      '<span class="foot-act"><button class="linkbtn sm" id="f-tok">Acesso ao GitHub</button>' + (canWrite ? '<button class="linkbtn sm" id="f-pw">Trocar senha</button>' : '') + '<button class="linkbtn sm" id="f-lock">Bloquear neste aparelho</button></span></footer>' +
      '<div id="layer"></div>';
    bind();
    renderMain();
    if (canWrite) document.getElementById('upd').hidden = false;
  }

  function toggleIn(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }

  function bind() {
    var q = document.getElementById('q'), qc = document.getElementById('qclear');
    q.addEventListener('input', function () { F.q = q.value; qc.hidden = !F.q; renderMain(); });
    qc.addEventListener('click', function () { F.q = ''; q.value = ''; qc.hidden = true; renderMain(); q.focus(); });
    document.getElementById('doc').addEventListener('change', function (e) { F.doc = e.target.value; saveF(); renderMain(); });
    document.getElementById('month').addEventListener('change', function (e) { F.month = e.target.value; document.getElementById('past').disabled = !!F.month; saveF(); renderMain(); });
    document.getElementById('past').addEventListener('change', function (e) { F.past = e.target.checked; saveF(); renderMain(); });
    app.addEventListener('click', onClick);
    var pick = document.getElementById('pick'), file = document.getElementById('file');
    pick.addEventListener('click', function () { file.click(); });
    document.getElementById('f-tok').onclick = function () { askToken(); };
    var fpw = document.getElementById('f-pw'); if (fpw) fpw.onclick = changePassword;
    document.getElementById('f-lock').onclick = function () { CTX.lock(); };
    file.addEventListener('change', function () { if (file.files[0]) handleFile(file.files[0]); file.value = ''; });
  }
  var clickBound = false;
  function onClick(e) {
    var ar = e.target.closest('[data-arch]');
    if (ar) { e.preventDefault(); downloadArchive(ar.dataset.arch, ar.dataset.name); return; }
    var t = e.target.closest('[data-unit],[data-turno],[data-tab],[data-doc],[data-dsort],[data-hist]');
    if (!t || !app.contains(t) || t.closest('#layer')) return;
    if (t.dataset.unit) { toggleIn(F.units, t.dataset.unit); t.setAttribute('aria-pressed', F.units.indexOf(t.dataset.unit) >= 0); }
    else if (t.dataset.turno) { toggleIn(F.turnos, t.dataset.turno); t.setAttribute('aria-pressed', F.turnos.indexOf(t.dataset.turno) >= 0); }
    else if (t.dataset.tab) { F.tab = t.dataset.tab; document.querySelectorAll('.tab').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === F.tab); }); }
    else if (t.dataset.dsort) { F.dsort = t.dataset.dsort; }
    else if (t.dataset.hist) {
      F.tab = 'historico'; F.q = t.dataset.hist;
      var qi = document.getElementById('q'); qi.value = F.q; document.getElementById('qclear').hidden = false;
      document.querySelectorAll('.tab').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === F.tab); });
      window.scrollTo({ top: document.querySelector('.bar').offsetTop - 4, behavior: 'smooth' });
    }
    else if (t.dataset.doc) {
      F.doc = F.doc === t.dataset.doc ? '' : t.dataset.doc; F.tab = 'escala';
      document.getElementById('doc').value = F.doc;
      document.querySelectorAll('.tab').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === F.tab); });
      window.scrollTo({ top: document.querySelector('.bar').offsetTop - 4, behavior: 'smooth' });
    }
    saveF(); renderMain();
  }

  // ---------- update: drop a new .xlsx, preview the diff, publish ----------
  var xlsxLoading = null;
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsxLoading) return xlsxLoading;
    xlsxLoading = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = XLSX_URL;
      s.onload = function () { window.XLSX ? res(window.XLSX) : rej(new Error('lib')); };
      s.onerror = function () { xlsxLoading = null; rej(new Error('Não consegui carregar o leitor de planilhas. Verifique a conexão e tente de novo.')); };
      document.head.appendChild(s);
    });
    return xlsxLoading;
  }
  function wbToSheets(X, wb) {
    var meta = (wb.Workbook && wb.Workbook.Sheets) || [];
    return wb.SheetNames.map(function (name, i) {
      if (meta[i] && meta[i].Hidden) return null;
      var ws = wb.Sheets[name];
      if (!ws || !ws['!ref']) return { name: name, grid: [] };
      var R = X.utils.decode_range(ws['!ref']), grid = [];
      for (var r = 0; r <= R.e.r; r++) {
        var row = [];
        for (var c = 0; c <= R.e.c; c++) {
          var cell = ws[X.utils.encode_cell({ r: r, c: c })], v = null;
          if (cell) {
            if (cell.t === 'n') {
              var fmt = cell.z || '';
              if (fmt && X.SSF.is_date(fmt)) { var p = X.SSF.parse_date_code(cell.v); v = { $d: [p.y, p.m, p.d] }; }
              else v = cell.v;
            } else if (cell.t === 'd' && cell.v instanceof Date) v = { $d: [cell.v.getFullYear(), cell.v.getMonth() + 1, cell.v.getDate()] };
            else if (cell.t === 's' || cell.t === 'str') v = cell.v;
            else if (cell.t === 'b') v = String(cell.v);
          }
          row.push(v);
        }
        grid.push(row);
      }
      return { name: name, grid: grid };
    }).filter(Boolean);
  }

  function layer(html) { var l = document.getElementById('layer'); l.innerHTML = html; return l; }
  function closeLayer() { layer(''); }

  var pending = null;
  function handleFile(file) {
    if (!canWrite) return;
    if (!/\.xls[xm]?$/i.test(file.name)) { showError('Esse arquivo não parece uma planilha do Excel (.xlsx). Baixe a planilha pelo Excel Online em Arquivo → Criar uma cópia → Baixar uma cópia.'); return; }
    layer('<div class="modal"><div class="sheet"><div class="sheet-h"><h2>Lendo a planilha…</h2><p class="hint"><span class="spinner"></span> ' + esc(file.name) + '</p></div></div></div>');
    Promise.all([loadXLSX(), file.arrayBuffer()]).then(function (res) {
      var X = res[0];
      var wb = X.read(new Uint8Array(res[1]), { type: 'array', cellNF: true, cellDates: false });
      var parsed = P.parseWorkbook(wbToSheets(X, wb), { defaultYear: new Date().getFullYear() });
      if (!parsed.rows.length) throw new Error('Não encontrei nenhuma escala nesse arquivo. Confira se é a planilha de plantões.');
      var changes = P.diff(D, parsed);
      pending = { data: parsed, changes: changes, fileName: file.name, fileSize: file.size, bytes: new Uint8Array(res[1]) };
      showPreview();
    }).catch(function (err) { showError(err && err.message ? err.message : 'Não consegui ler esse arquivo.'); });
  }

  function showError(msg) {
    layer('<div class="modal"><div class="sheet"><div class="sheet-h"><h2>Não deu para atualizar</h2></div><div class="sheet-b"><div class="alert bad">' + esc(msg) + '</div></div><div class="sheet-f"><button class="btn" id="m-close">Fechar</button></div></div></div>');
    document.getElementById('m-close').onclick = closeLayer;
  }

  function showPreview() {
    var p = pending, n = p.data;
    var shrink = n.rows.length < D.rows.length * 0.6;
    var upcoming = p.changes.filter(function (c) { return c.date >= TODAY; }).length;
    var sd = P.sheetDiff(D, n).filter(function (x) { return x.kind === 'data'; });
    var body = '<div class="stats"><span><b>' + n.sheets.length + '</b> abas</span><span><b>' + n.rows.length + '</b> plantões</span><span><b>' + n.doctors.length + '</b> médicos</span><span><b>' + p.changes.length + '</b> mudanças (' + upcoming + ' futuras)</span></div>' +
      (shrink ? '<div class="alert bad">O arquivo novo tem bem menos plantões que o atual (' + n.rows.length + ' contra ' + D.rows.length + '). Confira se é a planilha certa antes de publicar.</div>' : '') +
      (sd.length ? '<p class="hint" style="margin:0 0 10px">Abas com nova data de atualização: ' + sd.map(function (x) { return esc(sheetLabel(x.sheet)); }).join(', ') + '</p>' : '') +
      (p.changes.length ? changeList(p.changes, 80) : '<p class="ok">Nenhum plantão mudou em relação ao que está no site.</p>') +
      '<p class="hint" style="margin-top:12px">Ao publicar, esta importação entra no histórico com todas as mudanças acima, e o arquivo original fica guardado (criptografado) no repositório.</p>';
    layer('<div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-t"><div class="sheet"><div class="sheet-h"><h2 id="m-t">Prévia da atualização</h2><p class="hint">' + esc(p.fileName) + '</p></div>' +
      '<div class="sheet-b">' + body + '</div><div class="sheet-f"><span class="hint" id="m-status" style="margin-right:auto;align-self:center"></span><button class="btn" id="m-cancel">Cancelar</button><button class="btn primary" id="m-pub">' + (p.changes.length ? 'Publicar atualização' : 'Publicar mesmo assim') + '</button></div></div></div>');
    document.getElementById('m-cancel').onclick = function () { pending = null; closeLayer(); };
    document.getElementById('m-pub').onclick = publish;
  }

  // ---------- GitHub: grava a escala criptografada no repositório ----------
  var GH_API = 'https://api.github.com';
  function ghToken() { try { return localStorage.getItem('escala-gh-token') || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem('escala-gh-token', t); else localStorage.removeItem('escala-gh-token'); } catch (e) {} }
  function gh(path, opts, tokenOverride) {
    opts = opts || {};
    return fetch(GH_API + '/repos/' + CTX.repo.owner + '/' + CTX.repo.name + path, {
      method: opts.method || 'GET',
      headers: { 'Authorization': 'Bearer ' + (tokenOverride || ghToken()), 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store'
    }).then(function (res) {
      return res.text().then(function (txt) {
        var j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
        if (!res.ok) throw { status: res.status, message: (j && j.message) || res.statusText };
        return j;
      });
    }, function () { throw { status: 0, message: 'sem conexão com o GitHub' }; });
  }
  // Só libera os controles se o token puder gravar neste repositório.
  function verifyToken(tok) {
    return gh('', null, tok).then(function (j) {
      var p = j && j.permissions;
      if (!p || !(p.push || p.maintain || p.admin)) throw { status: 403, message: 'sem permissão de escrita' };
    });
  }
  function utf8b64(str) { return EscalaCrypto.b64(new TextEncoder().encode(str)); }
  // Vários arquivos num único commit (Git Data API).
  function commitFiles(files, message) {
    var br = CTX.repo.branch, head;
    return gh('/git/ref/heads/' + br).then(function (ref) {
      head = ref.object.sha;
      return gh('/git/commits/' + head);
    }).then(function (commit) {
      return Promise.all(files.map(function (f) {
        return gh('/git/blobs', { method: 'POST', body: { content: f.b64, encoding: 'base64' } })
          .then(function (b) { return { path: f.path, mode: '100644', type: 'blob', sha: b.sha }; });
      })).then(function (tree) { return gh('/git/trees', { method: 'POST', body: { base_tree: commit.tree.sha, tree: tree } }); });
    }).then(function (tree) {
      return gh('/git/commits', { method: 'POST', body: { message: message, tree: tree.sha, parents: [head] } });
    }).then(function (c) {
      return gh('/git/refs/heads/' + br, { method: 'PATCH', body: { sha: c.sha } });
    });
  }
  function ghErrorText(err) {
    var s = err && err.status;
    if (s === 401) return 'O GitHub não aceitou o token (expirado ou incompleto). Configure um token novo.';
    if (s === 403 || s === 404) return 'O token não tem permissão de escrita em ' + CTX.repo.owner + '/' + CTX.repo.name + '. Gere um token com "Contents: Read and write" para esse repositório.';
    if (s === 422 || s === 409) return 'O repositório mudou durante a publicação. Recarregue a página e tente de novo.';
    if (s === 0) return 'Sem conexão com o GitHub. Verifique a internet e tente de novo.';
    return 'O GitHub recusou a gravação' + (err && err.message ? ' (' + err.message + ')' : '') + '.';
  }

  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 5200);
  }

  function askToken(then) {
    var has = !!ghToken();
    layer('<div class="modal" role="dialog" aria-modal="true" aria-labelledby="t-t"><div class="sheet"><div class="sheet-h"><h2 id="t-t">Acesso ao GitHub</h2>' +
      '<p class="hint">Só é preciso para publicar atualizações. O token fica guardado apenas neste navegador.</p></div><div class="sheet-b">' +
      '<ol class="steps"><li>Abra <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Fine-grained tokens</a> no GitHub.</li>' +
      '<li>Em <b>Repository access</b>, marque <i>Only select repositories</i> e escolha <b>' + esc(CTX.repo.name) + '</b>.</li>' +
      '<li>Em <b>Permissions → Contents</b>, escolha <i>Read and write</i>.</li><li>Gere o token e cole aqui.</li></ol>' +
      '<label class="fld" for="tok"><span>Token</span><input id="tok" type="password" autocomplete="off" spellcheck="false" placeholder="' + (has ? 'Token salvo. Cole outro para trocar' : 'github_pat_…') + '"></label>' +
      '<p class="fmsg" id="t-msg" role="alert"></p></div><div class="sheet-f">' +
      (has ? '<button class="btn" id="t-del" style="margin-right:auto">Remover token</button>' : '') +
      '<button class="btn" id="t-cancel">Cancelar</button><button class="btn primary" id="t-ok">Salvar</button></div></div></div>');
    var inp = document.getElementById('tok'), msg = document.getElementById('t-msg');
    inp.focus();
    document.getElementById('t-cancel').onclick = function () { closeLayer(); if (then && pending) showPreview(); };
    if (has) document.getElementById('t-del').onclick = function () { setToken(''); canWrite = false; renderAll(); toast('Token removido. Os controles de atualização foram ocultados neste navegador.'); };
    function save() {
      var tok = inp.value.trim();
      if (!tok) { msg.textContent = 'Cole o token gerado no GitHub.'; return; }
      var ok = document.getElementById('t-ok'); ok.disabled = true; msg.textContent = 'Conferindo…';
      verifyToken(tok).then(function () {
        setToken(tok); canWrite = true; renderAll();
        if (then) then(); else toast('Token salvo. Os controles de atualização agora aparecem neste navegador.');
      }).catch(function (err) { ok.disabled = false; msg.textContent = ghErrorText(err); });
    }
    document.getElementById('t-ok').onclick = save;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') save(); });
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function stampOf(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '_' + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds()); }
  function safeName(n) { return n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'planilha.xlsx'; }

  function applyState(state) {
    STATE = state; D = state.data; HIST = state.history || [];
    indexData(); buildCH();
  }

  function publish() {
    if (!ghToken()) { askToken(function () { showPreview(); publish(); }); return; }
    var btn = document.getElementById('m-pub'), st = document.getElementById('m-status');
    btn.disabled = true; document.getElementById('m-cancel').disabled = true;
    st.innerHTML = '<span class="spinner"></span> Criptografando…';
    var p = pending, data = JSON.parse(JSON.stringify(p.data));
    data.rows.forEach(function (r) { delete r.hay; delete r.gk; });
    var now = new Date();
    var archPath = 'data/arquivos/' + stampOf(now) + '__' + safeName(p.fileName) + '.enc.json';
    var entry = { at: now.toISOString(), fileName: p.fileName, fileSize: p.fileSize, file: archPath, rows: data.rows.length, sheetCount: data.sheets.length,
      changes: p.changes, sheetChanges: P.sheetDiff(D, data) };
    var state = { v: 2, data: data, history: [entry].concat(HIST) };
    Promise.all([EscalaCrypto.sealJSON(CTX.key, CTX.salt, state, CTX.iter), EscalaCrypto.seal(CTX.key, CTX.salt, p.bytes, CTX.iter)]).then(function (env) {
      st.innerHTML = '<span class="spinner"></span> Gravando no GitHub…';
      var n = p.changes.length;
      return commitFiles([
        { path: 'data/escala.enc.json', b64: utf8b64(JSON.stringify(env[0])) },
        { path: archPath, b64: utf8b64(JSON.stringify(env[1])) }
      ], 'Escala atualizada: ' + p.fileName + ' (' + (n ? n + (n === 1 ? ' mudança' : ' mudanças') : 'sem mudanças') + ')');
    }).then(function () {
      applyState(state); pending = null; closeLayer();
      F.tab = 'historico'; F.q = ''; saveF(); renderAll();
      toast('Publicado. Para quem abrir o site agora, a nova versão aparece em cerca de 1 minuto.');
    }).catch(function (err) {
      btn.disabled = false; document.getElementById('m-cancel').disabled = false;
      st.textContent = ghErrorText(err);
      if (err && (err.status === 401 || err.status === 403 || err.status === 404)) { st.innerHTML = esc(ghErrorText(err)) + ' <button class="linkbtn" id="m-tok">Configurar token</button>'; document.getElementById('m-tok').onclick = function () { askToken(function () { showPreview(); }); }; }
    });
  }

  function downloadArchive(path, name) {
    toast('Preparando o arquivo…');
    fetch(path + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (env) { return EscalaCrypto.open(CTX.key, env); })
      .then(function (bytes) {
        var url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        var a = document.createElement('a'); a.href = url; a.download = name || 'escala.xlsx'; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
        var t = document.getElementById('toast'); if (t) t.hidden = true;
      }).catch(function () { toast('Esse arquivo ainda não está disponível. Se acabou de publicar, aguarde um minuto.'); });
  }

  function changePassword() {
    if (!ghToken()) { askToken(changePassword); return; }
    layer('<div class="modal" role="dialog" aria-modal="true" aria-labelledby="p-t"><div class="sheet"><div class="sheet-h"><h2 id="p-t">Trocar a senha da escala</h2>' +
      '<p class="hint">Tudo é criptografado de novo com a senha nova, inclusive os arquivos do histórico. Quem já tinha acesso vai precisar da senha nova.</p></div><div class="sheet-b">' +
      '<label class="fld" for="pw1"><span>Senha nova</span><input id="pw1" type="password" autocomplete="new-password"></label>' +
      '<label class="fld" for="pw2"><span>Repita a senha</span><input id="pw2" type="password" autocomplete="new-password"></label>' +
      '<p class="fmsg" id="p-msg" role="alert"></p></div><div class="sheet-f"><button class="btn" id="p-cancel">Cancelar</button><button class="btn primary" id="p-ok">Trocar senha</button></div></div></div>');
    var msg = document.getElementById('p-msg');
    document.getElementById('pw1').focus();
    document.getElementById('p-cancel').onclick = closeLayer;
    document.getElementById('p-ok').onclick = function () {
      var a = document.getElementById('pw1').value, b = document.getElementById('pw2').value;
      if (a.length < 6) { msg.textContent = 'Use pelo menos 6 caracteres.'; return; }
      if (a !== b) { msg.textContent = 'As duas senhas não são iguais.'; return; }
      var ok = this; ok.disabled = true; msg.innerHTML = '<span class="spinner"></span> Criptografando de novo…';
      var salt = EscalaCrypto.newSalt(), iter = EscalaCrypto.ITER, newKey;
      var files = HIST.filter(function (h) { return h.file; }).map(function (h) { return h.file; });
      EscalaCrypto.deriveKey(a, salt, iter).then(function (k) {
        newKey = k;
        return Promise.all(files.map(function (f) {
          return fetch(f + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) return null; return r.json(); })
            .then(function (env) { return env ? EscalaCrypto.open(CTX.key, env) : null; })
            .then(function (bytes) { return bytes ? EscalaCrypto.seal(newKey, salt, bytes, iter).then(function (e2) { return { path: f, b64: utf8b64(JSON.stringify(e2)) }; }) : null; });
        }));
      }).then(function (arch) {
        return EscalaCrypto.sealJSON(newKey, salt, STATE, iter).then(function (env) {
          var list = [{ path: 'data/escala.enc.json', b64: utf8b64(JSON.stringify(env)) }].concat(arch.filter(Boolean));
          msg.innerHTML = '<span class="spinner"></span> Gravando no GitHub…';
          return commitFiles(list, 'Senha da escala alterada');
        });
      }).then(function () {
        CTX.key = newKey; CTX.salt = salt; CTX.iter = iter;
        return CTX.remember(newKey, salt);
      }).then(function () { closeLayer(); toast('Senha trocada. Em cerca de 1 minuto vale só a senha nova.'); })
        .catch(function (err) { ok.disabled = false; msg.textContent = err && err.status !== undefined ? ghErrorText(err) : 'Não consegui trocar a senha.'; });
    };
  }

  // Drag-and-drop anywhere on the page.
  var dragDepth = 0;
  function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; }
  window.addEventListener('dragenter', function (e) {
    if (!canWrite || !hasFiles(e)) return; e.preventDefault(); dragDepth++;
    if (dragDepth === 1 && !pending) layer('<div class="drop"><div class="drop-box">' + ICON.sheet + '<h2>Solte a planilha aqui</h2><p class="hint">O site lê o .xlsx, mostra o que mudou e só publica quando você confirmar.</p></div></div>');
  });
  window.addEventListener('dragover', function (e) { if (canWrite && hasFiles(e)) e.preventDefault(); });
  window.addEventListener('dragleave', function (e) { if (!canWrite || !hasFiles(e)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth && document.querySelector('#layer .drop')) closeLayer(); });
  window.addEventListener('drop', function (e) {
    if (!canWrite || !hasFiles(e)) return; e.preventDefault(); dragDepth = 0;
    var f = e.dataTransfer.files[0]; if (f) handleFile(f); else closeLayer();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.querySelector('#layer .modal') && !document.querySelector('#m-pub[disabled]')) { pending = null; closeLayer(); } });

  canWrite = false;
  renderAll();
  if (ghToken()) {
    verifyToken(ghToken()).then(function () { canWrite = true; renderAll(); }, function (err) {
      // Token revogado ou sem permissão: some deste navegador. Falha de rede: só mantém oculto.
      if (err && (err.status === 401 || err.status === 403 || err.status === 404)) setToken('');
    });
  }
}
