(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clp = n => "$" + Math.round(n).toLocaleString("es-CL");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const plano = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  /* ---------- Puerta de edad (+18, recuerda la respuesta) ---------- */
  const edad = $("#edad");
  const demo = new URLSearchParams(location.search).has("demo");
  if (!demo && localStorage.getItem("lyon-edad") !== "18" && edad.showModal) {
    edad.showModal();
    edad.addEventListener("cancel", e => e.preventDefault());
  }
  $("#edad-si").addEventListener("click", () => { localStorage.setItem("lyon-edad", "18"); edad.close(); });

  /* ---------- Hora de Santiago y corte de las 13:00 ---------- */
  function ahoraSantiago() {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santiago", hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit"
    }).formatToParts(new Date()).map(x => [x.type, x.value]));
    const dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { dia: dias[p.weekday], h: +p.hour % 24, m: +p.minute };
  }
  const nombreDia = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const siguienteHabil = d => { let n = (d + 1) % 7; while (n === 0 || n === 6) n = (n + 1) % 7; return n; };

  function actualizarReloj() {
    const { dia, h, m } = ahoraSantiago();
    const min = h * 60 + m, corte = 13 * 60, habil = dia >= 1 && dia <= 5;
    let franja, estado;
    if (habil && min < corte) {
      const r = corte - min, txt = (r >= 60 ? Math.floor(r / 60) + " h " : "") + (r % 60) + " min";
      franja = "· quedan " + txt;
      estado = "Si compras ahora, tu pedido sale hoy. Quedan " + txt + " para el retiro del courier.";
    } else {
      const sig = siguienteHabil(dia);
      franja = "· lo que compras ahora sale el " + nombreDia[sig];
      estado = dia === 0 ? "Hoy el local está cerrado. Lo que compras ahora sale el lunes."
        : "El retiro de hoy ya pasó. Lo que compras ahora sale el " + nombreDia[sig] + ". El local atiende hasta las " + (dia === 6 ? "17:00" : "19:00") + ".";
    }
    $("#reloj-franja").textContent = franja;
    if (!$("#dia-estado")) return;
    $("#dia-estado").textContent = estado;
    $("#dia-ahora").style.setProperty("--p", Math.min(1, Math.max(0, (h + m / 60 - 8) / 14)));
    $("#dia-hora").textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
    document.querySelectorAll("#horario > div").forEach(el =>
      el.classList.toggle("hoy", el.dataset.dias.split(",").map(Number).includes(dia)));
  }
  actualizarReloj();
  setInterval(actualizarReloj, 30000);

  /* ---------- Productos: los curados de la portada + el catálogo completo ---------- */
  const datos = window.LYON_DATOS || { productos: [], novedades: [], secciones: {} };
  const CAT_NOMBRE = { tabaqueria: "Tabaqueria", smokeshop: "Smokeshop", vaporizadores: "Vaporizadores", growshop: "Growshop" };
  const catalogo = (window.LYON_CATALOGO || []).filter(x => CAT_NOMBRE[x.c]).map(x => ({
    slug: x.s, nombre: x.n, marca: x.m, cat: CAT_NOMBRE[x.c], c: x.c, sub: x.sub, precio: x.p,
    stock: x.d && !x.st ? Infinity : x.st, sku: x.sku, nOpc: x.o, fecha: x.u,
    img: x.f ? `https://cdnx.jumpseller.com/lyonmarketstore/image/${x.f}/resize/600/600?1` : "assets/logo-lyon.png",
    url: "https://lyonmarket.cl/" + x.s
  }));
  const porSlug = Object.fromEntries(catalogo.map(p => [p.slug, p]));
  datos.productos.forEach(p => { porSlug[p.slug] = { ...porSlug[p.slug], ...p, nOpc: p.opciones.length, curado: true }; });
  catalogo.forEach((p, i) => { catalogo[i] = porSlug[p.slug]; });
  const enStock = p => p.stock > 0;
  // Ley 21.642, art. 1: tabaco, vapeadores, sus líquidos y sus accesorios. Growshop no entra.
  const SOLO_18 = new Set(["Tabaqueria", "Smokeshop", "Vaporizadores"]);
  const listas = {
    novedades: datos.novedades,
    tabaqueria: datos.secciones.Tabaqueria || [],
    smokeshop: datos.secciones.Smokeshop || [],
    vaporizadores: datos.secciones.Vaporizadores || [],
    growshop: datos.secciones.Growshop || []
  };

  function placa(p) {
    const li = document.createElement("li");
    const agotado = !enStock(p), vape = p.cat === "Vaporizadores", mayores = SOLO_18.has(p.cat);
    const ops = p.nOpc ? `<span>${p.nOpc} ${vape ? "sabores" : "variantes"}</span>` : "";
    li.innerHTML = `
      <article class="placa${agotado ? " placa--agotada" : ""}">
        <div class="placa__foto">
          <img src="${p.img}" alt="${esc(p.nombre)}" loading="lazy" width="600" height="600">
          ${p.sku ? `<span class="placa__codigo" title="Código del local">Cód. ${esc(p.sku)}</span>` : ""}
        </div>
        <div class="placa__cuerpo">
          ${p.marca ? `<span class="placa__marca">${esc(p.marca)}</span>` : ""}
          <a class="placa__nombre" href="${p.url}" target="_blank" rel="noopener">${esc(p.nombre)}</a>
          <div class="placa__meta"><span class="placa__stock${agotado ? " placa__stock--cero" : ""}">${agotado ? "Sin stock" : isFinite(p.stock) ? p.stock + " en stock" : "Disponible"}</span>${ops}</div>
          <div class="placa__pie">
            <span class="placa__precio">${clp(p.precio)}</span>
            ${agotado
              ? `<button class="placa__btn placa__btn--avisa" type="button" data-avisa="${p.slug}">Avísame</button>`
              : `<button class="placa__btn" type="button" data-agrega="${p.slug}">Agregar</button>`}
          </div>
          ${mayores ? `<p class="placa__ley">Venta exclusiva para mayores de 18 años.</p>` : ""}
        </div>
      </article>`;
    return li;
  }
  document.querySelectorAll("[data-seccion]").forEach(ul => {
    const vistos = new Set();
    (listas[ul.dataset.seccion] || []).map(s => porSlug[s]).filter(Boolean).forEach(p => {
      const clave = p.nombre.trim().toLowerCase();
      if (vistos.has(clave)) return;
      vistos.add(clave);
      ul.append(placa(p));
    });
  });
  document.querySelectorAll("[data-riel]").forEach(b => b.addEventListener("click", () => {
    const r = document.getElementById(b.dataset.riel);
    r.scrollBy({ left: +b.dataset.dir * r.clientWidth * .8, behavior: reduce ? "auto" : "smooth" });
  }));

  /* ---------- Avisos ---------- */
  let tAviso;
  const aviso = $("#aviso");
  function avisar(t) {
    aviso.textContent = t; aviso.classList.add("visible");
    clearTimeout(tAviso); tAviso = setTimeout(() => aviso.classList.remove("visible"), 2600);
  }

  /* ---------- Carro: agregar, sumar, restar, quitar, vaciar; se guarda en el navegador ---------- */
  let carro = {};
  try { carro = JSON.parse(localStorage.getItem("lyon-carro") || "{}"); } catch (_) { carro = {}; }
  Object.keys(carro).forEach(s => { if (!porSlug[s]) delete carro[s]; });
  const cajon = $("#cajon"), lista = $("#cajon-lista"), btnCarro = $("#carro");
  let ultimoFoco = null;

  function guardar() { localStorage.setItem("lyon-carro", JSON.stringify(carro)); }
  function totalUnidades() { return Object.values(carro).reduce((a, b) => a + b, 0); }

  function pintarCarro() {
    const n = totalUnidades();
    $("#carro-n").textContent = n;
    btnCarro.setAttribute("aria-label", "Carro: " + n + (n === 1 ? " producto" : " productos"));
    const items = Object.entries(carro);
    $("#cajon-vacio").hidden = items.length > 0;
    $("#cajon-pie").hidden = items.length === 0;
    lista.innerHTML = items.map(([s, q]) => {
      const p = porSlug[s];
      return `<li class="cajon__item">
        <img src="${p.img}" alt="" width="72" height="72">
        <div>
          <p class="cajon__nombre">${esc(p.nombre)}</p>
          <p class="cajon__precio">${clp(p.precio)} c/u${isFinite(p.stock) ? " · " + p.stock + " en stock" : ""}</p>
          <div class="cantidad" role="group" aria-label="Cantidad de ${esc(p.nombre)}">
            <button type="button" data-menos="${s}" aria-label="Quitar uno" ${q <= 1 ? "disabled" : ""}>−</button>
            <span aria-live="polite">${q}</span>
            <button type="button" data-mas="${s}" aria-label="Agregar uno" ${q >= p.stock ? "disabled" : ""}>+</button>
          </div>
        </div>
        <div>
          <button class="cajon__quitar" type="button" data-quitar="${s}">Quitar</button>
          <p class="cajon__linea">${clp(p.precio * q)}</p>
        </div>
      </li>`;
    }).join("");
    $("#cajon-subtotal").textContent = clp(items.reduce((a, [s, q]) => a + porSlug[s].precio * q, 0));
    $("#cajon-pagar").disabled = !$("#cajon-edad").checked;
  }

  function abrirCajon() {
    ultimoFoco = document.activeElement;
    cajon.hidden = false;
    requestAnimationFrame(() => { cajon.classList.add("abierto"); $(".cajon__cabeza [data-cerrar]").focus(); });
    document.body.style.overflow = "hidden";
  }
  function cerrarCajon() {
    cajon.classList.remove("abierto");
    document.body.style.overflow = "";
    setTimeout(() => { cajon.hidden = true; }, reduce ? 0 : 420);
    if (ultimoFoco) ultimoFoco.focus();
  }
  btnCarro.addEventListener("click", abrirCajon);
  cajon.addEventListener("click", e => {
    const t = e.target.closest("[data-cerrar],[data-mas],[data-menos],[data-quitar]");
    if (!t) return;
    if (t.hasAttribute("data-cerrar")) return cerrarCajon();
    const s = t.dataset.mas || t.dataset.menos || t.dataset.quitar;
    if (t.dataset.mas) carro[s] = Math.min(porSlug[s].stock, carro[s] + 1);
    if (t.dataset.menos) carro[s] = Math.max(1, carro[s] - 1);
    if (t.dataset.quitar) { delete carro[s]; avisar(porSlug[s].nombre + " salió del carro."); }
    guardar(); pintarCarro();
  });
  document.addEventListener("keydown", e => {
    if (cajon.hidden) return;
    if (e.key === "Escape") cerrarCajon();
    if (e.key === "Tab") { // mantiene el foco dentro del cajón
      const f = [...cajon.querySelectorAll("button:not([disabled]),a[href],input")].filter(x => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  $("#cajon-edad").addEventListener("change", pintarCarro);
  $("#cajon-vaciar").addEventListener("click", () => { carro = {}; guardar(); pintarCarro(); avisar("Vaciaste el carro."); });
  $("#cajon-pagar").addEventListener("click", () => avisar("En la tienda real, aquí sigue el pago de Jumpseller."));

  // La foto del producto sale de la placa, sube en arco y cae dentro del carro.
  function volarAlCarro(boton) {
    const foto = boton.closest(".placa")?.querySelector(".placa__foto img");
    const destino = btnCarro.getBoundingClientRect();
    if (reduce || !foto || !destino.width || !document.body.animate) return Promise.resolve();
    const o = foto.getBoundingClientRect(), lado = Math.min(o.width * .8, 150);
    const x0 = o.left + o.width / 2 - lado / 2, y0 = o.top + o.height / 2 - lado / 2;
    const dx = destino.left + destino.width / 2 - (x0 + lado / 2), dy = destino.top + destino.height / 2 - (y0 + lado / 2);
    const capa = document.createElement("div"), img = new Image();
    capa.className = "vuelo"; capa.setAttribute("aria-hidden", "true");
    capa.style.cssText = `left:${x0}px;top:${y0}px;width:${lado}px;height:${lado}px`;
    img.src = foto.currentSrc || foto.src; img.alt = "";
    capa.append(img); document.body.append(capa);
    const dur = 820, alto = Math.min(170, Math.max(70, Math.abs(dx) * .18));
    capa.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dx}px)` }],
      { duration: dur, easing: "cubic-bezier(.45,.05,.6,1)", fill: "forwards" });
    const vuelo = img.animate([
      { transform: "translateY(0) scale(1) rotate(0deg)", easing: "cubic-bezier(.2,.75,.4,1)" },
      { transform: `translateY(${-alto}px) scale(.62) rotate(-10deg)`, offset: .38, easing: "cubic-bezier(.55,0,.85,.5)" },
      { transform: `translateY(${dy}px) scale(.14) rotate(18deg)`, opacity: .85 }
    ], { duration: dur, fill: "forwards" });
    // Si el navegador frena la animación (pestaña en segundo plano), el carro igual se actualiza.
    const listo = Promise.race([vuelo.finished, new Promise(r => setTimeout(r, dur + 250))]);
    return listo.then(() => capa.remove(), () => capa.remove());
  }

  document.addEventListener("click", e => {
    const a = e.target.closest("[data-agrega]"), v = e.target.closest("[data-avisa]");
    if (a) {
      const s = a.dataset.agrega, p = porSlug[s];
      if ((carro[s] || 0) >= p.stock) { avisar("No hay más stock de " + p.nombre + " en el local."); return; }
      carro[s] = (carro[s] || 0) + 1; guardar();
      a.classList.add("agregado"); a.textContent = "Agregado";
      setTimeout(() => { a.classList.remove("agregado"); a.textContent = "Agregar"; }, 1400);
      volarAlCarro(a).then(() => {
        pintarCarro();
        btnCarro.classList.remove("pulso"); void btnCarro.offsetWidth; btnCarro.classList.add("pulso");
        avisar(p.nombre + " quedó en tu carro.");
      });
    }
    if (v) avisar("Te avisaremos cuando " + porSlug[v.dataset.avisa].nombre + " vuelva al local.");
  });
  pintarCarro();

  /* ---------- Menú en celular ---------- */
  const menuBtn = $("#menu-btn"), nav = $("#nav");
  menuBtn.addEventListener("click", () => {
    const abierto = nav.classList.toggle("abierto");
    menuBtn.setAttribute("aria-expanded", abierto);
    menuBtn.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
  });
  nav.addEventListener("click", e => { if (e.target.closest("a")) { nav.classList.remove("abierto"); menuBtn.setAttribute("aria-expanded", "false"); } });

  /* ---------- Marcas: cinta de logos y cinta de nombres; cada una abre el catálogo filtrado ---------- */
  const claveMarca = s => plano(s).replace(/\s+amsterdam$/, "").replace(/^clippers$/, "clipper").trim();
  const marcasCat = new Map();
  catalogo.forEach(p => {
    const k = claveMarca(p.marca); if (!k) return;
    const m = marcasCat.get(k) || { n: 0, nombres: {} };
    m.n++; m.nombres[p.marca] = (m.nombres[p.marca] || 0) + 1; marcasCat.set(k, m);
  });
  const nombreMarca = k => Object.entries(marcasCat.get(k)?.nombres || { [k]: 1 }).sort((a, b) => b[1] - a[1])[0][0];
  const cuenta = n => n + (n === 1 ? " producto" : " productos");

  const filaLogos = $("#marcas-logos"), filaFotos = $("#marcas-nombres");
  if (filaLogos) {
    const LOGOS = [["raw", "raw.webp", "RAW"], ["the bulldog", "bulldog.webp", "The Bulldog Amsterdam"],
      ["lion rolling circus", "lion-rolling-circus.webp", "Lion Rolling Circus"], ["elements", "elements.webp", "Elements"],
      ["soulblime", "soulblime.webp", "Soulblime"]];
    const conLogo = new Set(LOGOS.map(l => l[0]));
    const teja = (k, img, nombre, foto) => `<li><a class="marca${foto ? " marca--foto" : ""}" href="catalogo.html?marca=${encodeURIComponent(k)}">
        <span class="marca__img"><img src="${img}" alt="${foto ? "" : esc(nombre)}" width="${foto ? 600 : 576}" height="${foto ? 600 : 324}"></span>
        ${foto ? `<span class="marca__nombre">${esc(nombre)}</span>` : ""}</a></li>`;
    const logos = LOGOS.map(([k, img, nombre]) => teja(k, "assets/marcas/" + img, nombre, false));
    // Las marcas sin logo se muestran con su producto con más stock. Sin semillas en la portada (ver docs/legal.md).
    const fotos = [...marcasCat.entries()].filter(([k]) => !conLogo.has(k)).sort((a, b) => b[1].n - a[1].n).slice(0, 16)
      .map(([k]) => {
        const p = catalogo.filter(x => claveMarca(x.marca) === k && x.img.startsWith("http") && x.sub !== "Semillas")
          .sort((a, b) => (enStock(b) - enStock(a)) || (Math.min(b.stock, 999) - Math.min(a.stock, 999)))[0];
        return p && teja(k, p.img, nombreMarca(k), true);
      }).filter(Boolean);
    // Se repite hasta cubrir la pantalla y luego se duplica, así la cinta corre sin cortes. Las copias no se leen ni se enfocan.
    const llenar = (ul, items, anchoTeja) => {
      const veces = Math.max(1, Math.ceil(1.15 * Math.max(innerWidth, 1280) / (items.length * anchoTeja)));
      const copias = Array(veces * 2 - 1).fill(items).flat().join("")
        .replace(/<li>/g, '<li aria-hidden="true">').replace(/<a /g, '<a tabindex="-1" ');
      ul.innerHTML = items.join("") + copias;
    };
    llenar(filaLogos, logos, 340);
    llenar(filaFotos, fotos, 260);

    // Cada cinta avanza sola, se detiene con el puntero encima y las flechas la adelantan o retroceden un par de marcas.
    const cintas = [filaLogos, filaFotos].map(ul => ({ ul, x: 0, pendiente: 0, vel: +ul.dataset.vel, quieta: false, pista: ul.closest(".marcas__pista") }));
    cintas.forEach(c => {
      // Deslizar con el dedo: la cinta sigue al dedo y al soltar sigue un poco por inercia. Si hubo arrastre, el toque no abre la marca.
      const ventana = c.ul.parentElement;
      let toque = null;
      ventana.addEventListener("pointerdown", e => {
        if (e.button > 0) return;
        toque = { id: e.pointerId, x: e.clientX, y: e.clientY, ult: e.clientX, t: performance.now(), vel: 0, movio: false };
        c.quieta = true; c.pendiente = 0;
      });
      ventana.addEventListener("pointermove", e => {
        if (!toque || e.pointerId !== toque.id) return;
        const dx = e.clientX - toque.ult, ahora = performance.now();
        if (!toque.movio) {
          if (Math.abs(e.clientX - toque.x) < 6) return;
          if (Math.abs(e.clientY - toque.y) > Math.abs(e.clientX - toque.x)) { toque = null; c.quieta = false; return; } // era scroll vertical
          toque.movio = true; ventana.setPointerCapture(e.pointerId); ventana.classList.add("arrastrando");
        }
        c.x += dx;
        toque.vel = dx / Math.max(8, ahora - toque.t) * 1000; toque.ult = e.clientX; toque.t = ahora;
        if (!enMarcha) mover(performance.now());
      });
      const soltar = e => {
        if (!toque || e.pointerId !== toque.id) return;
        if (toque.movio) {
          c.pendiente = Math.max(-1600, Math.min(1600, toque.vel * .28));
          ventana.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); }, { capture: true, once: true });
          setTimeout(() => { c.quieta = e.pointerType === "mouse" && ventana.matches(":hover"); }, 0);
        } else c.quieta = e.pointerType === "mouse";
        ventana.classList.remove("arrastrando");
        toque = null;
        if (!enMarcha) mover(performance.now());
      };
      ventana.addEventListener("pointerup", soltar);
      ventana.addEventListener("pointercancel", soltar);
      c.pista.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") c.quieta = true; });
      c.pista.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") c.quieta = false; });
      c.pista.addEventListener("focusin", () => { c.quieta = true; });
      c.pista.addEventListener("focusout", () => { c.quieta = false; });
      c.pista.querySelectorAll("[data-mover]").forEach(b => b.addEventListener("click", () => {
        const li = c.ul.firstElementChild, paso = li ? li.offsetWidth + parseFloat(getComputedStyle(c.ul).columnGap || 0) : 300;
        c.pendiente -= +b.dataset.mover * paso * 2;
        if (!enMarcha) mover(performance.now());
      }));
    });
    let enMarcha = false, tCinta = performance.now(), cintaVisible = true;
    function mover(t) {
      const dt = Math.min(.05, (t - tCinta) / 1000); tCinta = t;
      let sigue = false;
      cintas.forEach(c => {
        const mitad = (c.ul.scrollWidth + (parseFloat(getComputedStyle(c.ul).columnGap) || 0)) / 2;
        if (!mitad) return;
        const paso = c.pendiente * Math.min(1, dt * 7);
        c.x += paso; c.pendiente -= paso;
        if (!reduce && !c.quieta) c.x += c.vel * dt;
        c.x = ((c.x % mitad) - mitad) % mitad;
        c.ul.style.transform = `translate3d(${c.x}px,0,0)`;
        if (Math.abs(c.pendiente) > .5) sigue = true;
      });
      enMarcha = (!reduce && cintaVisible) || sigue;
      if (enMarcha) requestAnimationFrame(mover);
    }
    new IntersectionObserver(([e]) => {
      cintaVisible = e.isIntersecting;
      if (cintaVisible && !enMarcha) { tCinta = performance.now(); enMarcha = true; requestAnimationFrame(mover); }
    }).observe($("#marcas"));
  }

  /* ---------- Reseñas: carrusel con foto (o ícono si no hay), estrellas y quién opinó ---------- */
  const rielResenas = $("#riel-resenas");
  if (rielResenas) {
    // Reseñas reales de lyonmarket.cl. "foto": la que suba el cliente; si no hay, se muestra el ícono de usuario.
    const RESENAS = [
      { autor: "Johanna M.", fecha: "22/01/2024", estrellas: 5, producto: "Cenicero Portátil",
        texto: "Súper buenos. No sale olor y son muy prácticos. La comunicación con Lyon Market fue muy fácil y los productos llegaron al día siguiente de haberlos comprado. Lo recomiendo." },
      { autor: "Castiel Q.", fecha: "30/12/2024", estrellas: 5, producto: "Nexpod Sabores 5.000 Puffs" },
      { autor: "Matías I.", fecha: "27/04/2024", estrellas: 5, producto: "Pipa Pyrex" },
      { autor: "Nicole Q.", fecha: "16/10/2023", estrellas: 5, producto: "Bolso Anti Olor Mediano" },
      { autor: "Bruno M.", fecha: "25/06/2023", estrellas: 5, producto: "Cenicero Metálico" },
      { autor: "Matías I.", fecha: "27/04/2024", estrellas: 5, producto: "Bolsa de Rejillas Pyrex (5u)" }
    ];
    const estrella = llena => `<svg viewBox="0 0 24 24"${llena ? ' class="llena"' : ""} aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z"/></svg>`;
    const icono = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.4-3.6 4.2-5.3 7.5-5.3s6.1 1.7 7.5 5.3"/></svg>`;
    rielResenas.innerHTML = RESENAS.map(r => `<li><article class="resena">
        <header class="resena__quien">
          <span class="resena__avatar">${r.foto ? `<img src="${r.foto}" alt="" loading="lazy" width="96" height="96">` : icono}</span>
          <span><b>${esc(r.autor)}</b><small>${r.fecha} · Compra verificada</small></span>
        </header>
        <p class="estrellas" role="img" aria-label="${r.estrellas} de 5 estrellas">${[1, 2, 3, 4, 5].map(n => estrella(n <= r.estrellas)).join("")}</p>
        <p class="resena__texto${r.texto ? "" : " resena__texto--corta"}">${r.texto ? "“" + esc(r.texto) + "”" : "Le puso " + r.estrellas + " estrellas a su compra."}</p>
        <p class="resena__pie">Compró <a href="catalogo.html?q=${encodeURIComponent(r.producto)}">${esc(r.producto)}</a></p>
      </article></li>`).join("");
  }

  /* ---------- Página de categoría: grilla con filtros ---------- */
  const grilla = $("#grilla");
  if (grilla) {
    const TEXTOS = {
      "": ["Catálogo completo", "Todo lo que hay en Freire 659, con el mismo precio, stock y código del mostrador."],
      tabaqueria: ["Tabaquería", "Tabaco, papelillos, filtros, blunts, boquillas y encendedores."],
      smokeshop: ["Smokeshop", "Bongs, pipas, moledores, ceniceros y accesorios para guardar y transportar."],
      vaporizadores: ["Vaporizadores", "Desechables, recargables, pods, baterías y líquidos, con su capacidad y contenido de nicotina a la vista."],
      growshop: ["Growshop", "Sustratos, macetas, fertilizantes e insumos para cultivo indoor y exterior."]
    };
    const PRECIOS = [["0-5000", "Hasta $5.000"], ["5000-15000", "$5.000 a $15.000"], ["15000-30000", "$15.000 a $30.000"], ["30000-", "Más de $30.000"]];
    const POR_PAGINA = 24;
    const url = new URLSearchParams(location.search);
    const st = {
      c: CAT_NOMBRE[url.get("c")] ? url.get("c") : "",
      q: url.get("q") || "",
      sub: new Set(url.getAll("sub")),
      marca: new Set(url.getAll("marca").map(claveMarca)),
      stock: url.get("stock") === "1",
      precio: PRECIOS.some(p => p[0] === url.get("precio")) ? url.get("precio") : "",
      orden: url.get("orden") || "destacados",
      n: POR_PAGINA,
      todasMarcas: false
    };

    const enPrecio = (p, r) => { if (!r) return true; const [a, b] = r.split("-").map(Number); return p.precio >= a && (!b || p.precio < b); };
    // Cada filtro cuenta sus opciones con los demás filtros aplicados, así nunca ofrece algo que deja la grilla vacía sin avisar.
    function pasa(p, salvo) {
      if (st.c && p.c !== st.c) return false;
      if (st.q) { const q = plano(st.q); if (!plano(p.nombre + " " + p.marca + " " + p.sub + " " + p.sku).includes(q)) return false; }
      if (salvo !== "stock" && st.stock && !enStock(p)) return false;
      if (salvo !== "sub" && st.sub.size && !st.sub.has(p.sub)) return false;
      if (salvo !== "marca" && st.marca.size && !st.marca.has(claveMarca(p.marca))) return false;
      if (salvo !== "precio" && !enPrecio(p, st.precio)) return false;
      return true;
    }
    const contar = (salvo, llave) => catalogo.filter(p => pasa(p, salvo)).reduce((m, p) => { const k = llave(p); if (k) m.set(k, (m.get(k) || 0) + 1); return m; }, new Map());
    const ORDEN = {
      destacados: (a, b) => (enStock(b) - enStock(a)) || ((b.curado || 0) - (a.curado || 0)) || (Math.min(b.stock, 999) - Math.min(a.stock, 999)),
      nuevos: (a, b) => (enStock(b) - enStock(a)) || String(b.fecha).localeCompare(String(a.fecha)),
      "precio-asc": (a, b) => a.precio - b.precio,
      "precio-desc": (a, b) => b.precio - a.precio,
      nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es")
    };

    function guardarUrl() {
      const u = new URLSearchParams();
      if (st.c) u.set("c", st.c);
      if (st.q) u.set("q", st.q);
      st.sub.forEach(s => u.append("sub", s));
      st.marca.forEach(m => u.append("marca", m));
      if (st.stock) u.set("stock", "1");
      if (st.precio) u.set("precio", st.precio);
      if (st.orden !== "destacados") u.set("orden", st.orden);
      history.replaceState(null, "", "catalogo.html" + (u.toString() ? "?" + u : ""));
    }

    const casilla = (nombre, valor, texto, n, marcada) =>
      `<label class="casilla${n ? "" : " casilla--vacia"}"><input type="checkbox" name="${nombre}" value="${esc(valor)}"${marcada ? " checked" : ""}${!n && !marcada ? " disabled" : ""}><span>${esc(texto)}</span><small>${n}</small></label>`;

    function pintarFiltros() {
      // Pestañas
      const porCat = catalogo.reduce((m, p) => (m[p.c] = (m[p.c] || 0) + 1, m), {});
      $("#pestanas").innerHTML = [["", "Todo", catalogo.length], ...Object.keys(CAT_NOMBRE).map(c => [c, TEXTOS[c][0], porCat[c] || 0])]
        .map(([c, n, k]) => `<li><a href="catalogo.html${c ? "?c=" + c : ""}" data-cat="${c}"${c === st.c ? ' aria-current="page"' : ""}>${n}<small>${k}</small></a></li>`).join("");
      const actual = $("#pestanas [aria-current]"), barra = $(".pestanas");
      if (actual) barra.scrollLeft = actual.offsetLeft - (barra.clientWidth - actual.offsetWidth) / 2;
      // Tipo (solo dentro de una categoría)
      const subs = contar("sub", p => p.sub);
      $("#f-sub-caja").hidden = !st.c;
      const todosSub = [...new Set(catalogo.filter(p => p.c === st.c && p.sub).map(p => p.sub))].sort((a, b) => a.localeCompare(b, "es"));
      $("#f-sub").innerHTML = todosSub.map(s => casilla("sub", s, s, subs.get(s) || 0, st.sub.has(s))).join("");
      // Precio
      const precios = new Map(PRECIOS.map(([r]) => [r, catalogo.filter(p => pasa(p, "precio") && enPrecio(p, r)).length]));
      $("#f-precio").innerHTML = PRECIOS.map(([r, t]) =>
        `<button type="button" class="chip" data-precio="${r}" aria-pressed="${st.precio === r}"${!precios.get(r) && st.precio !== r ? " disabled" : ""}>${t}<small>${precios.get(r)}</small></button>`).join("");
      // Marcas: las con más productos primero; las marcadas siempre a la vista
      const marcas = contar("marca", p => claveMarca(p.marca));
      const qm = plano($("#f-marca-q").value);
      let lista = [...marcas.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      st.marca.forEach(k => { if (!marcas.has(k)) lista.unshift([k, 0]); });
      if (qm) lista = lista.filter(([k]) => k.includes(qm));
      const corta = !qm && !st.todasMarcas && lista.length > 8;
      const visibles = corta ? lista.filter(([k], i) => i < 8 || st.marca.has(k)) : lista;
      $("#f-marca").innerHTML = visibles.map(([k, n]) => casilla("marca", k, nombreMarca(k), n, st.marca.has(k))).join("")
        || `<p class="filtro__nada">No hay marcas con ese nombre aquí.</p>`;
      const mas = $("#f-marca-mas");
      mas.hidden = qm || lista.length <= 8;
      mas.textContent = st.todasMarcas ? "Ver menos marcas" : `Ver las ${lista.length} marcas`;
      mas.setAttribute("aria-expanded", st.todasMarcas);
      $("#f-stock").checked = st.stock;
    }

    function pintarActivos() {
      const chips = [];
      if (st.q) chips.push(["q", "", `“${st.q}”`]);
      if (st.stock) chips.push(["stock", "", "Con stock"]);
      st.sub.forEach(s => chips.push(["sub", s, s]));
      st.marca.forEach(m => chips.push(["marca", m, nombreMarca(m)]));
      if (st.precio) chips.push(["precio", "", PRECIOS.find(p => p[0] === st.precio)[1]]);
      $("#activos").innerHTML = chips.map(([t, v, txt]) =>
        `<li><button type="button" class="activo" data-quita="${t}" data-valor="${esc(v)}" aria-label="Quitar filtro ${esc(txt)}">${esc(txt)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg></button></li>`).join("")
        + (chips.length > 1 ? `<li><button type="button" class="activo activo--todos" data-quita="todo">Limpiar todo</button></li>` : "");
      const n = chips.length - (st.q ? 1 : 0);
      $("#filtros-n").hidden = !n; $("#filtros-n").textContent = n;
    }

    function pintar(animar) {
      const [titulo, bajada] = TEXTOS[st.c];
      $("#cat-titulo").textContent = titulo;
      $("#cat-bajada").textContent = bajada;
      $("#miga-actual").textContent = st.c ? titulo : "Catálogo";
      document.title = titulo + " · Lyon Market";
      document.querySelectorAll("#nav a").forEach(a => a.toggleAttribute("aria-current", a.search === "?c=" + st.c && !!st.c));
      const aviso18 = $("#cat-advertencia");
      aviso18.hidden = st.c === "growshop";
      aviso18.textContent = "Venta exclusiva para mayores de 18 años." +
        (st.c === "vaporizadores" || !st.c ? " Los sistemas electrónicos de administración de nicotina son potencialmente adictivos." : "");
      pintarFiltros(); pintarActivos();

      const res = catalogo.filter(p => pasa(p)).sort(ORDEN[st.orden] || ORDEN.destacados);
      $("#res-cuenta").textContent = cuenta(res.length);
      $("#f-ver").textContent = res.length ? "Ver " + cuenta(res.length) : "Sin resultados";
      $("#cat-vacio").hidden = res.length > 0;
      const desde = animar === "mas" ? grilla.children.length : 0;
      if (desde === 0) grilla.replaceChildren();
      res.slice(desde, st.n).forEach((p, i) => {
        const li = placa(p);
        if (!reduce) li.style.setProperty("--i", Math.min(i, 12));
        li.classList.add("entra");
        grilla.append(li);
      });
      const ver = $("#ver-mas");
      ver.hidden = res.length <= st.n;
      ver.textContent = `Ver más productos (${res.length - Math.min(st.n, res.length)} más)`;
      guardarUrl();
    }

    // Eventos de los filtros
    const form = $("#form-filtros");
    form.addEventListener("change", e => {
      const t = e.target;
      if (t.name === "stock") st.stock = t.checked;
      if (t.name === "sub") t.checked ? st.sub.add(t.value) : st.sub.delete(t.value);
      if (t.name === "marca") t.checked ? st.marca.add(t.value) : st.marca.delete(t.value);
      st.n = POR_PAGINA; pintar();
    });
    form.addEventListener("click", e => {
      const ch = e.target.closest("[data-precio]");
      if (ch) { st.precio = st.precio === ch.dataset.precio ? "" : ch.dataset.precio; st.n = POR_PAGINA; pintar(); }
    });
    $("#f-marca-q").addEventListener("input", pintarFiltros);
    $("#f-marca-mas").addEventListener("click", () => { st.todasMarcas = !st.todasMarcas; pintarFiltros(); });
    const limpiar = () => { st.q = ""; $("#q").value = ""; st.sub.clear(); st.marca.clear(); st.stock = false; st.precio = ""; st.n = POR_PAGINA; $("#f-marca-q").value = ""; pintar(); };
    $("#f-limpiar").addEventListener("click", limpiar);
    $("#vacio-limpiar").addEventListener("click", limpiar);
    $("#activos").addEventListener("click", e => {
      const b = e.target.closest("[data-quita]"); if (!b) return;
      const { quita, valor } = b.dataset;
      if (quita === "todo") return limpiar();
      if (quita === "q") { st.q = ""; $("#q").value = ""; }
      if (quita === "stock") st.stock = false;
      if (quita === "precio") st.precio = "";
      if (quita === "sub") st.sub.delete(valor);
      if (quita === "marca") st.marca.delete(valor);
      st.n = POR_PAGINA; pintar();
    });
    $("#orden").value = ORDEN[st.orden] ? st.orden : "destacados";
    $("#orden").addEventListener("change", e => { st.orden = e.target.value; st.n = POR_PAGINA; pintar(); });
    $("#ver-mas").addEventListener("click", () => { st.n += POR_PAGINA; pintar("mas"); });
    // Las pestañas y el menú cambian de categoría sin recargar
    document.addEventListener("click", e => {
      const a = e.target.closest("#pestanas a, #nav a[href^='catalogo.html']");
      if (!a || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      st.c = new URLSearchParams(a.search).get("c") || ""; st.sub.clear(); st.n = POR_PAGINA;
      pintar();
      $(".cat__cabeza").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
    // El buscador de la cabecera filtra aquí mismo
    const q = $("#q");
    q.value = st.q;
    let tq;
    // La búsqueda de la cabecera recorre toda la tienda, no solo la categoría abierta.
    const buscar = () => { st.q = q.value.trim(); if (st.q) { st.c = ""; st.sub.clear(); } st.n = POR_PAGINA; pintar(); };
    q.addEventListener("input", () => { clearTimeout(tq); tq = setTimeout(buscar, 220); });
    q.form.addEventListener("submit", e => { e.preventDefault(); clearTimeout(tq); buscar(); });

    // Filtros en celular: panel lateral
    const filtros = $("#filtros");
    const abrirFiltros = () => { filtros.classList.add("abierto"); document.body.style.overflow = "hidden"; $(".filtros__cerrar").focus(); };
    const cerrarFiltros = () => { filtros.classList.remove("abierto"); document.body.style.overflow = ""; };
    $("#abrir-filtros").addEventListener("click", abrirFiltros);
    filtros.addEventListener("click", e => { if (e.target.closest("[data-cerrar-filtros]")) cerrarFiltros(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && filtros.classList.contains("abierto")) cerrarFiltros(); });

    pintar();
  }

  /* ---------- Portada: pin metálico del león, flotando bajo la lámpara ---------- */
  const portada = $(".portada"), canvas = $("#lienzo");
  if (!portada) return;
  let gl = null;
  try { gl = window.THREE && window.LYON_PIN && (canvas.getContext("webgl2") || canvas.getContext("webgl")); } catch (_) {}
  if (!gl) { portada.classList.add("sin-3d"); return; }

  const T = window.THREE;
  const renderer = new T.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: true, premultipliedAlpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.autoClear = false;

  // Humo ámbar que el puntero empuja: nube espesa y hebras que suben, siempre por detrás del pin.
  const humoCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const humoUni = {
    uRes: { value: new T.Vector2(1, 1) }, uTime: { value: 0 }, uMouse: { value: new T.Vector2(.7, .5) },
    uPush: { value: 0 }, uLamp: { value: reduce ? 1 : .1 }, uCenter: { value: new T.Vector2(.7, .55) }
  };
  const capaHumo = delante => {
    const escena = new T.Scene();
    escena.add(new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({
      uniforms: { ...humoUni, uCapa: { value: delante ? 1 : 0 } }, transparent: true, depthWrite: false, depthTest: false,
      vertexShader: "void main(){gl_Position=vec4(position,1.0);}",
      fragmentShader: `
        precision highp float;
        uniform vec2 uRes,uMouse,uCenter; uniform float uTime,uPush,uLamp,uCapa;
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
          return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
        float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
        void main(){
          float k=uRes.x/uRes.y; vec2 uv=gl_FragCoord.xy/uRes; vec2 p=uv; p.x*=k;
          vec2 m=uMouse; m.x*=k; vec2 c=uCenter; c.x*=k;
          vec2 d=p-m; float r=length(d);
          p+=d/(r+1e-3)*exp(-r*r*12.)*uPush*.3;
          float t=uTime*.075+uCapa*13.;
          vec2 q=vec2(fbm(p*1.4+vec2(0.,-t*2.4)),fbm(p*1.4+vec2(5.2,1.3)-t));
          float nube=fbm(p*1.2+q*2.1+vec2(t*.6,-t*2.));
          // Hebras: ruido estirado en vertical que sube desde abajo.
          float hebra=fbm(vec2(p.x*2.4,p.y*.7-t*2.6)+q*1.6);
          float sube=smoothstep(1.05,.05,uv.y);
          float lamp=exp(-length((p-c)*vec2(1.,.75))*1.35);
          float a;
          if(uCapa<.5){
            a=smoothstep(.32,.9,nube)*(.24+lamp*1.55)+smoothstep(.52,.82,hebra)*sube*(.22+lamp*1.1);
          }else{
            a=smoothstep(.6,.88,hebra)*sube*lamp*.75+smoothstep(.6,.95,nube)*lamp*.18;
          }
          a=min(a*uLamp,.82);
          vec3 calido=mix(vec3(.55,.08,.02),vec3(1.,.68,.18),uLamp);
          gl_FragColor=vec4(mix(calido*.65,calido*1.05,clamp(nube*lamp*1.5,0.,1.))*a,a);
        }`
    })));
    return escena;
  };
  const humoAtras = capaHumo(false);

  // El pin: aro de metal dorado extruido, cara esmaltada con brillo que la recorre, reverso grabado.
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(30, 1, .1, 50);
  cam.position.set(0, 0, 9);
  scene.add(new T.AmbientLight(0xffd9a0, .55));
  const sol = new T.DirectionalLight(0xffc060, 1.1); sol.position.set(2, 3, 5); scene.add(sol);
  const pin = new T.Group(), giro = new T.Group();
  giro.add(pin); scene.add(giro);
  const capasLuz = [];

  const cargador = new T.TextureLoader();
  let pendientes = 2, listo = false;
  const alCargar = () => { if (--pendientes === 0) { listo = true; armarReverso(); if (reduce) dibujar(0); } };
  const texFrente = cargador.load(window.LYON_PIN.frente, alCargar);
  const texBorde = cargador.load(window.LYON_PIN.borde, alCargar);
  // Los shaders propios usan los valores tal cual (sin conversión de color), así el esmalte conserva los colores del logo.
  [texFrente, texBorde].forEach(t => { t.encoding = T.LinearEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); });

  const brillo = { value: -1 }, luz = { value: 1 };
  const metal = (color, conBrillo) => new T.ShaderMaterial({
    uniforms: { uMap: { value: texBorde }, uColor: { value: new T.Color(color) }, uBrillo: brillo, uLuz: luz, uConBrillo: { value: conBrillo ? 1 : 0 } },
    vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `uniform sampler2D uMap;uniform vec3 uColor;uniform float uBrillo,uLuz,uConBrillo;varying vec2 vUv;
      void main(){float a=texture2D(uMap,vUv).a;if(a<.5)discard;
        float d=vUv.x*.8+vUv.y*.6;float b=exp(-pow((d-uBrillo)*9.,2.))*uConBrillo;
        vec3 c=uColor*uLuz+vec3(1.,.93,.75)*b*1.1;gl_FragColor=vec4(c,1.);}`,
    side: T.DoubleSide
  });
  const esmalte = new T.ShaderMaterial({
    uniforms: { uMap: { value: texFrente }, uBrillo: brillo, uLuz: luz },
    vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `uniform sampler2D uMap;uniform float uBrillo,uLuz;varying vec2 vUv;
      void main(){vec4 t=texture2D(uMap,vUv);if(t.a<.5)discard;
        float d=vUv.x*.8+vUv.y*.6;float b=exp(-pow((d-uBrillo)*7.,2.));
        vec3 c=t.rgb*(.25+.75*uLuz)+vec3(1.,.95,.85)*b*.55;gl_FragColor=vec4(c,1.);}`
  });

  const LADO = 3.3, GROSOR = .26, CAPAS = 26;
  const plano3d = new T.PlaneGeometry(LADO, LADO);
  const bordeOscuro = new T.Color("#7a4a07"), bordeClaro = new T.Color("#e2a531");
  for (let i = 0; i < CAPAS; i++) {
    const f = i / (CAPAS - 1);
    const m = new T.Mesh(plano3d, metal(bordeOscuro.clone().lerp(bordeClaro, Math.sin(f * Math.PI) * .8 + .1), false));
    m.position.z = (f - .5) * GROSOR;
    pin.add(m);
  }
  const aro = new T.Mesh(plano3d, metal("#ffc94f", true)); aro.position.z = GROSOR / 2 + .002; pin.add(aro);
  const cara = new T.Mesh(plano3d, esmalte); cara.position.z = GROSOR / 2 + .01; pin.add(cara);

  // Reverso: metal cepillado con grabado.
  function armarReverso() {
    const S = 512, cv = document.createElement("canvas"); cv.width = cv.height = S;
    const x = cv.getContext("2d");
    x.drawImage(texBorde.image, 0, 0, S, S);
    x.globalCompositeOperation = "source-in";
    const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, "#d79a2a"); g.addColorStop(.5, "#f3c463"); g.addColorStop(1, "#b07a18");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.globalCompositeOperation = "source-atop";
    x.strokeStyle = "rgba(90,55,5,.12)"; x.lineWidth = 1;
    for (let y = 0; y < S; y += 3) { x.beginPath(); x.moveTo(0, y); x.lineTo(S, y + 6); x.stroke(); }
    x.fillStyle = "rgba(85,50,4,.75)"; x.textAlign = "center";
    x.font = "800 44px Bricolage, sans-serif"; x.fillText("LYON MARKET", S / 2, S * .36);
    x.font = "600 22px Hanken, sans-serif"; x.fillText("FREIRE 659 · SAN BERNARDO", S / 2, S * .72);
    x.fillText("DESDE 2018", S / 2, S * .79);
    const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding;
    const rev = new T.Mesh(plano3d, new T.MeshBasicMaterial({ map: t, alphaTest: .5, color: new T.Color(1, 1, 1) }));
    rev.rotation.y = Math.PI; rev.position.z = -GROSOR / 2 - .004; pin.add(rev);
    capasLuz.push(rev.material);
  }

  // Encuadre: en escritorio el pin llena el espacio a la derecha del texto; en el celular va arriba, grande.
  const texto = $(".portada__texto");
  let movil = false, baseY = 0, centroX = .7;
  function encuadre() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    humoUni.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    cam.aspect = w / h; cam.updateProjectionMatrix();
    movil = w < 720;
    const vH = 2 * Math.tan(T.MathUtils.degToRad(cam.fov / 2)) * cam.position.z, vW = vH * cam.aspect;
    if (movil) {
      giro.scale.setScalar(Math.min(1.25, (vH * .9) / LADO, (vW * .9) / LADO));
      baseY = vH * .01; giro.position.set(0, baseY, 0); centroX = .5; humoUni.uCenter.value.set(.5, .55);
      texto.style.maxWidth = ""; portada.style.paddingLeft = "";
    } else {
      // El pin se apoya a la derecha; el texto se centra entre el borde izquierdo y donde empieza el pin de frente.
      const ladoPx = Math.min(h * .86, w * .5), margen = Math.max(18, w * .045);
      const izqPin = w - margen - ladoPx, ancho = Math.min(496, izqPin - 36);
      texto.style.maxWidth = ancho + "px";
      portada.style.paddingLeft = Math.max(18, (izqPin - ancho) / 2) + "px";
      giro.scale.setScalar((ladoPx / h) * vH / LADO);
      centroX = (izqPin + ladoPx / 2) / w;
      baseY = 0; giro.position.set((centroX - .5) * vW, 0, 0); humoUni.uCenter.value.set(centroX, .55);
    }
    portada.style.setProperty("--cx", centroX.toFixed(3));
    if (reduce) dibujar(0);
  }
  new ResizeObserver(encuadre).observe(canvas);
  encuadre();
  document.fonts?.ready.then(encuadre);

  // Interacción: arrastrar para girar (con inercia); el puntero inclina y empuja el humo.
  let anguloY = 0, velY = reduce ? 0 : .35, arrastrando = false, ultX = 0, ultT = 0, inclX = 0, inclObj = 0;
  let ultimo = null;
  const dentroDelPin = e => { const r = canvas.getBoundingClientRect(); return movil || (e.clientX - r.left) / r.width > centroX - .25; };
  portada.addEventListener("pointerdown", e => {
    if (e.target.closest("a,button") || !dentroDelPin(e)) return;
    arrastrando = true; ultX = e.clientX; ultT = performance.now(); velY = 0;
    portada.classList.add("arrastrando");
    portada.setPointerCapture(e.pointerId);
  });
  portada.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width, ny = 1 - (e.clientY - r.top) / r.height;
    humoUni.uMouse.value.set(nx, ny);
    if (ultimo) humoUni.uPush.value = Math.min(1.8, humoUni.uPush.value + Math.hypot(e.clientX - ultimo.x, e.clientY - ultimo.y) / 80);
    ultimo = { x: e.clientX, y: e.clientY };
    inclObj = (ny - .5) * -.5;
    if (arrastrando) {
      const ahora = performance.now(), dx = e.clientX - ultX;
      anguloY += dx * .012;
      velY = (dx * .012) / Math.max(.008, (ahora - ultT) / 1000);
      ultX = e.clientX; ultT = ahora;
    }
  });
  const soltar = () => { if (!arrastrando) return; arrastrando = false; portada.classList.remove("arrastrando"); velY = Math.max(-12, Math.min(12, velY)); };
  portada.addEventListener("pointerup", soltar);
  portada.addEventListener("pointercancel", soltar);
  portada.addEventListener("pointerleave", () => { ultimo = null; inclObj = 0; });

  // Encendido de la lámpara: el sodio parte rojo y tenue y llega al ámbar.
  const t0 = performance.now(), ENCENDIDO = 2400;
  function lampara(t) {
    if (reduce) return 1;
    const x = Math.min(1, (t - t0) / ENCENDIDO);
    const parpadeo = x < .35 ? (Math.sin(x * 90) * .5 + .5) * .35 * (1 - x / .35) : 0;
    return Math.max(.08, 1 - Math.pow(1 - x, 3) - parpadeo);
  }
  portada.classList.add("apagada");
  setTimeout(() => portada.classList.remove("apagada"), reduce ? 0 : 500);

  let tPrev = performance.now();
  function dibujar(t) {
    const dt = Math.min(.05, Math.max(0, (t - tPrev) / 1000)); tPrev = t;
    const L = lampara(t);
    portada.style.setProperty("--lampara", L.toFixed(3));
    humoUni.uLamp.value = L; humoUni.uTime.value = t / 1000; humoUni.uPush.value *= .95;
    luz.value = .3 + .7 * L;
    capasLuz.forEach(m => m.color.setScalar(.3 + .7 * L));

    if (!arrastrando && !reduce) {
      const crucero = .35 + 1.1 * Math.max(0, -Math.cos(anguloY)); // pasa más rápido por el reverso
      velY += (crucero - velY) * Math.min(1, dt * 1.6);   // la inercia vuelve al giro lento
      anguloY += velY * dt;
    }
    inclX += (inclObj - inclX) * .06;
    giro.rotation.x = inclX + (reduce ? 0 : Math.sin(t / 3100) * .06);
    giro.rotation.z = reduce ? 0 : Math.sin(t / 4200) * .05;
    pin.rotation.y = anguloY;
    giro.position.y = baseY + (reduce ? 0 : Math.sin(t / 1900) * .09);
    // El brillo cruza la cara según el ángulo frente a la lámpara, más un barrido lento.
    brillo.value = (Math.cos(anguloY) > 0 ? .55 + Math.sin(anguloY) * .9 : 9) + (reduce ? 0 : Math.sin(t / 2300) * .15);

    renderer.clear();
    renderer.render(humoAtras, humoCam);
    if (listo) renderer.render(scene, cam);
  }

  if (reduce) return;
  let visible = true, raf = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(bucle); }).observe(portada);
  function bucle(t) {
    raf = 0;
    if (!visible || document.hidden) return;
    dibujar(t);
    raf = requestAnimationFrame(bucle);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible && !raf) { tPrev = performance.now(); raf = requestAnimationFrame(bucle); } });
  raf = requestAnimationFrame(bucle);
})();
