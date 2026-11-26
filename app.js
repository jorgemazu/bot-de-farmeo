(function () {
  const KEY_ENLACES = "bf-enlaces";
  const KEY_CUENTA = "bf-cuenta";
  const KEY_DISPOSITIVO = "bf-dispositivo";
  const KEY_IDIOMA = "bf-idioma";
  const state = {
    pantalla: "login",
    cuenta: "",
    servidores: [],
    servidor: null,
    ventanas: [],
    ventana: null,
    ini: null,
    mapa: null,
    secciones: null,
    tab: "TAB1",
    aviso: "",
    ocupado: false,
    apkNueva: false,
    instalando: false,
    codigoDraft: "",
    nuevo: { nombre: "", host: "" },
    cambios: {},
    hongchen: "",
    mapaSel: 0,
    ventanasTodas: [],
    liderAbierto: false,
    mapaFoto: false,
    mapaZoom: 1,
    coordPick: null,
    combos: null,
    idioma: "en",
    avisoTipo: "",
    pedirSalir: false,
    totalMuc: null,
    respaldos: [],
    pedirRestaurar: null,
    modalCopiar: null
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }


  function idiomaActual() {
    return state.idioma || "en";
  }

  function aplicarNombreServidor2() {
    (state.servidores || []).forEach(function (s) {
      const id = String(s.id || "").toLowerCase();
      const host = String(s.host || "").toLowerCase();
      if (id === "servidor2" || host === "servidor2.farmboss.stream") s.nombre = t("server2_name");
    });
  }

  function setIdioma(v) {
    if (v !== "en" && v !== "es" && v !== "zh") v = "en";
    state.idioma = v;
    try { localStorage.setItem(KEY_IDIOMA, v); } catch (e) {}
    try { document.documentElement.lang = (v === "zh") ? "zh-CN" : v; } catch (e) {}
    aplicarNombreServidor2();
  }

  function t(key, vars) {
    const pack = (window.UI_I18N && window.UI_I18N[key]) || {};
    const lang = idiomaActual();
    let s = pack[lang] || pack.en || pack.es || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = String(s).split("{" + k + "}").join(String(vars[k]));
      });
    }
    return s;
  }

  function pickLoc(obj, enK, esK, zhK) {
    if (!obj) return "";
    const lang = idiomaActual();
    if (lang === "en") return obj[enK] || obj[esK] || obj[zhK] || "";
    if (lang === "es") return obj[esK] || obj[enK] || obj[zhK] || "";
    return obj[zhK] || obj[esK] || obj[enK] || "";
  }

  function htmlIdioma() {
    const cur = idiomaActual();
    const opts = [
      { v: "en", l: "English" },
      { v: "es", l: "Español" },
      { v: "zh", l: "中文" }
    ].map(function (o) {
      return '<option value="' + o.v + '"' + (o.v === cur ? " selected" : "") + ">" + o.l + "</option>";
    }).join("");
    return '<label class="idioma"><span class="sr">' + esc(t("idioma")) + "</span>" +
      '<select id="idioma" aria-label="' + esc(t("idioma")) + '">' + opts + "</select></label>";
  }

  function wireIdioma() {
    const sel = document.getElementById("idioma");
    if (!sel) return;
    sel.onchange = function () { setIdioma(sel.value); render(); };
  }


  function cuentaOk(v) {
    return /^[1-9][0-9]{0,11}$/.test(String(v || "").trim());
  }

  function dispositivoId() {
    let id = "";
    try { id = localStorage.getItem(KEY_DISPOSITIVO) || ""; } catch (e) { id = ""; }
    if (!id) {
      id = "d-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { localStorage.setItem(KEY_DISPOSITIVO, id); } catch (e) {}
    }
    return id;
  }

  function loadServers() {
    let lista = [];
    try { lista = JSON.parse(localStorage.getItem(KEY_ENLACES) || "[]") || []; } catch (e) { lista = []; }
    if (!Array.isArray(lista)) lista = [];
    lista = lista.map(function (s) {
      return {
        id: s.id,
        nombre: s.nombre,
        host: s.host,
        token: s.token || "",
        cuenta: s.cuenta || "",
        dispositivo: s.dispositivo || ""
      };
    });
    const tieneS2 = lista.some(function (s) { return String(s.id || s.host || "").toLowerCase().indexOf("servidor2") >= 0; });
    if (!tieneS2) {
      lista.unshift({ id: "servidor2", nombre: t("server2_name"), host: "servidor2.farmboss.stream", token: "", cuenta: "", dispositivo: "" });
    }
    state.servidores = lista;
    aplicarNombreServidor2();
    saveServers();
    try { state.cuenta = localStorage.getItem(KEY_CUENTA) || ""; } catch (e) { state.cuenta = ""; }
  }

  function saveServers() {
    const copia = state.servidores.map(function (s) {
      return { id: s.id, nombre: s.nombre, host: s.host, token: s.token || "", cuenta: s.cuenta || "", dispositivo: s.dispositivo || "" };
    });
    try { localStorage.setItem(KEY_ENLACES, JSON.stringify(copia)); } catch (e) {}
  }

  function guardarCuenta(n) {
    state.cuenta = n;
    try { localStorage.setItem(KEY_CUENTA, n); } catch (e) {}
  }

  function enlazado(srv) {
    return !!(srv && srv.token && srv.cuenta && srv.cuenta === state.cuenta);
  }

  function baseUrl(srv) {
    if (typeof window.BF_API_BASE === "string" && window.BF_API_BASE.trim()) {
      return String(window.BF_API_BASE).trim().replace(/\/$/, "");
    }
    let h = String((srv && srv.host) || "").trim();
    h = h.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    return "https://" + h;
  }

  function mensajeFallo(paso, e) {
    const msg = (e && e.message) || String(e || "error");
    const name = (e && e.name) || "";
    if (name === "AbortError" || /aborted|agotó el tiempo|timed out/i.test(msg)) {
      return t("timeout_wait_sec", { paso: paso, s: "?" });
    }
    if (/Failed to fetch|NetworkError|Load failed|Network request failed/i.test(msg)) {
      return t("net_fail", { paso: paso, msg: msg });
    }
    if (msg.indexOf(paso + ":") === 0) return msg;
    return paso + ": " + msg;
  }

  function esperarConTope(promesa, ms, paso) {
    return new Promise(function (resolve, reject) {
      let listo = false;
      const tope = setTimeout(function () {
        if (listo) return;
        listo = true;
        reject(new Error(t("timeout_wait_sec", { paso: paso, s: Math.round(ms / 1000) })));
      }, ms);
      promesa.then(function (v) {
        if (listo) return;
        listo = true;
        clearTimeout(tope);
        resolve(v);
      }, function (e) {
        if (listo) return;
        listo = true;
        clearTimeout(tope);
        reject(e);
      });
    });
  }

  async function api(srv, path, opts) {
    const tok = String((srv && srv.token) || "").trim();
    if (!tok) throw new Error(t("not_linked"));
    const ms = (opts && opts.timeout) || 30000;
    const ctrl = new AbortController();
    const tope = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, ms);
    try {
      let res;
      try {
        res = await esperarConTope(fetch(baseUrl(srv) + path, {
          method: (opts && opts.method) || "GET",
          cache: "no-store",
          signal: ctrl.signal,
          headers: Object.assign({
            Authorization: "Bearer " + tok,
            Accept: "application/json"
          }, (opts && opts.body) ? { "Content-Type": "application/json; charset=utf-8" } : {}),
          body: opts && opts.body ? JSON.stringify(opts.body) : undefined
        }), ms, t("net", { path: path }));
      } catch (e) {
        throw new Error(mensajeFallo(t("net", { path: path }), e));
      }
      let text = "";
      try {
        text = await esperarConTope(res.text(), ms, t("net", { path: path }));
      } catch (e) {
        throw new Error(mensajeFallo(t("net", { path: path }), e));
      }
      if (res.status === 401) throw new Error(t("link_rejected"));
      if (res.status === 403) {
        var msg403 = t("link_rejected");
        try {
          var j403 = JSON.parse(text);
          if (j403 && j403.mensaje) msg403 = j403.mensaje;
        } catch (e403) {}
        throw new Error(msg403);
      }
      if (!res.ok) throw new Error(t("http_err", { status: res.status, path: path }) + (text ? (": " + String(text).slice(0, 160)) : ""));
      try { return JSON.parse(text); } catch (e) { throw new Error(t("bad_json", { path: path, n: text.length })); }
    } finally {
      clearTimeout(tope);
    }
  }

  function cargarMapa() {
    if (typeof window.EDITOR_SECCIONES === "object" && window.EDITOR_SECCIONES) {
      state.secciones = window.EDITOR_SECCIONES;
    }
    if (typeof window.EDITOR_COMBOS === "object" && window.EDITOR_COMBOS) {
      state.combos = window.EDITOR_COMBOS;
    }
    if (state.mapa) return state.mapa;
    if (typeof window.EDITOR_MAPA === "object" && window.EDITOR_MAPA) {
      state.mapa = window.EDITOR_MAPA;
      return state.mapa;
    }
    throw new Error(t("map_missing"));
  }

  function secretoSolicitud() {
    const a = new Uint8Array(24);
    crypto.getRandomValues(a);
    let s = "";
    for (let i = 0; i < a.length; i++) s += "abcdefghijklmnopqrstuvwxyz0123456789"[a[i] % 36];
    return "s-" + s;
  }

  async function postEnlace(srv, path, body, timeoutMs) {
    const ctrl = new AbortController();
    const tope = setTimeout(function () { ctrl.abort(); }, timeoutMs || 30000);
    try {
      const res = await fetch(baseUrl(srv) + path, {
        method: "POST",
        cache: "no-store",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json; charset=utf-8", Accept: "application/json" },
        body: JSON.stringify(body)
      });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (e) { data = null; }
      return { res: res, data: data, text: text };
    } finally {
      clearTimeout(tope);
    }
  }

  async function solicitarEnlace(srv, cuenta) {
    const secreto = secretoSolicitud();
    const r = await postEnlace(srv, "/v1/enlace/solicitar", {
      cuenta: cuenta,
      dispositivo: dispositivoId(),
      solicitud: secreto
    }, 30000);
    const data = r.data;
    if (!data || !data.ok || !data.codigo) {
      throw new Error((data && data.mensaje) || t("wait_link_fail"));
    }
    return { secreto: secreto, codigo: data.codigo, expira: data.expira_segundos || 600 };
  }

  async function esperarAceptacion(srv, cuenta, secreto, onTick) {
    const limite = Date.now() + 10 * 60 * 1000;
    while (Date.now() < limite) {
      if (onTick && onTick() === false) throw new Error("cancelado");
      await new Promise(function (ok) { setTimeout(ok, 2000); });
      if (onTick && onTick() === false) throw new Error("cancelado");
      const r = await postEnlace(srv, "/v1/enlace/estado", { solicitud: secreto }, 15000);
      const data = r.data;
      if (data && data.estado === "rechazada") throw new Error("En keepalive rechazaron esta solicitud.");
      if (data && (data.estado === "caducada" || data.ok === false) && !data.token) {
        if (data.estado === "pendiente") continue;
        throw new Error((data && data.mensaje) || "La solicitud caducó. Vuelve a pedir el enlace.");
      }
      if (data && data.ok && data.token) {
        srv.token = data.token;
        srv.cuenta = data.cuenta || cuenta;
        srv.dispositivo = data.dispositivo || dispositivoId();
        saveServers();
        return srv;
      }
    }
    throw new Error(t("timeout_retry"));
  }

  function bannerApk() {
    if (window.PWA || !window.Nativo) return "";
    if (!state.apkNueva) return "";
    return '<p class="aviso">' + esc(t("apk_update")) + '</p><button class="gold" id="instalarApk" type="button">' +
      (state.instalando ? t("downloading") : t("update")) + "</button>";
  }

  function hayCambiosPendientes() {
    return Object.keys(state.cambios || {}).length > 0;
  }

  function limpiarOcupado() {
    state.ocupado = false;
  }

  function cerrarAviso() {
    state.aviso = "";
    state.avisoTipo = "";
    render();
  }

  function descartarCambiosPendientes() {
    state.cambios = {};
    state.aviso = "";
    state.avisoTipo = "";
    state.pedirSalir = false;
    limpiarOcupado();
    render();
  }

  function avisoHtml() {
    if (!state.aviso) return "";
    const kind = state.avisoTipo || "info";
    const cls = (kind === "error") ? "aviso aviso-error" : (kind === "ok" ? "aviso aviso-ok" : "aviso");
    const cerrar = (kind === "error")
      ? ('<button type="button" class="aviso-cerrar" id="cerrarAviso" aria-label="' + esc(t("dismiss_aviso")) + '">×</button>')
      : "";
    return '<div class="' + cls + '" role="alert" id="avisoBanner">' + cerrar +
      '<span class="aviso-texto">' + esc(state.aviso) + "</span></div>";
  }

  function modalSalirHtml() {
    if (!state.pedirSalir) return "";
    return '<div class="modal-salir" id="modalSalir" role="dialog" aria-modal="true">' +
      '<div class="modal-salir-caja"><p>' + esc(t("unsaved_leave")) + "</p>" +
      '<button class="gold" type="button" id="salirSinGuardar">' + esc(t("leave_without_saving")) + "</button>" +
      '<button class="line" type="button" id="quedarme">' + esc(t("stay")) + "</button>" +
      "</div></div>";
  }

  function wireAviso() {
    const banner = document.getElementById("avisoBanner");
    const btn = document.getElementById("cerrarAviso");
    function cerrar(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      cerrarAviso();
    }
    if (btn) btn.onclick = cerrar;
    if (banner && state.avisoTipo === "error") {
      banner.onclick = function (e) {
        if (e.target && e.target.id === "cerrarAviso") return;
        cerrar(e);
      };
    }
  }

  function salirDelEditor(forzar) {
    if (!forzar && hayCambiosPendientes()) {
      state.pedirSalir = true;
      render();
      return false;
    }
    state.pantalla = "ventanas";
    state.aviso = "";
    state.avisoTipo = "";
    state.cambios = {};
    state.pedirSalir = false;
    state.liderAbierto = false;
    state.mapaFoto = false;
    state.coordPick = null;
    limpiarOcupado();
    render();
    return true;
  }

  function atrasSistema() {
    if (state.pedirSalir) {
      state.pedirSalir = false;
      render();
      return true;
    }
    if (state.coordPick) {
      state.coordPick = null;
      render();
      return true;
    }
    if (state.pantalla === "editor") {
      salirDelEditor(false);
      return true;
    }
    if (state.pantalla === "ventanas" || state.pantalla === "emparejar" || state.pantalla === "agregar") {
      if (state.pantalla === "emparejar") {
        state.enlaceCancel = true;
        state.esperandoEnlace = false;
        state.codigoVerif = "";
      }
      state.pantalla = "servidores";
      state.aviso = "";
      state.avisoTipo = "";
      render();
      return true;
    }
    return false;
  }

  window.__atras = function () {
    try { return atrasSistema(); } catch (e) { return false; }
  };

  function etiquetaEstado(est) {
    const map = { corriendo: t("st_running"), detenida: t("st_stopped"), cerrado: t("st_closed"), ambigua: t("st_ambiguous"), no_encontrada: t("st_missing") };
    return map[est] || est || "";
  }

  function renderLogin() {
    document.getElementById("app").innerHTML =
      '<main><div class="head-top"><p class="kicker">' + esc(t("kicker")) + "</p>" + htmlIdioma() + "</div><h1>" +
      esc(t("app_name")) + "</h1>" + bannerApk() +
      '<p class="sub">' + esc(t("enter_account")) + "</p>" +
      avisoHtml() +
      '<form id="login"><input id="num" inputmode="numeric" maxlength="12" placeholder="' +
      esc(t("example_1")) + '" value="' +
      esc(state.cuenta) + '" /><button class="gold" type="submit">' + esc(t("sign_in")) + "</button></form>" +
      (state.cuenta ? '<button class="line" id="cambiar" type="button">' + esc(t("change_account")) + "</button>" : "") +
      "</main>";
    document.getElementById("login").onsubmit = function (e) {
      e.preventDefault();
      const n = document.getElementById("num").value.replace(/\D/g, "").slice(0, 12);
      if (!cuentaOk(n)) { state.aviso = t("invalid_account"); render(); return; }
      guardarCuenta(n);
      state.aviso = "";
      state.pantalla = "servidores";
      render();
    };
    const c = document.getElementById("cambiar");
    if (c) c.onclick = function () {
      guardarCuenta("");
      state.aviso = "";
      render();
    };
  }

  function renderServidores() {
    const cards = state.servidores.map(function (s) {
      const ok = enlazado(s);
      return '<button class="card" type="button" data-srv="' + esc(s.id) + '"><div class="name"><strong>' +
        esc(s.nombre || s.id) + "</strong><span>" + esc(s.host) + "</span></div><p class=\"fecha\">" +
        (ok ? t("linked_account", { cuenta: s.cuenta }) : t("need_pair")) + "</p></button>";
    }).join("");
    document.getElementById("app").innerHTML =
      '<header><div class="head-top"><p class="kicker">' + esc(t("kicker")) + "</p>" + htmlIdioma() + "</div><h1>" +
      esc(t("app_name")) + "</h1>" + bannerApk() + avisoHtml() +
      '<p class="sub">' + esc(t("account_n", { n: state.cuenta })) + "</p></header>" +
      '<section class="pad"><h2>' + esc(t("servers")) + "</h2>" + (cards || ('<p class="sub">' + esc(t("no_servers")) + "</p>")) +
      '<button class="line" id="agregar" type="button">' + esc(t("add_server")) + "</button>" +
      '<button class="line" id="salir" type="button">' + esc(t("change_account")) + "</button></section>";
    document.querySelectorAll("[data-srv]").forEach(function (btn) {
      btn.onclick = function () { abrirServidor(btn.getAttribute("data-srv")); };
    });
    document.getElementById("agregar").onclick = function () { state.pantalla = "agregar"; state.aviso = ""; render(); };
    document.getElementById("salir").onclick = function () { state.pantalla = "login"; state.aviso = ""; render(); };
  }

  function renderAgregar() {
    const n = state.nuevo;
    document.getElementById("app").innerHTML =
      '<header><div class="head-top"><button class="back" id="volver" type="button">' + esc(t("back")) + "</button>" + htmlIdioma() + "</div><h1>" + esc(t("add_server")) + "</h1></header>" +
      '<section class="pad"><p class="sub">' + esc(t("add_server_help")) + "</p>" +
      '<p class="lbl">' + esc(t("name")) + '</p><input id="nom" type="text" value="' + esc(n.nombre) + '" />' +
      '<p class="lbl">' + esc(t("host")) + '</p><input id="host" type="text" value="' + esc(n.host) + '" placeholder="servidor3.farmboss.stream" />' +
      avisoHtml() +
      '<button class="gold" id="ok" type="button">' + esc(t("save")) + "</button></section>";
    document.getElementById("volver").onclick = function () { state.pantalla = "servidores"; state.aviso = ""; render(); };
    document.getElementById("ok").onclick = function () {
      const nombre = document.getElementById("nom").value.trim();
      const host = document.getElementById("host").value.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
      if (!host) { state.aviso = t("missing_host"); state.nuevo = { nombre: nombre, host: host }; render(); return; }
      const id = host.split(".")[0].toLowerCase();
      if (id === "servidor1" || id === "s1") {
        state.aviso = t("s1_blocked");
        state.nuevo = { nombre: nombre, host: host }; render(); return;
      }
      const ya = state.servidores.find(function (s) { return String(s.id).toLowerCase() === id || String(s.host).toLowerCase() === host.toLowerCase(); });
      if (ya) { ya.host = host; ya.nombre = nombre || ya.nombre; }
      else state.servidores.push({ id: id, nombre: nombre || host, host: host, token: "", cuenta: "", dispositivo: "" });
      saveServers();
      state.pantalla = "servidores";
      state.aviso = t("server_saved");
      state.nuevo = { nombre: "", host: "" };
      render();
    };
  }


  function farmFmt() {
    return (typeof window !== "undefined" && window.FARM_FMT) ? window.FARM_FMT : null;
  }

  function farmTexto(v) {
    if (!v) return "";
    if (v.farm && v.farm.texto) return String(v.farm.texto);
    if (v.farm_texto) return String(v.farm_texto);
    return "";
  }

  function farmValoresDe(v) {
    const F = farmFmt();
    return F ? F.farmValores(v) : { texto: farmTexto(v) };
  }

  function formatNumeroCl(valor) {
    const F = farmFmt();
    return F ? F.formatNumeroCl(valor) : String(valor == null ? "" : valor);
  }

  function htmlMucReset(v) {
    const F = farmFmt();
    if (!F || typeof F.mucResetDe !== "function") return "";
    const mr = F.mucResetDe(v);
    if (!mr) return "";
    let txt = "";
    if (mr.valor != null && isFinite(mr.valor)) {
      txt = F.formatNumeroCl(mr.valor);
    } else if (mr.texto) {
      txt = mr.texto;
    }
    if (txt === "" && !(mr.valor === 0)) return "";
    if (mr.valor === 0) txt = F.formatNumeroCl(0);
    return '<span class="muc-reset"><span class="fl">' + esc(t("muc_reset")) + "</span> " + esc(txt) + "</span>";
  }

  function htmlFarmLinea(v) {
    const F = farmFmt();
    const mucHtml = htmlMucReset(v);
    if (!F) {
      const raw = farmTexto(v);
      const farm = raw ? ('<span class="farm">' + esc(raw) + "</span>") : "";
      return mucHtml + farm;
    }
    const d = F.farmValores(v);
    const partes = [];
    F.CAMPOS.forEach(function (k, i) {
      const num = d[k];
      if (num == null) return;
      const txt = F.formatNumeroCl(num);
      if (txt === "") return;
      partes.push('<span class="farm-item"><span class="fl">' + esc(t(F.ETIQUETAS[i])) + "</span> " + esc(txt) + "</span>");
    });
    const farm = partes.length ? ('<span class="farm">' + partes.join("") + "</span>") : "";
    return mucHtml + farm;
  }

  function htmlFarmEncabezado() {
    const F = farmFmt();
    const keys = F ? F.CAMPOS.map(function (k) { return "farm_h_" + k; }) : [];
    const cols = keys.map(function (k) { return "<span>" + esc(t(k)) + "</span>"; }).join("");
    return '<div class="farm-encabezado"><p class="tit">' + esc(t("farm_encabezado")) + "</p>" +
      '<p class="cols">' + cols + "</p></div>";
  }

  function totalMucTexto(tm) {
    tm = tm || state.totalMuc || {};
    const F = farmFmt();
    if (F) {
      var n = tm.muc;
      if (n == null || n === "") n = F.parseWanYi(tm.texto);
      const fmt = F.formatNumeroCl(n);
      if (fmt) return fmt;
    }
    if (tm.texto) return String(tm.texto);
    if (tm.muc != null && tm.muc !== "") return String(tm.muc);
    return "";
  }

  function etiquetaOrigen(origen) {
    const o = String(origen || "");
    if (o === "app") return t("origin_app");
    if (o === "hongchen") return t("origin_hongchen");
    if (o === "restaurar") return t("origin_restaurar");
    return t("origin_desconocido");
  }

  async function cargarRespaldos(n) {
    const srv = state.servidor;
    if (!srv || n == null || n === "") { state.respaldos = []; return; }
    try {
      const data = await api(srv, "/v1/ini/respaldos?n=" + encodeURIComponent(n));
      if (data && data.ok && Array.isArray(data.respaldos)) state.respaldos = data.respaldos;
      else state.respaldos = [];
    } catch (e) {
      state.respaldos = [];
    }
  }

  function modalRestaurarHtml() {
    const item = state.pedirRestaurar;
    if (!item) return "";
    const cuenta = item.cuenta ? t("backup_account", { cuenta: item.cuenta }) : t("backup_account", { cuenta: "—" });
    return '<div class="modal-salir" id="modalRestaurar" role="dialog" aria-modal="true">' +
      '<div class="modal-salir-caja"><p>' + esc(t("confirm_restore", {
        fecha: item.fecha_chile || item.archivo || "",
        cuenta: item.cuenta || "—",
        origen: etiquetaOrigen(item.origen)
      })) + "</p>" +
      '<button class="gold" id="confirmarRestaurar" type="button">' + esc(t("recover")) + "</button>" +
      '<button class="line" id="cancelarRestaurar" type="button">' + esc(t("cancel_restore")) + "</button></div></div>";
  }

  function htmlRespaldos() {
    const items = state.respaldos || [];
    let lista;
    if (state.ocupado === "cargar") lista = '<p class="sub">' + esc(t("loading_backups")) + "</p>";
    else if (!items.length) lista = '<p class="sub">' + esc(t("no_backups")) + "</p>";
    else lista = items.map(function (e) {
      const cuenta = e.cuenta ? t("backup_account", { cuenta: e.cuenta }) : "";
      const partes = [e.fecha_chile || "", etiquetaOrigen(e.origen), cuenta].filter(Boolean).join(" · ");
      const det = [];
      if (e.hash) det.push(t("backup_hash", { hash: String(e.hash).slice(0, 12) + "…" }));
      if (e.claves && e.claves.length) det.push(t("backup_keys", { keys: e.claves.join(", ") }));
      const id = e.id || e.archivo || e.hash || "";
      const busy = !!state.ocupado;
      return '<div class="respaldo"><p class="meta">' + esc(partes) + "</p>" +
        (det.length ? ('<p class="detalle">' + esc(det.join(" · ")) + "</p>") : "") +
        '<button class="line mini" type="button" data-restaurar="' + esc(id) + '"' + (busy ? " disabled" : "") + ">" +
        esc(state.ocupado === "restaurar" ? t("restoring") : t("recover")) + "</button></div>";
    }).join("");
    return '<section class="respaldos"><h2>' + esc(t("backups")) + "</h2>" + lista + "</section>";
  }

  function aplicarVentanas(data) {
    state.ventanas = (data && data.ventanas) || [];
    if (data && data.ventanas_todas) state.ventanasTodas = data.ventanas_todas;
    else if (!(data && Object.prototype.hasOwnProperty.call(data, "ventanas_todas"))) state.ventanasTodas = [];
    else state.ventanasTodas = data.ventanas_todas || [];
    if (data && data.hongchen) state.hongchen = data.hongchen;
    if (data && Object.prototype.hasOwnProperty.call(data, "total_muc")) state.totalMuc = data.total_muc;
  }

  async function abrirServidor(id) {
    const srv = state.servidores.find(function (s) { return s.id === id; });
    if (!srv) return;
    state.servidor = srv;
    state.aviso = "";
    if (!enlazado(srv)) {
      state.pantalla = "emparejar";
      state.codigoDraft = "";
      render();
      return;
    }
    state.ocupado = "ventanas";
    state.pantalla = "ventanas";
    render();
    try {
      const data = await api(srv, "/v1/ventanas");
      aplicarVentanas(data);
      if (data.ok === false) throw new Error(data.mensaje || t("cannot_read_windows"));
      if (state.hongchen === "cerrado") state.aviso = t("hongchen_closed");
    } catch (e) {
      state.aviso = e.message || String(e);
      state.ventanas = [];
    }
    state.ocupado = false;
    render();
  }

    function renderEmparejar() {
    const s = state.servidor || {};
    const codigo = state.codigoVerif || "";
    const esperando = !!state.esperandoEnlace;
    document.getElementById("app").innerHTML =
      '<header><div class="head-top"><button class="back" id="volver" type="button">' + esc(t("back")) + "</button>" + htmlIdioma() +
      "</div><h1>" + esc(s.nombre || t("server")) + "</h1>" +
      '<p class="sub">' + esc(s.host) + "</p>" + bannerApk() + "</header>" +
      '<section class="pad"><p class="sub">' + t("pair_help") + "</p>" +
      '<p class="lbl">' + esc(t("account")) + '</p><p class="sub">' + esc(state.cuenta) + "</p>" +
      (codigo ? ('<p class="lbl">' + esc(t("verify_code")) + '</p><p class="big">' + esc(codigo) + "</p>") : "") +
      avisoHtml() +
      (esperando && codigo ? ('<p class="sub">' + esc(t("waiting_accept")) + "</p>") : "") +
      (esperando && !codigo ? ('<p class="sub">' + esc(t("sending_request")) + "</p>") : "") +
      (esperando ? "" : ('<button class="gold" id="ok" type="button">' + esc(t("request_link")) + "</button>")) +
      "</section>";
    document.getElementById("volver").onclick = function () {
      state.enlaceCancel = true;
      state.esperandoEnlace = false;
      state.codigoVerif = "";
      state.pantalla = "servidores";
      state.aviso = "";
      render();
    };
    const ok = document.getElementById("ok");
    if (ok) ok.onclick = function () {
      state.enlaceCancel = false;
      state.esperandoEnlace = true;
      state.aviso = "";
      state.codigoVerif = "";
      render();
      solicitarEnlace(s, state.cuenta).then(function (info) {
        if (state.enlaceCancel) throw new Error("cancelado");
        state.codigoVerif = info.codigo;
        render();
        return esperarAceptacion(s, state.cuenta, info.secreto, function () { return !state.enlaceCancel; });
      }).then(function () {
        state.esperandoEnlace = false;
        state.codigoVerif = "";
        abrirServidor(s.id);
      }).catch(function (e) {
        if (String(e && e.message) === "cancelado") return;
        state.esperandoEnlace = false;
        state.codigoVerif = "";
        let msg = e.message || String(e);
        if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
          msg = t("pair_net_hint");
        }
        state.aviso = msg;
        state.pantalla = "emparejar";
        render();
      });
    };
  }

  
