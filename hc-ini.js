(function (root) {
  "use strict";

  function norm(v) {
    return String(v == null ? "" : v).trim();
  }

  function esCheckOn(val) {
    const s = norm(val);
    if (!s) return false;
    const low = s.toLowerCase();
    if (low === "true" || low === "yes" || low === "on" || low === "si" || low === "sí") return true;
    if (s === "1" || s === "是" || s === "开" || s === "开启" || s === "✓" || s === "√" || s === "✔") return true;
    if (low === "false" || low === "no" || low === "off") return false;
    if (s === "0" || s === "否" || s === "关" || s === "关闭" || s === "×" || s === "✕") return false;
    return false;
  }

  function esCheckOff(val) {
    const s = norm(val);
    if (!s) return true;
    return !esCheckOn(s);
  }

  function estiloCheck(orig) {
    const s = norm(orig);
    if (s === "1" || s === "0") return "bit01";
    if (/^(true|false)$/i.test(s) || s === "") return "TRUEFALSE";
    if (s === "是" || s === "否") return "shi";
    return "TRUEFALSE";
  }

  function valorCheck(on, orig) {
    const estilo = estiloCheck(orig);
    if (estilo === "bit01") return on ? "1" : "0";
    if (estilo === "shi") return on ? "是" : "否";
    return on ? "TRUE" : "FALSE";
  }

  function parseMapaSettings(raw) {
    raw = raw == null ? "" : String(raw);
    const tokens = [];
    const re = /(\s*)(\|?)(\S+)/g;
    let m;
    while ((m = re.exec(raw))) {
      tokens.push({
        start: m.index,
        lead: m[1],
        pipe: m[2] === "|",
        bit: m[3],
        end: m.index + m[0].length
      });
    }
    const trailing = tokens.length ? raw.slice(tokens[tokens.length - 1].end) : raw;
    const groups = [];
    const index = [];
    let g = -1;
    let f = 0;
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (g < 0 || tok.pipe) {
        g++;
        f = 0;
        groups[g] = [];
        index[g] = [];
      }
      groups[g][f] = tok.bit;
      index[g][f] = i;
      f++;
    }
    return { raw: raw, tokens: tokens, groups: groups, index: index, trailing: trailing };
  }

  function serializeMapaSettings(parsed) {
    let s = "";
    for (let i = 0; i < parsed.tokens.length; i++) {
      const t = parsed.tokens[i];
      s += t.lead + (t.pipe ? "|" : "") + t.bit;
    }
    return s + (parsed.trailing || "");
  }

  function flagDe(parsed, grupo, flag) {
    const g = parsed.groups[grupo];
    if (!g || flag < 0 || flag >= g.length) return "0";
    return g[flag];
  }

  function flagOn(parsed, grupo, flag) {
    return flagDe(parsed, grupo, flag) === "1";
  }

  function conFlag(parsed, grupo, flag, on) {
    const bit = on ? "1" : "0";
    const ti = parsed.index[grupo] && parsed.index[grupo][flag];
    if (ti == null) return parsed.raw;
    if (parsed.tokens[ti].bit === bit) return parsed.raw;
    const tokens = parsed.tokens.map(function (t) {
      return { lead: t.lead, pipe: t.pipe, bit: t.bit };
    });
    tokens[ti].bit = bit;
    return serializeMapaSettings({ tokens: tokens, trailing: parsed.trailing });
  }

  function esClaveSecreta(clave) {
    return /账号|帐号|密码|邮箱|卡密|口令|注册账号|token|password|passwd|secret/i.test(String(clave || ""));
  }

  function claveEnMapa(mapa, tab, clave) {
    const tabs = (mapa && mapa.tabs) || [];
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].id !== tab) continue;
      const campos = tabs[i].campos || [];
      for (let j = 0; j < campos.length; j++) {
        if (campos[j].clave === clave) return true;
      }
    }
    if (mapa && mapa.mapasCombate && mapa.mapasCombate.tab === tab && mapa.mapasCombate.clave === clave) return true;
    return false;
  }

  function cobertura(mapa, campos) {
    const porTab = {};
    const lista = campos || [];
    for (let i = 0; i < lista.length; i++) {
      const c = lista[i];
      const tab = c.tab || "";
      if (!porTab[tab]) porTab[tab] = { total: 0, mapeados: 0, sinMapear: [] };
      porTab[tab].total++;
      if (claveEnMapa(mapa, tab, c.clave) || (tab === "TAB2" && c.clave === "地图设置信息")) {
        porTab[tab].mapeados++;
      } else {
        porTab[tab].sinMapear.push(c.clave);
      }
    }
    return porTab;
  }


  function numeroVentana(v) {
    if (v && typeof v === "object") return Number(v.n);
    return Number(v);
  }

  function listaLideres(ventanasTodas, ventanas, valorActual) {
    const src = (ventanasTodas && ventanasTodas.length) ? ventanasTodas : (ventanas || []);
    const out = [];
    const seen = {};
    for (let i = 0; i < src.length; i++) {
      const v = src[i] || {};
      const n = numeroVentana(v);
      if (!isFinite(n) || n === 0) continue;
      if (seen[n]) continue;
      seen[n] = true;
      out.push({ n: n, nombre: v.nombre || "", estado: v.estado || "" });
    }
    const actual = String(valorActual == null ? "" : valorActual).trim();
    const actualN = Number(actual);
    if (actual !== "" && actual !== "0" && isFinite(actualN) && !seen[actualN]) {
      out.push({ n: actualN, nombre: "", estado: "" });
      seen[actualN] = true;
    }
    out.sort(function (a, b) { return a.n - b.n; });
    return out;
  }


  function nPuntosDeMapa(cfg, idx, groupLen) {
    cfg = cfg || {};
    const flagP0 = (cfg.flagPunto0 != null) ? Number(cfg.flagPunto0) : 8;
    const rec = (cfg.nombres || [])[idx] || {};
    let n = rec.nPuntos != null ? Number(rec.nPuntos) : 0;
    if (!isFinite(n) || n < 0) n = 0;
    if (groupLen != null && isFinite(Number(groupLen))) {
      const max = Math.max(0, Number(groupLen) - flagP0);
      if (n > max) n = max;
    }
    return n;
  }

  function imagenDeMapa(cfg, idx) {
    const rec = ((cfg || {}).nombres || [])[idx] || {};
    const name = rec.imagen || "";
    if (!name) return "";
    return name.indexOf("/") >= 0 ? name : ("mapas/" + name);
  }

  function cambiosVacios(ini, cambios) {
    const c = cambios || {};
    return Object.keys(c).length === 0;
  }

  const api = {
    esCheckOn: esCheckOn,
    esCheckOff: esCheckOff,
    valorCheck: valorCheck,
    estiloCheck: estiloCheck,
    parseMapaSettings: parseMapaSettings,
    serializeMapaSettings: serializeMapaSettings,
    flagDe: flagDe,
    flagOn: flagOn,
    conFlag: conFlag,
    esClaveSecreta: esClaveSecreta,
    claveEnMapa: claveEnMapa,
    cobertura: cobertura,
    cambiosVacios: cambiosVacios,
    listaLideres: listaLideres,
    nPuntosDeMapa: nPuntosDeMapa,
    imagenDeMapa: imagenDeMapa
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HC_INI = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
