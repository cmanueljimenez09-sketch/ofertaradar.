import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: serial().primaryKey(),
  title: text().notNull(),
  url: text().notNull().default(""),
  image: text().notNull().default(""),
  description: text().notNull().default(""),
  price: text().notNull().default(""),
  oldPrice: text("old_price").notNull().default(""),
  badge: text().notNull().default(""),
  categories: text().array().notNull().default([]),
  published: boolean().notNull().default(false),
  position: integer().notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
