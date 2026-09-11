import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sku: text("sku").notNull(),
    category_id: text("category_id").notNull(),
    price: integer("price").notNull(),
    stock_quantity: integer("stock_quantity").notNull(),
    availability_type: text("availability_type").notNull(),
    active: integer("active").notNull(),
    data: text("data").notNull(),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("products_slug_unique").on(t.slug),
    index("products_category_active").on(t.category_id, t.active),
    check("product_stock_nonnegative", sql`${t.stock_quantity} >= 0`),
    check("product_price_nonnegative", sql`${t.price} >= 0`),
  ],
);
export const productImages = sqliteTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    product_id: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sort_order: integer("sort_order").notNull(),
  },
  (t) => [index("images_product").on(t.product_id)],
);
export const productVariants = sqliteTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    product_id: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    value: text("value").notNull(),
    price_modifier: integer("price_modifier").notNull(),
    stock_quantity: integer("stock_quantity").notNull(),
    active: integer("active").notNull(),
  },
  (t) => [
    index("variants_product").on(t.product_id),
    check("variant_stock_nonnegative", sql`${t.stock_quantity}>=0`),
  ],
);
export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    data: text("data").notNull(),
    active: integer("active").notNull(),
    sort_order: integer("sort_order").notNull(),
  },
  (t) => [uniqueIndex("categories_slug_unique").on(t.slug)],
);
export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    order_code: text("order_code").notNull(),
    idempotency_key: text("idempotency_key").notNull(),
    customer_name: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    city: text("city").notNull(),
    address: text("address").notNull(),
    reference: text("reference").notNull(),
    subtotal: integer("subtotal").notNull(),
    shipping: integer("shipping").notNull(),
    discount: integer("discount").notNull(),
    total: integer("total").notNull(),
    payment_method: text("payment_method").notNull(),
    delivery_method: text("delivery_method").notNull(),
    status: text("status").notNull(),
    notes: text("notes").notNull(),
    internal_note: text("internal_note").notNull(),
    is_demo: integer("is_demo").notNull(),
    account_id: text("account_id").notNull().default(""),
    age_confirmed: integer("age_confirmed").notNull().default(0),
    terms_version: text("terms_version").notNull().default(""),
    privacy_version: text("privacy_version").notNull().default(""),
    consent_at: text("consent_at").notNull().default(""),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("orders_code_unique").on(t.order_code),
    uniqueIndex("orders_idempotency_unique").on(t.idempotency_key),
    index("orders_status_date").on(t.status, t.created_at),
    index("orders_account_date").on(t.account_id, t.created_at),
  ],
);
export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    order_id: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    product_id: text("product_id").notNull(),
    variant_id: text("variant_id"),
    name_snapshot: text("name_snapshot").notNull(),
    variant_snapshot: text("variant_snapshot").notNull(),
    price_snapshot: integer("price_snapshot").notNull(),
    quantity: integer("quantity").notNull(),
    availability_snapshot: text("availability_snapshot").notNull(),
    lead_time_snapshot: text("lead_time_snapshot").notNull(),
  },
  (t) => [index("items_order").on(t.order_id)],
);
export const orderEvents = sqliteTable(
  "order_events",
  {
    id: text("id").primaryKey(),
    order_id: text("order_id")
      .notNull()
      .references(() => orders.id),
    status: text("status").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("events_order").on(t.order_id)],
);
export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
export const coupons = sqliteTable("coupons", {
  code: text("code").primaryKey(),
  percent: integer("percent").notNull(),
  active: integer("active").notNull(),
  expires_at: text("expires_at"),
});
export const newsletter = sqliteTable("newsletter", {
  email: text("email").primaryKey(),
  consent: integer("consent").notNull(),
  created_at: text("created_at").notNull(),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires: integer("expires").notNull(),
});
export const customerAudit = sqliteTable(
  "customer_audit",
  {
    id: text("id").primaryKey(),
    account_id: text("account_id").notNull(),
    event_type: text("event_type").notNull(),
    reference_id: text("reference_id").notNull(),
    metadata: text("metadata").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("customer_audit_account_date").on(t.account_id, t.created_at)],
);
