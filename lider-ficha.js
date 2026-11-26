(function (root) {
  function seguirActivo(v) {
    const s = String(v == null ? "" : v).trim().toUpperCase().replace(/Í/g, "I");
    return s === "TRUE" || s === "1" || s === "YES" || s === "Y" || s === "ON" || s === "SI";
  }
  function refANumero(ref, vents) {
    if (ref == null) return null;
    const s = String(ref).trim();
    if (!s || s === "0" || s === "-1" || s.toUpperCase() === "NONE" || s.toUpperCase() === "NULL") return null;
    const n = Number(s);
    if (Number.isFinite(n) && String(parseInt(s, 10)) === String(parseInt(s, 10)) && /^\-?\d+$/.test(s)) return parseInt(s, 10);
    const lista = vents || [];
    for (let i = 0; i < lista.length; i++) {
      if (String(lista[i].nombre || "").trim() === s) return Number(lista[i].n);
    }
    return null;
  }
  function mapaVentanas(vents) {
    const m = {};
    (vents || []).forEach(function (v) {
      if (v && v.n != null) m[Number(v.n)] = v;
    });
    return m;
  }
  function resolverLider(v, vents) {
    if (!v) return null;
    const sigue = (v.sigue_lider != null && v.sigue_lider !== "") ? v.sigue_lider : v.follow;
    if (!seguirActivo(sigue === true || sigue === false ? (sigue ? "TRUE" : "FALSE") : sigue)) return null;
    const mapa = mapaVentanas(vents);
    const yo = Number(v.n);
    let ln = v.lider_n;
    if (ln == null || ln === "") ln = refANumero(v.lider_ref, vents);
    else ln = refANumero(ln, vents);
    if (ln == null) return null;
    if (ln === yo) return null;
    if (v.lider_nombre) return String(v.lider_nombre).trim() || null;
    const dest = mapa[ln];
    if (!dest) return null;
    const nom = String(dest.nombre || "").trim();
    return nom || null;
  }
  const api = { seguirActivo: seguirActivo, resolverLider: resolverLider };
  root.LIDER_FICHA = api;
  if (typeof window !== "undefined") window.LIDER_FICHA = api;
})(typeof window !== "undefined" ? window : this);
