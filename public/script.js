// Moneda en la que se muestran los precios (código ISO 4217).
const CURRENCY = "USD";
const LOCALE = "es";

const grid = document.getElementById("grid");
const filters = document.getElementById("filters");
const search = document.getElementById("search");
document.getElementById("year").textContent = new Date().getFullYear();

let products = [];
let activeCategory = "Todos";

function formatPrice(value) {
  if (!value) return "";
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY }).format(n);
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}

function card(p) {
  const media = el("div", { className: "card-media" }, [
    p.image ? el("img", { src: p.image, alt: p.title, loading: "lazy", referrerPolicy: "no-referrer" }) : null,
    p.badge ? el("span", { className: "badge", textContent: p.badge }) : null,
  ]);

  const price = p.price
    ? el("div", { className: "price" }, [
        el("strong", { textContent: formatPrice(p.price) }),
        p.oldPrice ? el("s", { textContent: formatPrice(p.oldPrice) }) : null,
      ])
    : el("div", { className: "price-note", textContent: "Consulta el precio actual en Amazon" });

  const body = el("div", { className: "card-body" }, [
    p.categories.length ? el("div", { className: "card-cats" }, p.categories.map((c) => el("span", { textContent: c }))) : null,
    el("h2", { textContent: p.title }),
    p.description ? el("p", { textContent: p.description }) : null,
    price,
    el("a", {
      className: "btn-buy",
      href: p.url,
      target: "_blank",
      rel: "sponsored noopener noreferrer",
      textContent: "Ver en Amazon →",
    }),
  ]);

  return el("article", { className: "card" }, [media, body]);
}

function renderFilters() {
  const cats = ["Todos", ...new Set(products.flatMap((p) => p.categories))];
  filters.replaceChildren(
    ...cats.map((c) => {
      const b = el("button", { type: "button", className: "chip", textContent: c });
      b.setAttribute("aria-pressed", String(c === activeCategory));
      b.addEventListener("click", () => { activeCategory = c; renderFilters(); renderGrid(); });
      return b;
    })
  );
}

function renderGrid() {
  const q = search.value.trim().toLowerCase();
  const list = products.filter(
    (p) =>
      (activeCategory === "Todos" || p.categories.includes(activeCategory)) &&
      (!q || `${p.title} ${p.description} ${p.categories.join(" ")}`.toLowerCase().includes(q))
  );
  grid.replaceChildren(
    ...(list.length ? list.map(card) : [el("p", { className: "status", textContent: products.length ? "No hay productos que coincidan." : "Pronto añadiremos nuevas ofertas. ¡Vuelve pronto!" })])
  );
}

search.addEventListener("input", renderGrid);

fetch("/api/products")
  .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
  .then((data) => { products = data; renderFilters(); renderGrid(); })
  .catch(() => { grid.replaceChildren(el("p", { className: "status", textContent: "No se pudieron cargar los productos. Inténtalo de nuevo más tarde." })); });
