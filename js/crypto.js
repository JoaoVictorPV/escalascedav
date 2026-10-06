/* Criptografia da escala: PBKDF2-SHA256 -> AES-256-GCM. Funciona no navegador e no Node 20+. */
var EscalaCrypto = (function () {
  var subtle = globalThis.crypto.subtle;
  var ITER = 310000;
  function b64(bytes) {
    bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var s = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }
  function unb64(str) {
    var s = atob(str), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function rand(n) { return globalThis.crypto.getRandomValues(new Uint8Array(n)); }
  function deriveKey(pass, saltB64, iter) {
    return subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations: iter || ITER },
        base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    });
  }
  function exportKey(key) { return subtle.exportKey('raw', key).then(b64); }
  function importKey(rawB64) { return subtle.importKey('raw', unb64(rawB64), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']); }
  // envelope: {v, alg, kdf, iter, salt, iv, ct}
  function seal(key, saltB64, bytes, iter) {
    var iv = rand(12);
    return subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes).then(function (ct) {
      return { v: 1, alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iter: iter || ITER, salt: saltB64, iv: b64(iv), ct: b64(ct) };
    });
  }
  function open(key, env) {
    return subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, key, unb64(env.ct)).then(function (b) { return new Uint8Array(b); });
  }
  function sealJSON(key, saltB64, obj, iter) { return seal(key, saltB64, new TextEncoder().encode(JSON.stringify(obj)), iter); }
  function openJSON(key, env) { return open(key, env).then(function (b) { return JSON.parse(new TextDecoder().decode(b)); }); }
  function newSalt() { return b64(rand(16)); }
  return { ITER: ITER, b64: b64, unb64: unb64, deriveKey: deriveKey, exportKey: exportKey, importKey: importKey,
    seal: seal, open: open, sealJSON: sealJSON, openJSON: openJSON, newSalt: newSalt };
})();
if (typeof module !== 'undefined') module.exports = EscalaCrypto;
