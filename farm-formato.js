/* Formato chileno de la columna farm de 红尘. No toca keepalive. */
(function (root) {
  "use strict";
  var CAMPOS = ["muc", "monedas_ligadas", "oro", "vales", "diamantes_ligados", "diamantes"];
  var ETIQUETAS = ["farm_muc", "farm_monedas_ligadas", "farm_oro", "farm_vales", "farm_diamantes_ligados", "farm_diamantes"];

  function limpia(texto) {
    return String(texto == null ? "" : texto).trim().replace(/,/g, "").replace(/，/g, "");
  }

  function parseWanYi(texto) {
    var s = limpia(texto);
    if (!s || s === "—" || s === "-" || s === "–" || s === "无" || s === "暂无") return null;
    var yi = 0, wan = 0, rest = s, m;
    m = rest.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*亿(.*)$/);
    if (m) {
      yi = parseFloat(m[1]);
      if (!isFinite(yi)) return null;
      rest = (m[2] || "").trim();
    }
    if (rest) {
      m = rest.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*万\s*$/);
      if (m) {
        wan = parseFloat(m[1]);
        if (!isFinite(wan)) return null;
        rest = "";
      } else if (/^\s*[+-]?(?:\d+(?:\.\d+)?|\.\d+)\s*$/.test(rest)) {
        wan = 0;
        var n = parseFloat(rest);
        if (!isFinite(n)) return null;
        if (yi) return yi * 100000000 + n;
        return n;
      } else if (yi && rest === "") {
        return yi * 100000000;
      } else {
        return null;
      }
    }
    if (yi || wan) return yi * 100000000 + wan * 10000;
    if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(s)) {
      var v = parseFloat(s);
      return isFinite(v) ? v : null;
    }
    return null;
  }

  function milesCl(entero) {
    var neg = Number(entero) < 0;
    var s = String(Math.abs(Math.round(Number(entero))));
    var out = "";
    while (s.length > 3) {
      out = "." + s.slice(-3) + out;
      s = s.slice(0, -3);
    }
    return (neg ? "-" : "") + s + out;
  }

  function decCl(n, maxDec) {
    var neg = n < 0;
    var x = Math.abs(n);
    var f = x.toFixed(maxDec);
    var parts = f.split(".");
    var ent = milesCl(parts[0]);
    var dec = parts[1] ? parts[1].replace(/0+$/, "") : "";
    return (neg ? "-" : "") + (dec ? ent + "," + dec : ent);
  }

  function formatNumeroCl(valor) {
    if (valor == null || valor === "") return "";
    var v = typeof valor === "number" ? valor : parseWanYi(valor);
    if (v == null || !isFinite(v)) return "";
    var a = Math.abs(v);
    if (a >= 1000000) return decCl(v / 1000000, 2) + " M";
    if (a >= 10000) return milesCl(v);
    if (a >= 1000) return decCl(v / 1000, 1) + " mil";
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
    return decCl(v, 1);
  }

  function parseFarmColumna(texto) {
    var crudo = String(texto == null ? "" : texto).trim();
    var out = { texto: crudo };
    CAMPOS.forEach(function (k) { out[k] = null; });
    if (!crudo) return out;
    var partes = crudo.split("/").map(function (p) { return p.trim(); });
    if (partes.length === 1 && (partes[0] === "0" || partes[0] === "0.0" || partes[0] === "0万")) {
      out.muc = 0;
      return out;
    }
    CAMPOS.forEach(function (k, i) {
      if (i < partes.length) out[k] = parseWanYi(partes[i]);
    });
    return out;
  }

  function farmValores(v) {
    if (!v) return parseFarmColumna("");
    if (v.farm && typeof v.farm === "object") {
      var d = { texto: v.farm.texto || v.farm_texto || "" };
      var falta = false;
      CAMPOS.forEach(function (k) {
        var n = v.farm[k];
        if (n == null || n === "") {
          d[k] = null;
          falta = true;
        } else {
          d[k] = typeof n === "number" ? n : parseWanYi(n);
        }
      });
      if (falta && d.texto) {
        var p = parseFarmColumna(d.texto);
        CAMPOS.forEach(function (k) {
          if (d[k] == null && p[k] != null) d[k] = p[k];
        });
      }
      return d;
    }
    return parseFarmColumna(v.farm_texto || v.texto || "");
  }

  function mucResetDe(v) {
    /* Devuelve {texto, valor} o null si la API no mandó el campo (keepalive < 1.6.69). */
    if (!v || typeof v !== "object") return null;
    var tiene = Object.prototype.hasOwnProperty.call(v, "muc_reset")
      || Object.prototype.hasOwnProperty.call(v, "muc_reset_texto");
    if (!tiene) return null;
    var texto = v.muc_reset_texto != null ? String(v.muc_reset_texto) : "";
    var valor = null;
    if (v.muc_reset != null && v.muc_reset !== "") {
      valor = typeof v.muc_reset === "number" ? v.muc_reset : parseWanYi(v.muc_reset);
    } else if (texto) {
      valor = parseWanYi(texto);
    }
    return { texto: texto, valor: valor };
  }

  root.FARM_FMT = {
    CAMPOS: CAMPOS,
    ETIQUETAS: ETIQUETAS,
    parseWanYi: parseWanYi,
    formatNumeroCl: formatNumeroCl,
    parseFarmColumna: parseFarmColumna,
    farmValores: farmValores,
    mucResetDe: mucResetDe,
    milesCl: milesCl
  };
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
