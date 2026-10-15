(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clp = n => "$" + Math.round(n).toLocaleString("es-CL");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

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
    $("#dia-estado").textContent = estado;
    $("#dia-ahora").style.setProperty("--p", Math.min(1, Math.max(0, (h + m / 60 - 8) / 14)));
    $("#dia-hora").textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
    document.querySelectorAll("#horario > div").forEach(el =>
      el.classList.toggle("hoy", el.dataset.dias.split(",").map(Number).includes(dia)));
  }
  actualizarReloj();
  setInterval(actualizarReloj, 30000);

  /* ---------- Productos: un carrusel por sección ---------- */
  const datos = window.LYON_DATOS || { productos: [], novedades: [], secciones: {} };
  const porSlug = Object.fromEntries(datos.productos.map(p => [p.slug, p]));
  const listas = {
    novedades: datos.novedades,
    tabaqueria: datos.secciones.Tabaqueria || [],
    smokeshop: datos.secciones.Smokeshop || [],
    vaporizadores: datos.secciones.Vaporizadores || [],
    growshop: datos.secciones.Growshop || []
  };

  function placa(p) {
    const li = document.createElement("li");
    const agotado = p.stock <= 0, vape = p.cat === "Vaporizadores";
    const ops = p.opciones.length ? `<span>${p.opciones.length} ${vape ? "sabores" : "variantes"}</span>` : "";
    li.innerHTML = `
      <article class="placa${agotado ? " placa--agotada" : ""}">
        <div class="placa__foto">
          <img src="${p.img}" alt="${esc(p.nombre)}" loading="lazy" width="600" height="600">
          <span class="placa__codigo" title="Código del local">Cód. ${esc(p.sku)}</span>
        </div>
        <div class="placa__cuerpo">
          ${p.marca ? `<span class="placa__marca">${esc(p.marca)}</span>` : ""}
          <a class="placa__nombre" href="${p.url}" target="_blank" rel="noopener">${esc(p.nombre)}</a>
          <div class="placa__meta"><span class="placa__stock${agotado ? " placa__stock--cero" : ""}">${agotado ? "Sin stock" : p.stock + " en stock"}</span>${ops}</div>
          <div class="placa__pie">
            <span class="placa__precio">${clp(p.precio)}</span>
            ${agotado
              ? `<button class="placa__btn placa__btn--avisa" type="button" data-avisa="${p.slug}">Avísame</button>`
              : `<button class="placa__btn" type="button" data-agrega="${p.slug}">Agregar</button>`}
          </div>
          ${vape ? `<p class="placa__ley">Venta exclusiva para mayores de 18 años.</p>` : ""}
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
          <p class="cajon__precio">${clp(p.precio)} c/u · ${p.stock} en stock</p>
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

  document.addEventListener("click", e => {
    const a = e.target.closest("[data-agrega]"), v = e.target.closest("[data-avisa]");
    if (a) {
      const s = a.dataset.agrega, p = porSlug[s];
      if ((carro[s] || 0) >= p.stock) { avisar("No hay más stock de " + p.nombre + " en el local."); return; }
      carro[s] = (carro[s] || 0) + 1; guardar(); pintarCarro();
      btnCarro.classList.remove("pulso"); void btnCarro.offsetWidth; btnCarro.classList.add("pulso");
      a.classList.add("agregado"); a.textContent = "Agregado";
      setTimeout(() => { a.classList.remove("agregado"); a.textContent = "Agregar"; }, 1400);
      avisar(p.nombre + " quedó en tu carro.");
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

  /* ---------- Marcas (las que la tienda tiene publicadas) ---------- */
  const marcas = ["RAW", "OCB", "Elements", "Clipper", "G-Rollz", "Lion Rolling Circus", "The Bulldog Amsterdam", "Bonglab", "BSF", "Beamer",
    "Biobizz", "Grotek", "Top Crop", "Jiffy", "Kasvi", "Hortilight", "Garden HighPro", "Neptune Hydroponics", "Organic Life", "Wonderland Agronutrients",
    "Sensi Seeds", "Dutch Passion", "Sweet Seeds", "Medical Seeds", "Cannabiogen", "Bless Hemp", "Soulblime", "Dream High", "VDL", "Mi"];
  $("#cinta").innerHTML = marcas.map(m => `<a href="#">${m.replace("-", "‑")}</a>`).join("");

  /* ---------- Portada: pin metálico del león, flotando bajo la lámpara ---------- */
  const portada = $(".portada"), canvas = $("#lienzo");
  let gl = null;
  try { gl = window.THREE && window.LYON_PIN && (canvas.getContext("webgl2") || canvas.getContext("webgl")); } catch (_) {}
  if (!gl) { portada.classList.add("sin-3d"); return; }

  const T = window.THREE;
  const renderer = new T.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: true, premultipliedAlpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.autoClear = false;

  // Humo ámbar que el puntero empuja.
  const humoScene = new T.Scene(), humoCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const humoUni = {
    uRes: { value: new T.Vector2(1, 1) }, uTime: { value: 0 }, uMouse: { value: new T.Vector2(.7, .5) },
    uPush: { value: 0 }, uLamp: { value: reduce ? 1 : .1 }, uCenter: { value: new T.Vector2(.7, .55) }
  };
  humoScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({
    uniforms: humoUni, transparent: true, depthWrite: false,
    vertexShader: "void main(){gl_Position=vec4(position,1.0);}",
    fragmentShader: `
      precision highp float;
      uniform vec2 uRes,uMouse,uCenter; uniform float uTime,uPush,uLamp;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
        return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
      void main(){
        float k=uRes.x/uRes.y; vec2 p=gl_FragCoord.xy/uRes; p.x*=k;
        vec2 m=uMouse; m.x*=k; vec2 c=uCenter; c.x*=k;
        vec2 d=p-m; float r=length(d);
        p+=d/(r+1e-3)*exp(-r*r*14.)*uPush*.22;
        float t=uTime*.045;
        vec2 q=vec2(fbm(p*1.5+vec2(0.,-t*2.2)),fbm(p*1.5+vec2(5.2,1.3)-t));
        float s=fbm(p*1.25+q*1.9+vec2(t*.5,-t*1.6));
        float lamp=exp(-length((p-c)*vec2(1.,.8))*1.7);
        float a=smoothstep(.36,.95,s)*(.16+lamp*1.2)*uLamp*.8;
        vec3 calido=mix(vec3(.55,.08,.02),vec3(1.,.66,.16),uLamp);
        gl_FragColor=vec4(mix(calido*.7,calido,s*lamp*1.4)*a,a);
      }`
  })));

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
  const plano = new T.PlaneGeometry(LADO, LADO);
  const bordeOscuro = new T.Color("#7a4a07"), bordeClaro = new T.Color("#e2a531");
  for (let i = 0; i < CAPAS; i++) {
    const f = i / (CAPAS - 1);
    const m = new T.Mesh(plano, metal(bordeOscuro.clone().lerp(bordeClaro, Math.sin(f * Math.PI) * .8 + .1), false));
    m.position.z = (f - .5) * GROSOR;
    pin.add(m);
  }
  const aro = new T.Mesh(plano, metal("#ffc94f", true)); aro.position.z = GROSOR / 2 + .002; pin.add(aro);
  const cara = new T.Mesh(plano, esmalte); cara.position.z = GROSOR / 2 + .01; pin.add(cara);

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
    const rev = new T.Mesh(plano, new T.MeshBasicMaterial({ map: t, alphaTest: .5, color: new T.Color(1, 1, 1) }));
    rev.rotation.y = Math.PI; rev.position.z = -GROSOR / 2 - .004; pin.add(rev);
    capasLuz.push(rev.material);
  }

  // Encuadre según el ancho.
  let movil = false, baseY = 0;
  function encuadre() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    humoUni.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    cam.aspect = w / h; cam.updateProjectionMatrix();
    movil = w < 720;
    const vH = 2 * Math.tan(T.MathUtils.degToRad(cam.fov / 2)) * cam.position.z, vW = vH * cam.aspect;
    if (movil) {
      giro.scale.setScalar(Math.min(1, (vH * .78) / LADO, (vW * .78) / LADO));
      baseY = vH * .02; giro.position.set(0, baseY, 0); humoUni.uCenter.value.set(.5, .55);
    } else {
      giro.scale.setScalar(Math.min(1.6, (vH * .92) / LADO, (vW * .5) / LADO));
      baseY = 0; giro.position.set(vW * .22, 0, 0); humoUni.uCenter.value.set(.72, .55);
    }
    if (reduce) dibujar(0);
  }
  new ResizeObserver(encuadre).observe(canvas);
  encuadre();

  // Interacción: arrastrar para girar (con inercia); el puntero inclina y empuja el humo.
  let anguloY = 0, velY = reduce ? 0 : .35, arrastrando = false, ultX = 0, ultT = 0, inclX = 0, inclObj = 0;
  let ultimo = null;
  const dentroDelPin = e => { const r = canvas.getBoundingClientRect(); return movil || (e.clientX - r.left) / r.width > .45; };
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
    if (ultimo) humoUni.uPush.value = Math.min(1.6, humoUni.uPush.value + Math.hypot(e.clientX - ultimo.x, e.clientY - ultimo.y) / 90);
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
    humoUni.uLamp.value = L; humoUni.uTime.value = t / 1000; humoUni.uPush.value *= .94;
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
    renderer.render(humoScene, humoCam);
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
