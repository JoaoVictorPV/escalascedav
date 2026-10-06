/* Escala parser: workbook grids -> flat rows. Pure functions, shared by the page and the build. */
var EscalaParser = (function () {
  var MONTHS = ['JANEIRO','FEVEREIRO','MARCO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  var WD_WORDS = { DOMINGO:0, SEGUNDA:1, TERCA:2, QUARTA:3, QUINTA:4, SEXTA:5, SABADO:6 };
  var STATUS_WORDS = { FERIADO:'feriado', FECHADO:'fechado', TROCAR:'trocar', VAGO:'vago', 'A DEFINIR':'adefinir' };
  var TURNOS = {
    'sex-noite': { label:'6ª feira · noite', short:'Sex noite', wd:5, order:1 },
    'sab-manha': { label:'Sábado · manhã', short:'Sáb manhã', wd:6, order:2 },
    'sab-tarde': { label:'Sábado · tarde', short:'Sáb tarde', wd:6, order:3 },
    'dom':       { label:'Domingo', short:'Domingo', wd:0, order:4 },
    'feriado':   { label:'Feriado', short:'Feriado', wd:null, order:5 }
  };
  var UNITS = {
    'matriz':     { label:'Matriz', order:1 },
    'eco':        { label:'Ecoimagem', order:2 },
    'seminario':  { label:'Seminário', order:3 },
    'matriz-eco': { label:'Matriz + Ecoimagem', order:4 },
    'outra':      { label:'Outra', order:9 }
  };

  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase().replace(/\s+/g, ' ').trim();
  }
  function isText(v) { return typeof v === 'string' && v.trim() !== ''; }
  function isDateCell(v) { return v && typeof v === 'object' && Array.isArray(v.$d); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function weekday(y, m, d) { return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
  function validDate(y, m, d) {
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }
  function titleCase(s) {
    return s.toLowerCase().replace(/(^|[\s.\-'])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); })
      .replace(/\b(Da|De|Do|Das|Dos|E)\b/g, function (w) { return w.toLowerCase(); });
  }
  function cell(g, r, c) { return (g[r] && c >= 0 && c < g[r].length) ? g[r][c] : null; }

  function sheetKind(name) {
    var n = norm(name), turno, unit;
    if (n.indexOf('FERIADO') >= 0) turno = 'feriado';
    else if (n.indexOf('DOMINGO') >= 0) turno = 'dom';
    else if (n.indexOf('SABADO') >= 0 && n.indexOf('TARDE') >= 0) turno = 'sab-tarde';
    else if (n.indexOf('SABADO') >= 0) turno = 'sab-manha';
    else if (/(^|\s)6/.test(n) || n.indexOf('SEXTA') >= 0) turno = 'sex-noite';
    else turno = null;
    var hasM = n.indexOf('MATRIZ') >= 0, hasE = /\bECO/.test(n), hasS = n.indexOf('SEMINARIO') >= 0;
    if (hasS) unit = 'seminario';
    else if (hasM && hasE) unit = 'matriz-eco';
    else if (hasE) unit = 'eco';
    else if (hasM) unit = 'matriz';
    else unit = 'outra';
    return { turno: turno, unit: unit };
  }

  // Split a cell like "DR. JOÃO / DR. RAMON - FECHADO" into doctors and status tags.
  function parseNames(raw) {
    var out = { names: [], tags: [] };
    if (!isText(raw)) return out;
    raw.split('/').forEach(function (part) {
      part.split(/\s[-–]\s/).forEach(function (tok) {
        var n = norm(tok).replace(/[.;,:]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!n) return;
        if (STATUS_WORDS[n]) { out.tags.push(STATUS_WORDS[n]); return; }
        var prefix = /^DRA\b/.test(n) ? 'Dra.' : (/^DR\b/.test(n) ? 'Dr.' : '');
        var key = n.replace(/^(DRA?\s+)+/, '').trim();
        if (/^DRA?$/.test(key) || !key) return;
        var orig = tok.trim().replace(/^D\s*R\s*A?\s*[.;:,]*\s*/i, '').replace(/[\s;,]+$/, '').trim();
        out.names.push({ key: key, prefix: prefix, orig: orig || key });
      });
    });
    return out;
  }

  function parseSheet(sheet, opts, warnings) {
    var g = sheet.grid, name = sheet.name.trim(), kind = sheetKind(name);
    var year = null, versions = [], months = [], rows = [];
    for (var r = 0; r < g.length; r++) for (var c = 0; c < (g[r] || []).length; c++) {
      var v = g[r][c];
      if (!isText(v)) continue;
      var n = norm(v);
      var mu = n.match(/ATUALIZADO\s*:?\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/);
      if (mu) {
        var yy = +mu[3]; if (yy < 100) yy += 2000;
        var title = '';
        for (var k = c - 1; k >= 0; k--) { var t = cell(g, r, k); if (isText(t) && norm(t).indexOf('ATUALIZADO') < 0) { title = t.replace(/\s+/g, ' ').trim(); break; } }
        versions.push({ col: c, updated: iso(yy, +mu[2], +mu[1]), title: title });
        continue;
      }
      if (n.indexOf('ESCALA') >= 0 && year == null) { var my = n.match(/\b(20\d\d)\b/); if (my) year = +my[1]; }
      var mi = MONTHS.indexOf(n);
      if (mi >= 0) months.push({ r: r, c: c, m: mi + 1 });
    }
    if (year == null) year = versions.length ? +versions[0].updated.slice(0, 4) : opts.defaultYear;
    versions.sort(function (a, b) { return a.col - b.col; });
    function versionOf(col) {
      if (!versions.length) return 0;
      for (var i = 0; i < versions.length; i++) if (versions[i].col >= col) return i;
      return versions.length - 1;
    }
    var current = 0;
    versions.forEach(function (v, i) { if (v.updated >= versions[current].updated) current = i; });
    var blockCols = {};
    months.forEach(function (m) { blockCols[m.c] = true; });

    function push(entry, vi) { entry.version = vi; rows.push(entry); }

    var yearFix = [];
    if (kind.turno === 'feriado') {
      for (var r2 = 0; r2 < g.length; r2++) for (var c2 = 0; c2 < (g[r2] || []).length; c2++) {
        var dv = g[r2][c2];
        if (!isDateCell(dv)) continue;
        var y = dv.$d[0], m = dv.$d[1], d = dv.$d[2];
        var desc = cell(g, r2, c2 + 1), doc = cell(g, r2, c2 + 2);
        var descClean = isText(desc) ? desc.replace(/\s+/g, ' ').trim() : '';
        var holiday = descClean.split('/').pop().trim() || descClean;
        if (y !== year) { yearFix.push(pad(d) + '/' + pad(m) + '/' + y); y = year; }
        var wdWord = Object.keys(WD_WORDS).filter(function (w) { return norm(descClean).indexOf(w) === 0; })[0];
        if (wdWord != null && WD_WORDS[wdWord] !== weekday(y, m, d)) {
          warnings.push({ type:'diasemana', sheet:name, date: iso(y, m, d), msg: 'A descrição diz "' + descClean.split('/')[0].trim() + '", mas a data cai em outro dia da semana.' });
        }
        push({ sheet:name, turno:'feriado', unit:kind.unit, y:y, m:m, d:d, raw: isText(doc) ? doc.trim() : (doc == null ? '' : String(doc)), holiday: holiday, note: '' }, versionOf(c2 + 2));
      }
    } else {
      months.forEach(function (mh) {
        var next = g.length;
        months.forEach(function (o) { if (o.c === mh.c && o.r > mh.r && o.r < next) next = o.r; });
        for (var rr = mh.r + 1; rr < next; rr++) {
          var dayv = cell(g, rr, mh.c);
          if (typeof dayv === 'string' && /^\s*\d{1,2}\s*$/.test(dayv)) dayv = +dayv;
          if (typeof dayv !== 'number' || dayv % 1 !== 0 || dayv < 1 || dayv > 31) continue;
          var nm = cell(g, rr, mh.c + 1), note = '';
          var nc = cell(g, rr, mh.c + 2);
          if (isText(nc) && !blockCols[mh.c + 2] && !blockCols[mh.c + 3 - 1]) note = nc.trim();
          push({ sheet:name, turno: kind.turno || 'outro', unit: kind.unit, y: year, m: mh.m, d: dayv,
            raw: isText(nm) ? nm.trim() : (nm == null ? '' : String(nm)), note: note }, versionOf(mh.c + 1));
        }
      });
    }

    if (yearFix.length) warnings.push({ type:'ano', sheet:name, date: iso(year, 1, 1),
      msg: yearFix.length + ' data(s) digitada(s) com outro ano (' + yearFix.join(', ') + ') numa escala de ' + year + '. Considerei todas em ' + year + '.' });
    var meta = { name:name, turno: kind.turno, unit: kind.unit, year: year, versions: versions.map(function (v) { return { updated: v.updated, title: v.title }; }), current: current, count: 0 };

    // Older versions in the same tab: keep the most recent, report where they disagree.
    if (versions.length > 1) {
      var cur = {}, curRows = rows.filter(function (e) { return e.version === current; });
      curRows.forEach(function (e) { cur[iso(e.y, e.m, e.d)] = e; });
      rows.filter(function (e) { return e.version !== current; }).forEach(function (e) {
        var k = iso(e.y, e.m, e.d), c3 = cur[k];
        if (c3 && norm(c3.raw) !== norm(e.raw)) {
          warnings.push({ type:'versao', sheet:name, date:k,
            msg: 'Versão antiga (' + fmtBR(versions[e.version].updated) + ') diz "' + e.raw + '"; a versão de ' + fmtBR(versions[current].updated) + ' diz "' + c3.raw + '".' });
        }
      });
      rows = curRows;
    }
    meta.count = rows.length;
    return { meta: meta, rows: rows };
  }

  function fmtBR(isoStr) { var p = isoStr.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }

  function parseWorkbook(sheets, opts) {
    opts = opts || {};
    if (!opts.defaultYear) opts.defaultYear = new Date().getFullYear();
    var warnings = [], all = [], metas = [];
    sheets.forEach(function (s) {
      var res = parseSheet(s, opts, warnings);
      if (!res.rows.length) return;
      metas.push(res.meta);
      all = all.concat(res.rows);
    });

    // Doctors: merge spelling variants (accents, Dr/Dra, stray dots) under one key.
    var docs = {};
    var holidays = {};
    all.forEach(function (e) {
      var p = parseNames(e.raw);
      e.docs = [];
      p.names.forEach(function (n) {
        var D = docs[n.key] || (docs[n.key] = { key:n.key, variants:{}, prefixes:{}, count:0 });
        D.variants[n.orig] = (D.variants[n.orig] || 0) + 1;
        if (n.prefix) D.prefixes[n.prefix] = (D.prefixes[n.prefix] || 0) + 1;
        if (e.docs.indexOf(n.key) < 0) e.docs.push(n.key);
      });
      e.tags = p.tags;
      if (e.turno === 'feriado') holidays[iso(e.y, e.m, e.d)] = { name: e.holiday, docs: e.docs };
    });
    var doctors = Object.keys(docs).map(function (k) {
      var D = docs[k];
      var best = Object.keys(D.variants).sort(function (a, b) {
        var acc = function (s) { return (s.match(/[^\x00-\x7F]/g) || []).length; };
        return (acc(b) - acc(a)) || (D.variants[b] - D.variants[a]);
      })[0];
      var pre = Object.keys(D.prefixes).sort(function (a, b) { return D.prefixes[b] - D.prefixes[a]; })[0] || '';
      return { key:k, name: (pre ? pre + ' ' : '') + titleCase(best.replace(/\s+/g, ' ')), short: titleCase(best.replace(/\s+/g, ' ')) };
    }).sort(function (a, b) { return a.short.localeCompare(b.short, 'pt-BR'); });

    var seen = {};
    all.forEach(function (e, i) {
      e.date = iso(e.y, e.m, e.d);
      if (!validDate(e.y, e.m, e.d)) {
        warnings.push({ type:'data', sheet:e.sheet, date:e.date, msg:'Dia ' + e.d + ' não existe em ' + MONTHS[e.m - 1].toLowerCase() + '.' });
        e.invalid = true;
      } else {
        e.wd = weekday(e.y, e.m, e.d);
        var exp = TURNOS[e.turno] && TURNOS[e.turno].wd;
        if (exp != null && exp !== e.wd) {
          var names = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
          warnings.push({ type:'diasemana', sheet:e.sheet, date:e.date, msg: fmtBR(e.date) + ' cai numa ' + names[e.wd] + ', não numa ' + names[exp] + '.' });
          e.wdMismatch = true;
        }
      }
      var dupKey = e.sheet + '|' + e.date;
      if (seen[dupKey]) warnings.push({ type:'duplicado', sheet:e.sheet, date:e.date, msg:'Data aparece duas vezes nesta aba ("' + seen[dupKey] + '" e "' + e.raw + '").' });
      seen[dupKey] = e.raw || '(vazio)';

      if (!e.docs.length) {
        e.status = e.tags.indexOf('feriado') >= 0 ? 'feriado' : (e.tags.indexOf('fechado') >= 0 ? 'fechado' : (e.raw ? 'outro' : 'vazio'));
      } else e.status = 'escalado';
      if (e.note) {
        var nn = norm(e.note);
        if (STATUS_WORDS[nn] && e.tags.indexOf(STATUS_WORDS[nn]) < 0) e.tags.push(STATUS_WORDS[nn]);
      }
      if (e.status === 'vazio') warnings.push({ type:'vazio', sheet:e.sheet, date:e.date, msg:'Data sem médico preenchido.' });
      if (e.tags.indexOf('trocar') >= 0) warnings.push({ type:'trocar', sheet:e.sheet, date:e.date, msg:'Marcado para troca na planilha.' });
      if (e.turno !== 'feriado' && holidays[e.date]) e.holiday = holidays[e.date].name;
      e.id = i;
      delete e.version;
    });

    all.sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 :
        ((TURNOS[a.turno] || {order:8}).order - (TURNOS[b.turno] || {order:8}).order) ||
        ((UNITS[a.unit] || {order:9}).order - (UNITS[b.unit] || {order:9}).order);
    });
    warnings.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    return { rows: all, doctors: doctors, sheets: metas, warnings: warnings };
  }

  // What changed between two parsed datasets, slot by slot.
  function diff(oldD, newD) {
    function idx(D) {
      var dn = {}; (D.doctors || []).forEach(function (x) { dn[x.key] = x.name; });
      var m = {};
      (D.rows || []).forEach(function (e) {
        var k = e.sheet + '|' + e.date;
        var who = e.docs.length ? e.docs.map(function (k2) { return dn[k2] || k2; }).join(' / ') : (e.raw || '—');
        m[k] = { sheet:e.sheet, date:e.date, who: who, cmp: e.docs.length ? e.docs.slice().sort().join('/') : norm(e.raw),
          txt: norm(e.raw).replace(/[\s.;,]/g, '') + '|' + norm(e.note || ''), raw: (e.raw || '—') + (e.note ? ' (' + e.note + ')' : '') };
      });
      return m;
    }
    var a = idx(oldD || {}), b = idx(newD), changes = [];
    Object.keys(b).forEach(function (k) {
      if (!a[k]) changes.push({ kind:'novo', sheet:b[k].sheet, date:b[k].date, to:b[k].who });
      else if (a[k].cmp !== b[k].cmp) changes.push({ kind:'mudou', sheet:b[k].sheet, date:b[k].date, from:a[k].who, to:b[k].who });
      else if (a[k].txt !== b[k].txt) changes.push({ kind:'texto', sheet:b[k].sheet, date:b[k].date, from:a[k].raw, to:b[k].raw });
    });
    Object.keys(a).forEach(function (k) { if (!b[k]) changes.push({ kind:'removido', sheet:a[k].sheet, date:a[k].date, from:a[k].who }); });
    changes.sort(function (x, y) { return x.date < y.date ? -1 : x.date > y.date ? 1 : 0; });
    return changes;
  }

  // Which tabs had their "ATUALIZADO" date moved between two imports.
  function sheetDiff(oldD, newD) {
    var a = {}, out = [];
    ((oldD || {}).sheets || []).forEach(function (s) { a[s.name] = s; });
    (newD.sheets || []).forEach(function (s) {
      var nv = s.versions[s.current], o = a[s.name], ov = o && o.versions[o.current];
      if (!o) out.push({ sheet: s.name, kind: 'nova', to: nv ? nv.updated : '' });
      else if ((ov && ov.updated) !== (nv && nv.updated)) out.push({ sheet: s.name, kind: 'data', from: ov ? ov.updated : '', to: nv ? nv.updated : '' });
      delete a[s.name];
    });
    Object.keys(a).forEach(function (k) { out.push({ sheet: k, kind: 'removida' }); });
    return out;
  }

  return { parseWorkbook: parseWorkbook, diff: diff, sheetDiff: sheetDiff, TURNOS: TURNOS, UNITS: UNITS, MONTHS: MONTHS, norm: norm, fmtBR: fmtBR };
})();
if (typeof module !== 'undefined') module.exports = EscalaParser;
