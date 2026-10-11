import type { Config } from "@netlify/functions";
import { asc, desc, eq, gt, lt, max } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products } from "../../db/schema.js";
import { ValidationError, isAuthorized, json, validateProduct } from "../lib/core.mjs";

const PUBLIC_FIELDS = {
  id: products.id,
  title: products.title,
  url: products.url,
  image: products.image,
  description: products.description,
  price: products.price,
  oldPrice: products.oldPrice,
  badge: products.badge,
  categories: products.categories,
};

export default async (req: Request) => {
  const url = new URL(req.url);
  // /api/products, /api/products/:id or /api/products/:id/move
  const [, , , idPart, action] = url.pathname.split("/");
  const id = idPart ? Number(idPart) : null;
  if (idPart && (!Number.isInteger(id) || id! <= 0)) return json({ error: "Producto no encontrado." }, 404);

  try {
    // Public listing: only published products.
    if (req.method === "GET" && !id && url.searchParams.get("all") !== "1") {
      const rows = await db
        .select(PUBLIC_FIELDS)
        .from(products)
        .where(eq(products.published, true))
        .orderBy(asc(products.position), asc(products.id));
      return Response.json(rows, { headers: { "Cache-Control": "public, max-age=0, must-revalidate" } });
    }

    if (!isAuthorized(req)) return json({ error: "Contraseña incorrecta." }, 401);

    if (req.method === "GET" && !id) {
      const rows = await db.select().from(products).orderBy(asc(products.position), asc(products.id));
      return json(rows);
    }

    if (req.method === "POST" && !id) {
      const data = validateProduct(await req.json().catch(() => null));
      const [{ top }] = await db.select({ top: max(products.position) }).from(products);
      const [row] = await db
        .insert(products)
        .values({ ...data, position: (top ?? 0) + 1 })
        .returning();
      return json(row, 201);
    }

    if (req.method === "PUT" && id && !action) {
      const data = validateProduct(await req.json().catch(() => null));
      const [row] = await db
        .update(products)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();
      return row ? json(row) : json({ error: "Producto no encontrado." }, 404);
    }

    if (req.method === "DELETE" && id && !action) {
      const [row] = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
      return row ? json({ ok: true }) : json({ error: "Producto no encontrado." }, 404);
    }

    // Swap position with the neighbouring product.
    if (req.method === "POST" && id && action === "move") {
      const { direction } = (await req.json().catch(() => ({}))) as { direction?: string };
      if (direction !== "up" && direction !== "down") return json({ error: "Dirección no válida." }, 400);

      const [current] = await db.select().from(products).where(eq(products.id, id));
      if (!current) return json({ error: "Producto no encontrado." }, 404);

      const [neighbour] = await db
        .select()
        .from(products)
        .where(direction === "up" ? lt(products.position, current.position) : gt(products.position, current.position))
        .orderBy(direction === "up" ? desc(products.position) : asc(products.position))
        .limit(1);
      if (neighbour) {
        await db.transaction(async (tx) => {
          await tx.update(products).set({ position: neighbour.position }).where(eq(products.id, current.id));
          await tx.update(products).set({ position: current.position }).where(eq(products.id, neighbour.id));
        });
      }
      return json({ ok: true });
    }

    return json({ error: "Método no permitido." }, 405);
  } catch (err) {
    if (err instanceof ValidationError) return json({ error: err.message }, 400);
    console.error(err);
    return json({ error: "Error interno del servidor." }, 500);
  }
};

export const config: Config = {
  path: ["/api/products", "/api/products/*"],
};