function renderVentanas() {
    const s = state.servidor || {};
    const cards = (state.ventanas || []).map(function (v) {
      const titulo = v.nombre ? (v.n + " — " + v.nombre) : String(v.n);
      const est = etiquetaEstado(v.estado);
      const farmHtml = htmlFarmLinea(v);
      const liderNom = nombreLiderFicha(v);
      const liderHtml = liderNom ? ('<p class="lider-linea">' + esc(t("leader_line", { nombre: liderNom })) + "</p>") : "";
      return '<div class="card" data-n="' + esc(v.n) + '"><button class="hit" type="button" data-abrir-ventana="' +
        esc(v.n) + '"><div class="name"><strong>' +
        esc(titulo) + "</strong>" + farmHtml + '<span class="estado ' + esc(v.estado) + '">' + esc(est) +
        "</span></div>" + liderHtml + "<p class=\"fecha\">" + (v.existe_ini ? t("ini_ready") : t("no_ini")) +
        '</p></button><div class="card-acts">' +
        '<button class="line" type="button" data-acc="iniciar" data-acc-n="' + esc(v.n) + '">' + esc(t("win_start")) + "</button>" +
        '<button class="danger" type="button" data-acc="detener" data-acc-n="' + esc(v.n) + '">' + esc(t("win_stop")) + "</button>" +
        '<button class="line" type="button" data-acc="reiniciar" data-acc-n="' + esc(v.n) + '">' + esc(t("win_restart_tasks")) + "</button>" +
        "</div></div>";
    }).join("");
    const muc = totalMucTexto();
    const mucHtml = muc ? ('<p class="total-muc">' + esc(t("total_muc", { texto: muc })) + "</p>") : "";
    document.getElementById("app").innerHTML =
      '<header><div class="head-top"><button class="back" id="volver" type="button">' + esc(t("back")) + "</button>" + htmlIdioma() +
      '</div><div class="head-title"><h1>' + esc(s.nombre || t("server")) + "</h1>" + mucHtml + "</div>" +
      bannerApk() + avisoHtml() +
      (state.ocupado ? ('<p class="sub">' + esc(t("reading_windows")) + "</p>") : "") + "</header>" +
      '<section class="pad">' + htmlFarmEncabezado() + (cards || ('<p class="sub">' + esc(t("no_windows")) + "</p>")) +
      '<button class="line" id="recargar" type="button">' + esc(t("refresh_list")) + "</button>" +
      '<button class="line" id="reparear" type="button">' + esc(t("pair_again")) + "</button></section>";
    document.getElementById("volver").onclick = function () { state.pantalla = "servidores"; state.aviso = ""; render(); };
    document.getElementById("recargar").onclick = function () { abrirServidor(s.id); };
    document.getElementById("reparear").onclick = function () {
      s.token = "";
      s.cuenta = "";
      saveServers();
      state.pantalla = "emparejar";
      state.aviso = "";
      render();
    };
    document.querySelectorAll("[data-abrir-ventana]").forEach(function (btn) {
      btn.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        abrirVentana(Number(btn.getAttribute("data-abrir-ventana")));
      };
    });
    document.querySelectorAll("[data-acc]").forEach(function (btn) {
      btn.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        accionarVentana(btn.getAttribute("data-acc"), Number(btn.getAttribute("data-acc-n")));
      };
    });
  }

  function nombreLiderFicha(v) {
    const todas = (state.ventanasTodas && state.ventanasTodas.length) ? state.ventanasTodas : (state.ventanas || []);
    const union = todas.concat(state.ventanas || []);
    if (window.LIDER_FICHA && typeof window.LIDER_FICHA.resolverLider === "function") {
      return window.LIDER_FICHA.resolverLider(v, union);
    }
    return (v && v.lider_nombre) ? String(v.lider_nombre).trim() : null;
  }

  async function accionarVentana(acc, n) {
    const srv = state.servidor;
    const rutas = { iniciar: "/v1/ventana/iniciar", detener: "/v1/ventana/detener", reiniciar: "/v1/ventana/reiniciar-tareas" };
    const path = rutas[acc];
    if (!path || !srv || !n) return;
    state.aviso = "";
    try {
      const data = await api(srv, path + "?n=" + encodeURIComponent(n), { method: "POST", body: { n: n }, timeout: 30000 });
      if (data && data.ok === false) throw new Error(data.mensaje || t("action_failed", { msg: "" }));
      try {
        const vs = await api(srv, "/v1/ventanas");
        aplicarVentanas(vs);
      } catch (e2) {}
      if (data && data.mensaje) state.aviso = data.mensaje;
    } catch (e) {
      state.aviso = e.message || String(e);
    }
    if (state.pantalla === "editor") return;
    state.pantalla = "ventanas";
    render();
  }

  async function abrirVentana(n) {
    const srv = state.servidor;
    state.ventana = (state.ventanas || []).find((v) => Number(v.n) === Number(n)) || { n: n };
    state.cambios = {};
    state.ini = null;
    state.respaldos = [];
    state.pedirRestaurar = null;
    state.ocupado = "cargar";
    state.pantalla = "editor";
    state.aviso = "";
    render();
    try {
      try {
        cargarMapa();
      } catch (eMapa) {
        throw new Error(eMapa.message || t("map_load_fail"));
      }
      const data = await api(srv, "/v1/ini?n=" + encodeURIComponent(n));
      if (data.ok === false) throw new Error("Ini: " + (data.mensaje || t("cannot_read_ini")));
      state.ini = data;
      await cargarRespaldos(n);
    } catch (e) {
      state.aviso = e.message || String(e);
      state.ini = null;
    }
    state.ocupado = false;
    try { render(); } catch (eRender) {
      state.aviso = (state.aviso ? state.aviso + " " : "") + t("cannot_draw", { msg: (eRender.message || eRender) });
      try { render(); } catch (e2) {}
    }
  }

  function valorDe(tab, clave) {
    const k = tab + "\n" + clave;
    if (Object.prototype.hasOwnProperty.call(state.cambios, k)) return state.cambios[k];
    const c = (state.ini && state.ini.campos || []).find((x) => x.tab === tab && x.clave === clave);
    return c ? c.valor : "";
  }

  function valorOrig(tab, clave) {
    const c = (state.ini && state.ini.campos || []).find((x) => x.tab === tab && x.clave === clave);
    return c ? c.valor : "";
  }

  function setValor(tab, clave, valor) {
    const orig = valorOrig(tab, clave);
    const k = tab + "\n" + clave;
    if (String(orig) === String(valor)) delete state.cambios[k];
    else state.cambios[k] = valor;
  }

  function hayCampo(tab, clave) {
    return (state.ini && state.ini.campos || []).some((x) => x.tab === tab && x.clave === clave);
  }

  function H() { return window.HC_INI || {}; }

  function checkOn(val) {
    return !!(H().esCheckOn && H().esCheckOn(val));
  }

  function checkValor(on, tab, clave) {
    const orig = valorOrig(tab, clave);
    return H().valorCheck ? H().valorCheck(on, orig) : (on ? "TRUE" : "FALSE");
  }

  function blobMapas() {
    return valorDe("TAB2", "地图设置信息");
  }

  function setBlobMapas(nuevoBlob) {
    setValor("TAB2", "地图设置信息", nuevoBlob);
  }

  function parsedMapas() {
    if (!H().parseMapaSettings) return { raw: "", groups: [], tokens: [], index: [], trailing: "" };
    return H().parseMapaSettings(blobMapas());
  }

  function cfgMapas() {
    return (state.mapa && state.mapa.mapasCombate) || { nombres: [], lineas: 7, flagMapa: 0, flagLinea0: 1, flagPunto0: 8, clave: "地图设置信息", tab: "TAB2" };
  }

  function nombreMapa(i) {
    const n = (cfgMapas().nombres || [])[i];
    const nom = pickLoc(n, "en", "es", "zh");
    if (nom) return nom;
    return t("map_fallback", { n: i + 1 });
  }

  function actualizarBotonGuardar() {
    const b = document.getElementById("guardar");
    if (!b || state.ocupado) return;
    const n = Object.keys(state.cambios).length;
    b.disabled = !n;
    b.textContent = n ? t("save_n", { n: n }) : t("no_changes");
  }


  function catalogo() {
    return state.combos || window.EDITOR_COMBOS || {};
  }

  function defCombo(clave) {
    const c = catalogo().combos || {};
    return c[clave] || null;
  }

  function nombreOpcion(opt) {
    if (!opt) return "";
    const nom = pickLoc(opt, "en", "es", "zh");
    return String(opt.v) + (nom ? (" " + nom) : "");
  }

  function prefijoZona(tab) {
    const port = String(valorDe(tab || "TAB1", "游戏端口") == null ? "" : valorDe(tab || "TAB1", "游戏端口")).trim();
    const pdef = defCombo("游戏端口");
    const found = (pdef && pdef.opciones || []).find(function (o) { return String(o.v) === port; });
    return (found && found.alias) || "";
  }

  function opcionesDe(clave, tab) {
    const def = defCombo(clave) || {};
    if (def.prefixFromPort) {
      const prefix = prefijoZona(tab) || "AM-S";
      const max = def.max != null ? def.max : 2000;
      const ops = [{ v: 0, zh: "默认区服", es: "Servidor predeterminado", en: t("default_server") }];
      for (let i = 1; i <= max; i++) {
        const nom = prefix + i;
        ops.push({ v: i, zh: nom, en: nom, es: nom });
      }
      return ops;
    }
    return (def.opciones || []).slice();
  }

  function etiquetaValorCombo(clave, valor, tab) {
    const def = defCombo(clave);
    const raw = String(valor == null ? "" : valor).trim();
    if (!def) return raw;
    if (def.allowNone && (raw === "" || raw === String(def.noneValue != null ? def.noneValue : -1))) {
      const nv = def.noneValue != null ? def.noneValue : -1;
      return nv + " (" + t("none") + ")";
    }
    const found = opcionesDe(clave, tab).find(function (o) { return String(o.v) === raw; });
    if (found) return nombreOpcion(found);
    return raw;
  }

  function htmlCombo(tab, clave, etiqueta) {
    const def = defCombo(clave);
    const val = String(valorDe(tab, clave) == null ? "" : valorDe(tab, clave)).trim();
    let ops = opcionesDe(clave, tab);
    if (def.allowNone) {
      const nv = def.noneValue != null ? def.noneValue : -1;
      if (!ops.some(function (o) { return String(o.v) === String(nv); })) {
        ops = [{ v: nv, en: t("none"), es: t("none"), zh: t("none") }].concat(ops);
      }
    }
    if (val !== "" && !ops.some(function (o) { return String(o.v) === val; })) {
      ops = ops.concat([{ v: val, es: val, zh: val }]);
    }
    const opts = ops.map(function (o) {
      const v = String(o.v);
      return '<option value="' + esc(v) + '"' + (v === val ? " selected" : "") + ">" + esc(nombreOpcion(o)) + "</option>";
    }).join("");
    return '<div class="campo"><label class="et">' + esc(etiqueta) + "</label>" +
      '<select class="sel" data-tab="' + esc(tab) + '" data-clave="' + esc(clave) + '">' + opts + "</select></div>";
  }

  function pickersCoord() {
    return (catalogo().coord && catalogo().coord.pickers) || [];
  }

  function pickerDe(tab, clave) {
    return pickersCoord().find(function (p) { return p.tab === tab && (p.x === clave || p.y === clave); }) || null;
  }

  function formulaCoord() {
    const f = (catalogo().coord && catalogo().coord.formula) || {};
    return { ox: Number(f.offset_x != null ? f.offset_x : 350), oy: Number(f.offset_y != null ? f.offset_y : 90) };
  }

  function htmlCoordGrupo(tab, p) {
    const cx = campoPorClave(tab, p.x);
    const cy = campoPorClave(tab, p.y);
    const mapVal = valorDe(tab, p.mapKey);
    const mapLab = etiquetaValorCombo(p.mapKey, mapVal);
    return '<div class="campo-coord">' +
      htmlTexto(tab, p.x, (cx && cx.etiqueta) || p.x) +
      htmlTexto(tab, p.y, (cy && cy.etiqueta) || p.y) +
      '<button type="button" class="line coord-btn" data-abrir-coord="1" data-tab="' + esc(tab) +
      '" data-x="' + esc(p.x) + '" data-y="' + esc(p.y) + '" data-map="' + esc(p.mapKey) + '">' +
      esc(pickLoc(p, "button_en", "button_es", "button_zh") || t("set_coords")) + "</button>" +
      (mapLab ? '<p class="sub">' + esc(t("map_label", { name: mapLab })) + "</p>" : "") +
      "</div>";
  }

  function mapaPorIndice(idx) {
    const n = Number(idx);
    const nombres = (cfgMapas().nombres) || [];
    if (!nombres.length || !Number.isFinite(n) || n < 0 || n >= nombres.length) return null;
    return nombres[n];
  }

  function htmlCoordOverlay() {
    const p = state.coordPick;
    if (!p) return "";
    const mapVal = valorDe(p.tab, p.mapKey);
    const info = mapaPorIndice(mapVal);
    const f = formulaCoord();
    const gx = parseInt(valorDe(p.tab, p.x), 10);
    const gy = parseInt(valorDe(p.tab, p.y), 10);
    const tiene = Number.isFinite(gx) && Number.isFinite(gy);
    const tit = (pickLoc(p, "button_en", "button_es", "button_zh") || t("set_coords")) + (info ? (" — " + etiquetaValorCombo(p.mapKey, mapVal)) : "");
    if (!info) {
      return '<div class="mapa-overlay" id="coord-overlay"><div class="mapa-toolbar"><h3>' + esc(tit) +
        '</h3><button type="button" class="mini line" id="coord-cerrar">' + esc(t("close")) + '</button></div>' +
        '<p class="sub pad">' + esc(t("pick_map_first")) + "</p></div>";
    }
    const src = "mapas-guaji/" + (info.guaji || "");
    let mark = "";
    let status = "Imagen " + (info.guaji_bmp || info.guaji || "") + (tiene ? ("    coord. " + gx + ", " + gy) : t("tap_to_choose"));
    if (tiene) {
      const ix = gx - f.ox;
      const iy = gy - f.oy;
      mark = '<div class="coord-mark" style="left:' + ix + "px;top:" + iy + 'px"></div>';
    }
    return '<div class="mapa-overlay" id="coord-overlay"><div class="mapa-toolbar"><h3>' + esc(tit) +
      '</h3><button type="button" class="mini line" id="coord-cerrar">' + esc(t("close")) + '</button></div>' +
      '<p class="sub" id="coord-status" style="padding:6px 12px;margin:0">' + esc(status) + "</p>" +
      '<div class="mapa-stage" id="coord-stage"><div class="coord-wrap" id="coord-wrap">' +
      '<img id="coord-img" alt="" src="' + esc(src) + '" />' + mark + "</div></div>" +
      '<p class="sub" style="padding:8px 12px">' + esc(t("coord_help")) + "</p></div>";
  }

  function htmlCheck(tab, clave, etiqueta, extraClass) {
    const on = checkOn(valorDe(tab, clave));
    return '<div class="campo' + (extraClass ? (" " + extraClass) : "") + '"><input type="checkbox" data-tab="' + esc(tab) + '" data-clave="' + esc(clave) + '"' +
      (on ? " checked" : "") + ' /><label class="et">' + esc(etiqueta) + "</label></div>";
  }

  function htmlTexto(tab, clave, etiqueta) {
    const val = valorDe(tab, clave);
    return '<div class="campo"><label class="et">' + esc(etiqueta) + "</label>" +
      '<input type="text" data-tab="' + esc(tab) + '" data-clave="' + esc(clave) + '" value="' + esc(val) + '" /></div>';
  }

  function etiquetaLiderItem(v) {
    if (!v) return "";
    return v.nombre ? (v.n + " " + v.nombre) : String(v.n);
  }

  function htmlLider(tab, clave, etiqueta) {
    const val = String(valorDe(tab, clave) == null ? "" : valorDe(tab, clave)).trim();
    const lista = (H().listaLideres
      ? H().listaLideres(state.ventanasTodas, state.ventanas, val)
      : (state.ventanas || []).filter(function (v) { return Number(v.n) !== 0; }));
    const actual = lista.find(function (v) { return String(v.n) === val; });
    let texto = t("tap_leader");
    if (actual) texto = etiquetaLiderItem(actual);
    else if (val && val !== "0") texto = t("window_n", { n: val });
    let extra = "";
    if (val === "0" || val === "") extra = '<p class="sub">' + esc(t("no_leader")) + "</p>";
    else if (!actual) extra = '<p class="sub">' + esc(t("leader_missing", { n: val })) + "</p>";
    const vacio = lista.length ? "" : '<p class="sub">' + esc(t("no_window_list")) + "</p>";
    let modal = "";
    if (state.liderAbierto) {
      const filas = lista.map(function (v) {
        const n = String(v.n);
        const on = n === val;
        return '<button type="button" class="lider-opt' + (on ? " on" : "") + '" data-elegir-lider="' + esc(n) +
          '" data-tab="' + esc(tab) + '" data-clave="' + esc(clave) + '">' + esc(etiquetaLiderItem(v)) + "</button>";
      }).join("");
      modal = '<div class="lider-modal" id="lider-modal"><div class="lider-sheet">' +
        '<div class="lider-sheet-cab"><h3>' + esc(t("choose_leader")) + "</h3>" +
        '<button type="button" class="line" id="cerrar-lider">' + esc(t("close")) + "</button></div>" +
        '<div class="lider-opciones">' + filas + "</div></div></div>";
    }
    return '<div class="campo-lider"><label class="et">' + esc(etiqueta) + "</label>" +
      '<button type="button" class="lider-btn" id="abrir-lider" aria-haspopup="listbox" aria-expanded="' +
      (state.liderAbierto ? "true" : "false") + '"><span>' + esc(texto) +
      '</span><span class="lider-chev">▾</span></button>' + extra + vacio + modal + "</div>";
  }


  function etiquetaCampo(c) {
    if (!c) return "";
    const loc = pickLoc(c, "etiqueta_en", "etiqueta_es", "etiqueta_zh");
    if (loc) return loc;
    if (c.etiqueta && !/[\u3400-\u9fff]/.test(c.etiqueta)) return c.etiqueta;
    return c.etiqueta || c.clave || "";
  }

  function htmlCampo(c, tab) {
    if (!c) return "";
    const et = etiquetaCampo(c) || c.clave;
    if (c.tipo === "check") return htmlCheck(tab, c.clave, et);
    if (c.clave === "队长是哪个") return htmlLider(tab, c.clave, et);
    if (defCombo(c.clave)) return htmlCombo(tab, c.clave, et);
    return htmlTexto(tab, c.clave, et);
  }


  function campoPorClave(tab, clave) {
    const tabs = (state.mapa && state.mapa.tabs) || [];
    const tb = tabs.find((x) => x.id === tab);
    const c = (tb && tb.campos || []).find((x) => x.clave === clave);
    if (c) return c;
    const m = /^判定窗口(\d+)$/.exec(clave);
    if (m) return { clave: clave, tipo: "check", etiqueta: t("window_n", { n: m[1] }), etiqueta_en: t("window_n", { n: m[1] }), etiqueta_es: t("window_n", { n: m[1] }), etiqueta_zh: t("window_n", { n: m[1] }) };
    const val = valorDe(tab, clave);
    const tipo = (H().esCheckOn && (H().esCheckOn(val) || /^(false|FALSE|False|0|否|关|关闭)$/.test(String(val || "").trim()))) ? "check" : "edit";
    return { clave: clave, tipo: tipo, etiqueta: clave };
  }

  function seccionesDelTab(tab) {
    const tabs = (state.secciones && state.secciones.tabs) || [];
    const t = tabs.find((x) => x.id === tab);
    return (t && t.secciones) || [];
  }

  function htmlSeccion(sec, tab, valores, usados) {
    let body = "";
    if (tab === "TAB2" && sec.titulo_zh === "地图设置") body += htmlMapasCombate();
    (sec.claves || []).forEach((clave) => {
      if (!Object.prototype.hasOwnProperty.call(valores, tab + "\n" + clave)) return;
      if (H().esClaveSecreta && H().esClaveSecreta(clave)) return;
      if (usados[clave]) return;
      const pk = pickerDe(tab, clave);
      if (pk) {
        usados[pk.x] = true;
        usados[pk.y] = true;
        body += htmlCoordGrupo(tab, pk);
        return;
      }
      usados[clave] = true;
      body += htmlCampo(campoPorClave(tab, clave), tab);
    });
    if (!body) return "";
    const tit = pickLoc(sec, "titulo_en", "titulo_es", "titulo_zh");
    return '<div class="bloque">' + (tit ? ("<h3>" + esc(tit) + "</h3>") : "") + body + "</div>";
  }

  function htmlMapasCombate() {
    if (!hayCampo("TAB2", "地图设置信息") || !H().parseMapaSettings) return "";
    const parsed = parsedMapas();
    const grupos = parsed.groups || [];
    const nMaps = grupos.length;
    if (!nMaps) return '<div class="bloque"><h3>' + esc(t("map_settings")) + '</h3><p class="sub">' + esc(t("cannot_read_maps")) + "</p></div>";
    if (state.mapaSel == null || state.mapaSel < 0 || state.mapaSel >= nMaps) {
      let first = 0;
      for (let i = 0; i < nMaps; i++) {
        if (grupos[i] && grupos[i][0] === "1") { first = i; break; }
      }
      state.mapaSel = first;
    }
    const sel = state.mapaSel;
    const lineas = cfgMapas().lineas || 7;
    const flagP0 = (cfgMapas().flagPunto0 != null) ? cfgMapas().flagPunto0 : 8;
    const g = grupos[sel] || [];
    const nPuntos = H().nPuntosDeMapa
      ? H().nPuntosDeMapa(cfgMapas(), sel, g.length)
      : Math.min(40, Math.max(0, g.length - flagP0));
    const imgSrc = H().imagenDeMapa ? H().imagenDeMapa(cfgMapas(), sel) : "";
    let mapasHtml = "";
    for (let i = 0; i < nMaps; i++) {
      const on = grupos[i] && grupos[i][0] === "1";
      mapasHtml += '<label class="mapa-item' + (i === sel ? " foco" : "") + (on ? " on" : "") + '">' +
        '<input type="checkbox" data-mapa="1" data-g="' + i + '" data-f="0"' + (on ? " checked" : "") + " />" +
        '<button type="button" class="mapa-nom" data-foco="' + i + '">' + esc(nombreMapa(i)) + "</button></label>";
    }
    let lineasHtml = "";
    for (let i = 0; i < lineas; i++) {
      const on = g[1 + i] === "1";
      lineasHtml += '<label class="chip"><input type="checkbox" data-mapa="1" data-g="' + sel + '" data-f="' + (1 + i) + '"' +
        (on ? " checked" : "") + " /><span>" + esc(t("line", { n: i + 1 })) + "</span></label>";
    }
    let puntosHtml = "";
    for (let i = 0; i < nPuntos; i++) {
      const on = g[flagP0 + i] === "1";
      puntosHtml += '<label class="chip"><input type="checkbox" data-mapa="1" data-g="' + sel + '" data-f="' + (flagP0 + i) + '"' +
        (on ? " checked" : "") + " /><span>" + (i + 1) + "</span></label>";
    }
    const puntosBloque = nPuntos
      ? ('<div class="punto-grid">' + puntosHtml + "</div>")
      : '<p class="sub">' + esc(t("no_points")) + "</p>";
    const btnFoto = imgSrc
      ? '<button type="button" class="line" id="ver-mapa">' + esc(t("view_map")) + "</button>"
      : "";
    let overlay = "";
    if (state.mapaFoto && imgSrc) {
      const z = state.mapaZoom || 1;
      overlay = '<div class="mapa-overlay" id="mapa-foto">' +
        '<div class="mapa-toolbar"><h3>' + esc(nombreMapa(sel)) + "</h3>" +
        '<button type="button" class="line mini" id="mapa-zoom-out">−</button>' +
        '<button type="button" class="line mini" id="mapa-zoom-in">+</button>' +
        '<button type="button" class="gold mini" id="mapa-cerrar">' + esc(t("close")) + "</button></div>" +
        '<div class="mapa-stage" id="mapa-stage"><img alt="' + esc(nombreMapa(sel)) +
        '" src="' + esc(imgSrc) + '" style="transform:scale(' + z + ');transform-origin:top center" /></div></div>';
    }
    return '<div class="mapa-en-seccion" id="bloque-mapas">' +
      '<p class="sub">' + esc(t("maps_summary", { n: nMaps, name: nombreMapa(sel) })) + "</p>" +
      '<div class="mapa-grid">' + mapasHtml + "</div>" +
      '<h4>' + esc(t("lines_of", { name: nombreMapa(sel) })) + "</h4>" +
      '<div class="linea-grid">' + lineasHtml + "</div>" +
      '<h4>' + esc(t("points_of", { name: nombreMapa(sel), n: nPuntos })) + "</h4>" + btnFoto +
      puntosBloque + "</div>" + overlay;
  }

  function htmlSeguirLider() {
    if (!hayCampo("TAB2", "跟随队长") && !hayCampo("TAB2", "队长是哪个")) return "";
    let h = '<div class="bloque" id="bloque-lider"><h3>' + esc(t("follow_block")) + "</h3>";
    if (hayCampo("TAB2", "跟随队长")) h += htmlCheck("TAB2", "跟随队长", t("follow_leader"));
    if (hayCampo("TAB2", "队长是哪个")) h += htmlLider("TAB2", "队长是哪个", t("leader_window"));
    if (hayCampo("TAB2", "跟随延迟")) h += htmlTexto("TAB2", "跟随延迟", t("follow_delay"));
    return h + "</div>";
  }

  function clavesEspecialesTab2() {
    return { "跟随队长": 1, "队长是哪个": 1, "跟随延迟": 1, "地图设置信息": 1 };
  }

  function camposOtros(tab, usados) {
    usados = usados || {};
    const out = [];
    (state.ini && state.ini.campos || []).forEach((c) => {
      if (c.tab !== tab) return;
      if (H().esClaveSecreta && H().esClaveSecreta(c.clave)) return;
      if (c.clave === "地图设置信息") return;
      if (usados[c.clave]) return;
      out.push(c);
    });
    return out;
  }

  function htmlOtros(tab, usados) {
    const otros = camposOtros(tab, usados);
    if (!otros.length) return "";
    const body = otros.map((c) => {
      const val = valorDe(tab, c.clave);
      const et = etiquetaCampo(c) || c.clave;
      if (c.clave === "队长是哪个") return htmlLider(tab, c.clave, et);
      if (defCombo(c.clave)) return htmlCombo(tab, c.clave, et);
      if (H().esCheckOn && (H().esCheckOn(val) || /^(false|FALSE|False|0|否|关|关闭)$/.test(String(val || "").trim()))) {
        return htmlCheck(tab, c.clave, et, "otro");
      }
      return htmlTexto(tab, c.clave, et);
    }).join("");
    return '<div class="bloque" id="bloque-otros"><h3>' + esc(t("other")) + "</h3>" +
      '<p class="sub">' + esc(t("other_help", { n: otros.length })) + "</p>" +
      body + "</div>";
  }


  function destinosCopia() {
    const n = Number(state.ventana && state.ventana.n);
    const lista = (state.ventanasTodas && state.ventanasTodas.length) ? state.ventanasTodas : (state.ventanas || []);
    return lista.filter(function (v) { return Number(v.n) !== n; });
  }

  function nombreVentanaCopia(v) {
    if (!v) return "";
    return v.nombre ? (v.n + " — " + v.nombre) : t("copy_window_n", { n: v.n });
  }

  function modalCopiarHtml() {
    const m = state.modalCopiar;
    if (!m) return "";
    const tabs = (state.mapa && state.mapa.tabs) || [];
    const dests = destinosCopia();
    const tabsHtml = tabs.map(function (tb) {
      const on = !m.todas && (m.pestanas || []).indexOf(tb.id) >= 0;
      const nom = pickLoc(tb, "nombre_en", "nombre_es", "nombre_zh") || tb.nombre || tb.id;
      return '<label class="sub" style="display:block;margin:4px 0"><input type="checkbox" data-copia-tab="' + esc(tb.id) + '"' + (on ? " checked" : "") + (m.todas ? " disabled" : "") + "> " + esc(nom) + "</label>";
    }).join("");
    const destHtml = dests.length ? dests.map(function (v) {
      const on = (m.destinos || []).indexOf(Number(v.n)) >= 0 || (m.destinos || []).indexOf(String(v.n)) >= 0;
      return '<label class="sub" style="display:block;margin:4px 0"><input type="checkbox" data-copia-dest="' + esc(v.n) + '"' + (on ? " checked" : "") + "> " + esc(nombreVentanaCopia(v)) + "</label>";
    }).join("") : ('<p class="sub">' + esc(t("copy_none_dest")) + "</p>");
    const resumen = m.confirmar ? ('<p>' + esc(t("copy_summary", {
      tabs: m.todas ? t("copy_all_tabs") : (m.pestanas || []).join(", "),
      origen: (state.ventana && state.ventana.n) || "",
      destinos: (m.destinos || []).join(", ")
    })) + "</p>") : "";
    return '<div class="modal-salir" id="modalCopiar"><div class="modal-salir-caja" style="max-height:80vh;overflow:auto">' +
      "<h2 style=\"margin:0 0 10px;font-size:18px\">" + esc(t("copy_title")) + "</h2>" +
      '<p class="sub">' + esc(t("copy_identity_note")) + "</p>" +
      '<p class="lbl">' + esc(t("copy_tabs")) + "</p>" +
      '<label class="sub" style="display:block;margin:4px 0 8px"><input type="checkbox" id="copiaTodas"' + (m.todas ? " checked" : "") + "> " + esc(t("copy_all_tabs")) + "</label>" +
      tabsHtml +
      '<p class="lbl" style="margin-top:10px">' + esc(t("copy_destinations")) + "</p>" +
      (dests.length ? ('<button class="line" type="button" id="copiaSelTodas" style="margin-bottom:8px">' + esc(t("copy_select_all_dest")) + "</button>") : "") +
      destHtml + resumen +
      '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="gold" type="button" id="copiaOk">' + esc(m.confirmar ? t("copy_confirm") : t("copy")) + "</button>" +
      '<button class="line" type="button" id="copiaCancel">' + esc(t("copy_cancel")) + "</button>" +
      "</div></div></div>";
  }

  function abrirModalCopiar() {
    const tab = state.tab || ((state.mapa && state.mapa.tabs && state.mapa.tabs[0] && state.mapa.tabs[0].id) || "TAB1");
    state.modalCopiar = { todas: false, pestanas: [tab], destinos: [], confirmar: false };
    render();
  }

  function leerModalCopiarDom(m) {
    if (!m) return m;
    const todasEl = document.getElementById("copiaTodas");
    m.todas = !!(todasEl && todasEl.checked);
    const pest = [];
    document.querySelectorAll("[data-copia-tab]").forEach(function (el) {
      if (el.checked) pest.push(el.getAttribute("data-copia-tab"));
    });
    m.pestanas = pest;
    const dest = [];
    document.querySelectorAll("[data-copia-dest]").forEach(function (el) {
      if (el.checked) dest.push(Number(el.getAttribute("data-copia-dest")));
    });
    m.destinos = dest;
    return m;
  }

  function renderEditor() {
    const v = state.ventana || {};
    const titulo = v.nombre ? (v.n + " — " + v.nombre) : t("window_n", { n: (v.n || "") });
    const tabs = (state.mapa && state.mapa.tabs) || [];
    if (!tabs.some((t) => t.id === state.tab) && tabs[0]) state.tab = tabs[0].id;
    const tabBtns = tabs.map((t) =>
      '<button class="line' + (t.id === state.tab ? " on" : "") + '" type="button" data-tab="' + esc(t.id) + '">' +
      esc(pickLoc(t, "nombre_en", "nombre_es", "nombre_zh") || t.nombre) + "</button>"
    ).join("");
    const tab = tabs.find((t) => t.id === state.tab) || { campos: [] };
    const valores = {};
    (state.ini && state.ini.campos || []).forEach((c) => { valores[c.tab + "\n" + c.clave] = c.valor; });
    const nCambios = Object.keys(state.cambios).length;
    const cargando = state.ocupado === "cargar";
    const guardando = state.ocupado === "guardar";
    const ocupado = !!state.ocupado;
    let lista = "";
    if (cargando) {
      lista = '<p class="sub">' + esc(t("loading_fields")) + "</p>";
    } else {
      const secs = seccionesDelTab(state.tab);
      const usados = {};
      if (secs.length) {
        lista = secs.map((sec) => htmlSeccion(sec, state.tab, valores, usados)).join("");
        lista += htmlOtros(state.tab, usados);
      } else {
        lista = (tab.campos || []).map((c) => {
          if (!Object.prototype.hasOwnProperty.call(valores, state.tab + "\n" + c.clave)) return "";
          return htmlCampo(c, state.tab);
        }).join("") + htmlOtros(state.tab, usados);
      }
      if (!lista) lista = '<p class="sub">' + esc(t("no_fields")) + "</p>";
    }
    const textoBoton = guardando ? t("saving") : (cargando ? t("loading") : (nCambios ? t("save_n", { n: nCambios }) : t("no_changes")));
    document.getElementById("app").innerHTML =
      '<header><div class="head-top"><button class="back" id="volver" type="button">' + esc(t("back")) + "</button>" + htmlIdioma() + "</div><h1>" + esc(titulo) + "</h1>" +
      '<p class="sub estado ' + esc(v.estado || "") + '">' + esc(etiquetaEstado(v.estado)) + "</p>" +
      bannerApk() + avisoHtml() +
      (cargando ? ('<p class="sub">' + esc(t("loading")) + "</p>") : "") + "</header>" +
      '<div class="tabs">' + tabBtns + "</div>" +
      '<section class="pad lista-campos">' + lista + htmlRespaldos() + "</section>" +
      modalSalirHtml() + modalRestaurarHtml() + modalCopiarHtml() +
      '<div class="fijo"><button class="line" id="copiarIni" type="button"' + (ocupado ? " disabled" : "") + ">" + esc(state.ocupado === "copiar" ? t("copying") : t("copy")) + "</button>" +
      '<button class="gold" id="guardar" type="button"' + (ocupado || !nCambios ? " disabled" : "") + ">" +
      textoBoton + "</button>" +
      (nCambios ? ('<button class="line" id="descartarCambios" type="button">' + esc(t("discard_changes")) + "</button>") : "") +
      "</div>" + htmlCoordOverlay();
    document.getElementById("volver").onclick = function () { salirDelEditor(false); };
    document.querySelectorAll("[data-restaurar]").forEach(function (btn) {
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute("data-restaurar");
        const item = (state.respaldos || []).find(function (x) {
          return String(x.id || "") === id || String(x.archivo || "") === id || String(x.hash || "") === id;
        });
        if (item) { state.pedirRestaurar = item; render(); }
      };
    });
    const confR = document.getElementById("confirmarRestaurar");
    if (confR) confR.onclick = function () {
      const item = state.pedirRestaurar;
      state.pedirRestaurar = null;
      if (item) restaurarIni(item);
    };
    const canR = document.getElementById("cancelarRestaurar");
    if (canR) canR.onclick = function () { state.pedirRestaurar = null; render(); };
    const desc = document.getElementById("descartarCambios");
    if (desc) desc.onclick = function () { descartarCambiosPendientes(); };
    const salirBtn = document.getElementById("salirSinGuardar");
    if (salirBtn) salirBtn.onclick = function () { state.pedirSalir = false; salirDelEditor(true); };
    const quedarme = document.getElementById("quedarme");
    if (quedarme) quedarme.onclick = function () { state.pedirSalir = false; render(); };
    document.querySelectorAll(".tabs [data-tab]").forEach((btn) => {
      btn.onclick = function () { state.tab = btn.getAttribute("data-tab"); state.liderAbierto = false; state.mapaFoto = false; state.coordPick = null; render(); };
    });
    function alCambiarCampo(inp) {
      const tabId = inp.getAttribute("data-tab");
      const clave = inp.getAttribute("data-clave");
      if (!tabId || !clave) return;
      let val;
      if (inp.type === "checkbox") val = checkValor(inp.checked, tabId, clave);
      else val = inp.value;
      setValor(tabId, clave, val);
      if (inp.type === "radio") { render(); return; }
      actualizarBotonGuardar();
    }
    document.querySelectorAll("input[data-clave], select[data-clave]").forEach((inp) => {
      inp.onchange = function () { alCambiarCampo(inp); };
      if (inp.tagName === "INPUT" && inp.type !== "checkbox") inp.oninput = function () { alCambiarCampo(inp); };
    });
    document.querySelectorAll("[data-foco]").forEach((btn) => {
      btn.onclick = function (e) {
        e.preventDefault();
        state.mapaSel = Number(btn.getAttribute("data-foco"));
        state.mapaFoto = false;
        render();
      };
    });
    document.querySelectorAll("input[data-mapa]").forEach((inp) => {
      inp.onchange = function () {
        const g = Number(inp.getAttribute("data-g"));
        const f = Number(inp.getAttribute("data-f"));
        const parsed = parsedMapas();
        if (!H().conFlag) return;
        const nuevo = H().conFlag(parsed, g, f, inp.checked);
        setBlobMapas(nuevo);
        if (f === 0) { state.mapaSel = g; state.mapaFoto = false; }
        render();
      };
    });
    const abrirL = document.getElementById("abrir-lider");
    if (abrirL) abrirL.onclick = function () {
      state.liderAbierto = true;
      state.mapaFoto = false;
      render();
    };
    const cerrarL = document.getElementById("cerrar-lider");
    if (cerrarL) cerrarL.onclick = function () { state.liderAbierto = false; render(); };
    const modalL = document.getElementById("lider-modal");
    if (modalL) modalL.onclick = function (e) {
      if (e.target === modalL) { state.liderAbierto = false; render(); }
    };
    document.querySelectorAll("[data-elegir-lider]").forEach(function (btn) {
      btn.onclick = function () {
        setValor(btn.getAttribute("data-tab"), btn.getAttribute("data-clave"), btn.getAttribute("data-elegir-lider"));
        state.liderAbierto = false;
        render();
      };
    });
    const verM = document.getElementById("ver-mapa");
    if (verM) verM.onclick = function () {
      state.mapaFoto = true;
      state.mapaZoom = 1;
      state.liderAbierto = false;
      render();
    };
    const cerrarM = document.getElementById("mapa-cerrar");
    if (cerrarM) cerrarM.onclick = function () { state.mapaFoto = false; render(); };
    const zin = document.getElementById("mapa-zoom-in");
    if (zin) zin.onclick = function () {
      state.mapaZoom = Math.min(5, Math.round(((state.mapaZoom || 1) + 0.5) * 10) / 10);
      render();
    };
    const zout = document.getElementById("mapa-zoom-out");
    if (zout) zout.onclick = function () {
      state.mapaZoom = Math.max(1, Math.round(((state.mapaZoom || 1) - 0.5) * 10) / 10);
      render();
    };
    const stage = document.getElementById("mapa-stage");
    if (stage) stage.onwheel = function (e) {
      e.preventDefault();
      const d = e.deltaY < 0 ? 0.25 : -0.25;
      state.mapaZoom = Math.max(1, Math.min(5, Math.round(((state.mapaZoom || 1) + d) * 100) / 100));
      render();
    };
    document.querySelectorAll("[data-abrir-coord]").forEach(function (btn) {
      btn.onclick = function () {
        state.coordPick = {
          tab: btn.getAttribute("data-tab"),
          x: btn.getAttribute("data-x"),
          y: btn.getAttribute("data-y"),
          mapKey: btn.getAttribute("data-map")
        };
        state.liderAbierto = false;
        state.mapaFoto = false;
        render();
      };
    });
    const cerrarC = document.getElementById("coord-cerrar");
    if (cerrarC) cerrarC.onclick = function () { state.coordPick = null; render(); };
    const ovC = document.getElementById("coord-overlay");
    const imgC = document.getElementById("coord-img");
    if (imgC) imgC.onclick = function (e) {
      if (!state.coordPick) return;
      const r = imgC.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const nw = imgC.naturalWidth || r.width;
      const nh = imgC.naturalHeight || r.height;
      const ix = (e.clientX - r.left) * (nw / r.width);
      const iy = (e.clientY - r.top) * (nh / r.height);
      const f = formulaCoord();
      const gx = Math.round(ix + f.ox);
      const gy = Math.round(iy + f.oy);
      setValor(state.coordPick.tab, state.coordPick.x, String(gx));
      setValor(state.coordPick.tab, state.coordPick.y, String(gy));
      render();
    };
    const g = document.getElementById("guardar");

    const cbtn = document.getElementById("copiarIni");
    if (cbtn) cbtn.onclick = function () { abrirModalCopiar(); };
    const mc = document.getElementById("modalCopiar");
    if (mc && state.modalCopiar) {
      const cancel = document.getElementById("copiaCancel");
      if (cancel) cancel.onclick = function () { state.modalCopiar = null; render(); };
      const todas = document.getElementById("copiaTodas");
      if (todas) todas.onchange = function () {
        state.modalCopiar = leerModalCopiarDom(state.modalCopiar || {});
        state.modalCopiar.confirmar = false;
        render();
      };
      document.querySelectorAll("[data-copia-tab],[data-copia-dest]").forEach(function (el) {
        el.onchange = function () {
          state.modalCopiar = leerModalCopiarDom(state.modalCopiar || {});
          state.modalCopiar.confirmar = false;
        };
      });
      const sel = document.getElementById("copiaSelTodas");
      if (sel) sel.onclick = function () {
        state.modalCopiar = leerModalCopiarDom(state.modalCopiar || {});
        state.modalCopiar.destinos = destinosCopia().map(function (v) { return Number(v.n); });
        state.modalCopiar.confirmar = false;
        render();
      };
      const ok = document.getElementById("copiaOk");
      if (ok) ok.onclick = function () {
        const m = leerModalCopiarDom(state.modalCopiar || {});
        if (!m.todas && !(m.pestanas && m.pestanas.length)) { state.avisoTipo = "error"; state.aviso = t("copy_none_tabs"); render(); return; }
        if (!(m.destinos && m.destinos.length)) { state.avisoTipo = "error"; state.aviso = t("copy_none_dest"); render(); return; }
        if (!m.confirmar) { m.confirmar = true; state.modalCopiar = m; render(); return; }
        state.modalCopiar = m;
        copiarIni();
      };
    }
    if (g) g.onclick = guardarIni;
  }

  async function restaurarIni(item) {
    const srv = state.servidor;
    const n = state.ventana && state.ventana.n;
    if (!srv || n == null || !item) return;
    state.ocupado = "restaurar";
    state.aviso = "";
    state.avisoTipo = "";
    state.pedirRestaurar = null;
    try {
      try { render(); } catch (eRender0) {}
      const body = { cuenta: state.cuenta };
      if (item.id) body.id = item.id;
      if (item.archivo) body.archivo = item.archivo;
      if (item.hash) body.hash = item.hash;
      const data = await api(srv, "/v1/ini/restaurar?n=" + encodeURIComponent(n), { method: "POST", body: body, timeout: 90000 });
      if (!data || data.ok === false) throw new Error((data && data.mensaje) || t("restore_failed", { msg: "" }));
      state.avisoTipo = "ok";
      state.aviso = data.mensaje || t("restored");
      state.cambios = {};
      const otra = await api(srv, "/v1/ini?n=" + encodeURIComponent(n));
      if (otra && otra.ok) state.ini = otra;
      const vs = await api(srv, "/v1/ventanas");
      if (vs && (vs.ventanas || vs.ventanas_todas || vs.total_muc)) {
        aplicarVentanas(vs);
        state.ventana = (state.ventanas || []).find((x) => Number(x.n) === Number(n)) || state.ventana;
      }
      await cargarRespaldos(n);
    } catch (e) {
      state.avisoTipo = "error";
      state.aviso = t("restore_failed", { msg: (e && e.message) || String(e) });
    } finally {
      limpiarOcupado();
    }
    try { render(); } catch (eRender1) { limpiarOcupado(); }
  }


  async function copiarIni() {
    const srv = state.servidor;
    const n = state.ventana && state.ventana.n;
    const m = state.modalCopiar || {};
    const destinos = (m.destinos || []).map(Number).filter(function (d) { return d && d !== Number(n); });
    if (!destinos.length) {
      state.avisoTipo = "error";
      state.aviso = t("copy_none_dest");
      render();
      return;
    }
    const body = { origen: n, destinos: destinos, cuenta: state.cuenta };
    if (m.todas) body.todas = true;
    else body.pestanas = m.pestanas || [];
    state.ocupado = "copiar";
    state.aviso = "";
    state.avisoTipo = "";
    try {
      try { render(); } catch (eRender0) {}
      const data = await api(srv, "/v1/ini/copiar", { method: "POST", body: body, timeout: 90000 });
      if (!data || data.ok === false) throw new Error((data && data.mensaje) || t("copy_failed", { msg: "" }));
      state.avisoTipo = "ok";
      state.aviso = data.mensaje || t("copy_ok");
      if (data.aviso) state.aviso += " " + data.aviso;
      state.modalCopiar = null;
      const otra = await api(srv, "/v1/ini?n=" + encodeURIComponent(n));
      if (otra && otra.ok) state.ini = otra;
      const vs = await api(srv, "/v1/ventanas");
      if (vs && (vs.ventanas || vs.ventanas_todas)) {
        aplicarVentanas(vs);
        state.ventana = (state.ventanas || []).find((x) => Number(x.n) === Number(n)) || state.ventana;
      }
      await cargarRespaldos(n);
    } catch (e) {
      state.avisoTipo = "error";
      state.aviso = t("copy_failed", { msg: (e && e.message) || String(e) });
    } finally {
      limpiarOcupado();
    }
    try { render(); } catch (eRender1) { limpiarOcupado(); }
  }

  async function guardarIni() {
    const srv = state.servidor;
    const n = state.ventana && state.ventana.n;
    const cambios = Object.keys(state.cambios).map((k) => {
      const p = k.split("\n");
      return { tab: p[0], clave: p[1], valor: state.cambios[k] };
    });
    if (!cambios.length) return;
    state.ocupado = "guardar";
    state.aviso = "";
    state.avisoTipo = "";
    try {
      try { render(); } catch (eRender0) {}
      const data = await api(srv, "/v1/ini?n=" + encodeURIComponent(n), { method: "POST", body: { cambios: cambios, cuenta: state.cuenta }, timeout: 90000 });
      if (!data || data.ok === false) throw new Error((data && data.mensaje) || t("not_saved"));
      state.avisoTipo = "ok";
      state.aviso = data.mensaje || t("saved");
      state.cambios = {};
      if (data.aviso) state.aviso += " " + data.aviso;
      const otra = await api(srv, "/v1/ini?n=" + encodeURIComponent(n));
      if (otra && otra.ok) state.ini = otra;
      const vs = await api(srv, "/v1/ventanas");
      if (vs && (vs.ventanas || vs.ventanas_todas)) {
        aplicarVentanas(vs);
        state.ventana = (state.ventanas || []).find((x) => Number(x.n) === Number(n)) || state.ventana;
      }
      await cargarRespaldos(n);
    } catch (e) {
      state.avisoTipo = "error";
      state.aviso = t("save_failed", { msg: (e && e.message) || String(e) });
    } finally {
      limpiarOcupado();
    }
    try { render(); } catch (eRender1) { limpiarOcupado(); }
  }

  function render() {
    if (!state.cuenta) { renderLogin(); wireIdioma(); return; }
    const p = state.pantalla;
    if (p === "login") renderLogin();
    else if (p === "agregar") renderAgregar();
    else if (p === "emparejar") renderEmparejar();
    else if (p === "ventanas") renderVentanas();
    else if (p === "editor") renderEditor();
    else renderServidores();
    wireIdioma();
    wireAviso();
  }

  window.__apk = function (remota) {
    state.apkNueva = Number(remota) > Number(window.APP_CODE || 0);
    render();
  };
  window.__apkEstado = function (msg) {
    state.instalando = false;
    state.aviso = msg || "";
    render();
  };
  document.getElementById("app").addEventListener("click", function (e) {
    const t = e.target;
    if (!t || t.id !== "instalarApk" || state.instalando) return;
    state.instalando = true;
    render();
    if (window.Nativo) window.Nativo.instalar();
  });

  loadServers();
  (function () {
    let v = "en";
    try { v = localStorage.getItem(KEY_IDIOMA) || "en"; } catch (e) { v = "en"; }
    setIdioma(v);
  })();
  state.pantalla = state.cuenta ? "servidores" : "login";
  render();
  if (window.__BF_TEST) {
    window.__BF = {
      state: state,
      abrirServidor: abrirServidor,
      abrirVentana: abrirVentana,
      setValor: setValor,
      setIdioma: setIdioma,
      idiomaActual: idiomaActual,
      t: t,
      render: render,
      api: api,
      guardarIni: guardarIni,
      copiarIni: copiarIni,
      abrirModalCopiar: abrirModalCopiar,
      restaurarIni: restaurarIni,
      cargarRespaldos: cargarRespaldos,
      farmTexto: farmTexto,
      formatNumeroCl: formatNumeroCl,
      htmlFarmLinea: htmlFarmLinea,
      htmlFarmEncabezado: htmlFarmEncabezado,
      totalMucTexto: totalMucTexto,
      aplicarVentanas: aplicarVentanas,
      avisoHtml: avisoHtml,
      cerrarAviso: cerrarAviso,
      descartarCambiosPendientes: descartarCambiosPendientes,
      salirDelEditor: salirDelEditor,
      atrasSistema: atrasSistema,
      hayCambiosPendientes: hayCambiosPendientes,
      accionarVentana: accionarVentana,
      nombreLiderFicha: nombreLiderFicha
    };
  }
  if (!window.PWA && window.Nativo && window.Nativo.revisar) window.Nativo.revisar();
})();
