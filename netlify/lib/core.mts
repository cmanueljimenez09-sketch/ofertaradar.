import { createHash, timingSafeEqual } from "node:crypto";

const AMAZON_HOST = /^(?:[a-z0-9-]+\.)*(?:amazon\.[a-z.]{2,8}|amzn\.(?:to|eu|asia)|a\.co)$/i;

export class ValidationError extends Error {}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

// Constant-time comparison of the password sent by the admin panel.
export function isAuthorized(req: Request): boolean {
  const expected = Netlify.env.get("ADMIN_PASSWORD");
  if (!expected) return false;
  const header = req.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return given.length > 0 && timingSafeEqual(a, b);
}

export function isAmazonUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && AMAZON_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function str(value: unknown, field: string, max: number): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new ValidationError(`«${field}» debe ser texto.`);
  const v = value.trim();
  if (v.length > max) throw new ValidationError(`«${field}» admite como máximo ${max} caracteres.`);
  return v;
}

export interface ProductInput {
  title: string;
  url: string;
  image: string;
  description: string;
  price: string;
  oldPrice: string;
  badge: string;
  categories: string[];
  published: boolean;
}

// Validates and normalises a product payload coming from the admin panel.
export function validateProduct(body: any): ProductInput {
  if (!body || typeof body !== "object") throw new ValidationError("Datos no válidos.");

  const title = str(body.title, "Título", 200);
  if (!title) throw new ValidationError("El título es obligatorio.");

  const url = str(body.url, "Enlace de afiliado", 2000);
  if (url && !isAmazonUrl(url)) {
    throw new ValidationError("El enlace debe ser una URL https:// de Amazon (amazon.*, amzn.to, a.co…).");
  }

  const image = str(body.image, "Imagen", 2000);
  if (image && !isHttpsUrl(image)) throw new ValidationError("La imagen debe ser una URL https://.");

  const rawCats = Array.isArray(body.categories)
    ? body.categories
    : typeof body.categories === "string"
      ? body.categories.split(",")
      : [];
  const categories = [
    ...new Set(rawCats.map((c: unknown) => String(c).trim()).filter(Boolean)),
  ].slice(0, 10) as string[];
  if (categories.some((c) => c.length > 40)) throw new ValidationError("Cada categoría admite como máximo 40 caracteres.");

  const published = body.published === true;
  if (published && !url) throw new ValidationError("Para publicar un producto necesitas su enlace de afiliado.");

  return {
    title,
    url,
    image,
    description: str(body.description, "Descripción", 1000),
    price: str(body.price, "Precio", 30),
    oldPrice: str(body.oldPrice, "Precio anterior", 30),
    badge: str(body.badge, "Etiqueta", 30),
    categories,
    published,
  };
}
