const API = "/api/products";
const KEY = "ofertaradar-admin";

const $ = (id) => document.getElementById(id);
const loginView = $("login");
const appView = $("app");
const rowsEl = $("rows");
const flash = $("flash");
const editor = $("editor");
const form = $("product-form");

let password = sessionStorage.getItem(KEY) || "";
let products = [];
let editingId = null;

async function api(path = "", options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${password}`, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { logout(); throw new Error(data.error || "Sesión caducada."); }
  if (!res.ok) throw new Error(data.error || "Algo salió mal.");
  return data;
}

function notify(msg, isError = false) {
  flash.textContent = msg;
  flash.classList.toggle("err", isError);
  clearTimeout(notify.t);
  notify.t = setTimeout(() => (flash.textContent = ""), 4000);
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
}

function button(label, onClick, cls = "", disabled = false) {
  const b = el("button", { type: "button", className: `btn sm ${cls}`, textContent: label, disabled });
  b.addEventListener("click", onClick);
  return b;
}

function render() {
  if (!products.length) {
    rowsEl.replaceChildren(el("tr", {}, el("td", { colSpan: 6, className: "empty", textContent: "Aún no hay productos. Pulsa «+ Nuevo producto»." })));
    return;
  }
  rowsEl.replaceChildren(
    ...products.map((p, i) =>
      el("tr", {}, [
        el("td", {}, el("div", { className: "cell-actions" }, [
          button("↑", () => move(p, "up"), "", i === 0),
          button("↓", () => move(p, "down"), "", i === products.length - 1),
        ])),
        el("td", {}, p.image ? el("img", { src: p.image, alt: "", referrerPolicy: "no-referrer" }) : null),
        el("td", { className: "title-cell" }, [
          el("strong", { textContent: p.title }),
          el("small", { textContent: p.url || "⚠ Sin enlace de afiliado" }),
        ]),
        el("td", { textContent: p.price || "—" }),
        el("td", {}, el("span", { className: `pill ${p.published ? "on" : "off"}`, textContent: p.published ? "Publicado" : "Borrador" })),
        el("td", {}, el("div", { className: "cell-actions" }, [
          button("Editar", () => openEditor(p)),
          button(p.published ? "Ocultar" : "Publicar", () => togglePublished(p)),
          button("Eliminar", () => remove(p), "danger"),
        ])),
      ])
    )
  );
}

async function load() {
  products = await api("?all=1");
  render();
}

function openEditor(p = null) {
  editingId = p?.id ?? null;
  $("editor-title").textContent = p ? "Editar producto" : "Nuevo producto";
  $("form-error").textContent = "";
  form.reset();
  if (p) {
    for (const name of ["url", "title", "image", "description", "price", "oldPrice", "badge"]) form.elements[name].value = p[name] || "";
    form.elements.categories.value = p.categories.join(", ");
    form.elements.published.checked = p.published;
  }
  editor.showModal();
}

function payload(p) {
  const { title, url, image, description, price, oldPrice, badge, categories, published } = p;
  return { title, url, image, description, price, oldPrice, badge, categories, published };
}

async function togglePublished(p) {
  try {
    await api(`/${p.id}`, { method: "PUT", body: JSON.stringify({ ...payload(p), published: !p.published }) });
    notify(p.published ? "Producto ocultado." : "Producto publicado.");
    await load();
  } catch (e) { notify(e.message, true); }
}

async function remove(p) {
  if (!confirm(`¿Eliminar «${p.title}»? Esta acción no se puede deshacer.`)) return;
  try {
    await api(`/${p.id}`, { method: "DELETE" });
    notify("Producto eliminado.");
    await load();
  } catch (e) { notify(e.message, true); }
}

async function move(p, direction) {
  try {
    await api(`/${p.id}/move`, { method: "POST", body: JSON.stringify({ direction }) });
    await load();
  } catch (e) { notify(e.message, true); }
}

function logout() {
  password = "";
  sessionStorage.removeItem(KEY);
  appView.hidden = true;
  loginView.hidden = false;
}

async function enter() {
  try {
    await load();
    sessionStorage.setItem(KEY, password);
    loginView.hidden = true;
    appView.hidden = false;
  } catch (e) {
    $("login-error").textContent = e.message;
  }
}

$("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  $("login-error").textContent = "";
  password = $("password").value;
  enter();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = form.elements;
  const body = {
    url: f.url.value, title: f.title.value, image: f.image.value, description: f.description.value,
    price: f.price.value, oldPrice: f.oldPrice.value, badge: f.badge.value,
    categories: f.categories.value.split(",").map((s) => s.trim()).filter(Boolean),
    published: f.published.checked,
  };
  try {
    await api(editingId ? `/${editingId}` : "", { method: editingId ? "PUT" : "POST", body: JSON.stringify(body) });
    editor.close();
    notify(editingId ? "Cambios guardados." : "Producto creado.");
    await load();
  } catch (err) {
    $("form-error").textContent = err.message;
  }
});

$("cancel-btn").addEventListener("click", () => editor.close());
$("new-btn").addEventListener("click", () => openEditor());
$("logout-btn").addEventListener("click", logout);

if (password) enter();
