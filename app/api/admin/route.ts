import { z } from "zod";
import {
  admin,
  db,
  body,
  json,
  fail,
  getProducts,
  getCategories,
  settings,
  HttpError,
} from "@/lib/server";
import { statuses } from "@/lib/types";
import {
  listSupabaseProfiles,
  supabaseAdminConfigured,
} from "@/lib/supabase-server";
const safeImage = z
  .string()
  .max(2000)
  .refine(
    (s) => /^\/(images|media|brand)\//.test(s) || /^https:\/\//.test(s),
    "Imagen inválida",
  );
const productSchema = z
  .object({
    id: z.string().max(80),
    name: z.string().trim().min(2).max(120),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(150),
    sku: z.string().min(1).max(50),
    neutral_name: z.string().min(1).max(100),
    short_description: z.string().max(300),
    description: z.string().max(8000),
    price: z.number().int().min(0).max(100000000),
    compare_at_price: z.number().int().min(0).nullable(),
    category_id: z.string().min(1).max(80),
    category_ids: z.array(z.string().min(1).max(80)).min(1).max(12),
    availability_type: z.enum([
      "available",
      "low_stock",
      "sold_out",
      "on_order",
    ]),
    stock_quantity: z.number().int().min(0).max(1000000),
    lead_time_min_days: z.number().int().min(0).max(365).nullable(),
    lead_time_max_days: z.number().int().min(0).max(365).nullable(),
    featured: z.boolean(),
    active: z.boolean(),
    is_new: z.boolean(),
    is_demo: z.boolean(),
    tags: z.array(z.string().max(60)).max(20),
    highlights: z.array(z.string().max(180)).max(12),
    notice_text: z.string().max(500),
    notice_tone: z.enum(["info", "warning", "offer"]),
    materials: z.string().max(2000),
    dimensions: z.string().max(1000),
    care: z.string().max(3000),
    usage_note: z.string().max(3000),
    return_note: z.string().max(3000),
    images: z.array(safeImage).min(1).max(12),
    variants: z
      .array(
        z.object({
          id: z.string().max(80),
          name: z.string().min(1).max(60),
          value: z.string().min(1).max(60),
          price_modifier: z.number().int().min(0).max(10000000),
          stock_quantity: z.number().int().min(0).max(1000000),
          active: z.boolean(),
        }),
      )
      .max(30),
    created_at: z.string(),
  })
  .superRefine((p, c) => {
    if (
      p.availability_type === "on_order" &&
      (p.lead_time_min_days === null ||
        p.lead_time_max_days === null ||
        p.lead_time_max_days < p.lead_time_min_days)
    )
      c.addIssue({
        code: "custom",
        message: "Definí un rango de plazo válido.",
      });
    if (p.compare_at_price !== null && p.compare_at_price <= p.price)
      c.addIssue({
        code: "custom",
        message: "El precio anterior debe superar al actual.",
      });
  });
export async function GET() {
  try {
    const user = await admin();
    const [products, categories, config, orders, coupons, newsletter, audit] =
      await Promise.all([
        getProducts(true),
        getCategories(true),
        settings(),
        db()
          .prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500")
          .all(),
        db().prepare("SELECT * FROM coupons").all(),
        db()
          .prepare(
            "SELECT * FROM newsletter ORDER BY created_at DESC LIMIT 500",
          )
          .all(),
        db()
          .prepare(
            "SELECT * FROM customer_audit ORDER BY created_at DESC LIMIT 500",
          )
          .all(),
      ]);
    const supabaseConfigured = supabaseAdminConfigured();
    let customers: Array<Record<string, unknown>> = [];
    if (supabaseConfigured) {
      try {
        customers = await listSupabaseProfiles();
      } catch {
        customers = [];
      }
    }
    return json({
      user: user.email,
      products,
      categories,
      settings: config,
      orders: orders.results,
      coupons: coupons.results,
      newsletter: newsletter.results,
      customers,
      customer_audit: audit.results,
      supabase: { configured: supabaseConfigured },
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    await admin();
    const v = await body(req);
    const d = db();
    if (v.action === "product") {
      const p = productSchema.parse(v.product);
      const now = new Date().toISOString();
      const existing = await d
        .prepare("SELECT id FROM products WHERE id=?")
        .bind(p.id)
        .first();
      const cats = await getCategories(true);
      if (!cats.some((c) => c.id === p.category_id))
        throw new HttpError(400, "Categoría inválida.");
      if (p.category_ids.some((id) => !cats.some((c) => c.id === id)))
        throw new HttpError(
          400,
          "Una de las categorías seleccionadas no existe.",
        );
      const statements: any[] = [
        d
          .prepare(
            "INSERT INTO products (id,name,slug,sku,category_id,price,stock_quantity,availability_type,active,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,sku=excluded.sku,category_id=excluded.category_id,price=excluded.price,stock_quantity=excluded.stock_quantity,availability_type=excluded.availability_type,active=excluded.active,data=excluded.data,updated_at=excluded.updated_at",
          )
          .bind(
            p.id,
            p.name,
            p.slug,
            p.sku,
            p.category_id,
            p.price,
            p.stock_quantity,
            p.availability_type,
            p.active ? 1 : 0,
            JSON.stringify(p),
            existing ? p.created_at : now,
            now,
          ),
        d.prepare("DELETE FROM product_images WHERE product_id=?").bind(p.id),
        d.prepare("DELETE FROM product_variants WHERE product_id=?").bind(p.id),
      ];
      p.images.forEach((url, i) =>
        statements.push(
          d
            .prepare(
              "INSERT INTO product_images (id,product_id,url,sort_order) VALUES (?,?,?,?)",
            )
            .bind(crypto.randomUUID(), p.id, url, i),
        ),
      );
      p.variants.forEach((a) =>
        statements.push(
          d
            .prepare(
              "INSERT INTO product_variants (id,product_id,name,value,price_modifier,stock_quantity,active) VALUES (?,?,?,?,?,?,?)",
            )
            .bind(
              a.id || crypto.randomUUID(),
              p.id,
              a.name,
              a.value,
              a.price_modifier,
              a.stock_quantity,
              a.active ? 1 : 0,
            ),
        ),
      );
      await d.batch(statements);
      return json({ ok: true });
    }
    if (v.action === "category") {
      const c = z
        .object({
          id: z.string().min(1).max(80),
          name: z.string().min(2).max(100),
          slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          description: z.string().max(500),
          image_url: safeImage,
          active: z.boolean(),
          sort_order: z.number().int().min(0).max(100),
        })
        .parse(v.category);
      await d
        .prepare(
          "INSERT INTO categories (id,name,slug,data,active,sort_order) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,data=excluded.data,active=excluded.active,sort_order=excluded.sort_order",
        )
        .bind(
          c.id,
          c.name,
          c.slug,
          JSON.stringify(c),
          c.active ? 1 : 0,
          c.sort_order,
        )
        .run();
      return json({ ok: true });
    }
    if (v.action === "delete_category") {
      const id = z.string().max(80).parse(v.id);
      const used = await d
        .prepare("SELECT id FROM products WHERE category_id=? LIMIT 1")
        .bind(id)
        .first();
      if (used)
        throw new HttpError(
          409,
          "Asigná los productos a otra categoría antes de eliminarla.",
        );
      await d.prepare("DELETE FROM categories WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
    if (v.action === "settings") {
      const s = z
        .object({
          demo: z.boolean(),
          age_gate: z.boolean(),
          payments: z
            .array(
              z.object({
                id: z.string().max(50),
                name: z.string().min(1).max(100),
                enabled: z.boolean(),
                instructions: z.string().max(3000),
              }),
            )
            .max(6),
          delivery: z
            .array(
              z.object({
                id: z.string().max(50),
                name: z.string().min(1).max(100),
                enabled: z.boolean(),
                price: z.number().int().min(0).max(10000000),
              }),
            )
            .max(10),
          contact_email: z.union([z.string().email().max(200), z.literal("")]),
          legal_name: z.string().max(200),
          tax_id: z.string().max(80),
          business_address: z.string().max(300),
          whatsapp: z.string().regex(/^[0-9]{0,18}$/),
          instagram: z.union([
            z
              .string()
              .url()
              .refine(
                (s) =>
                  new URL(s).hostname === "www.instagram.com" ||
                  new URL(s).hostname === "instagram.com",
              ),
            z.literal(""),
          ]),
          shipping_text: z.string().max(12000),
          privacy_text: z.string().max(12000),
          terms_text: z.string().max(12000),
          reservation_text: z.string().max(3000),
          banner: z.string().max(250),
          hero_title: z.string().min(3).max(150),
          hero_description: z.string().max(400),
          hero_image: safeImage,
          story_title: z.string().min(3).max(150),
          story_description: z.string().max(800),
          story_image: safeImage,
          zones: z.array(z.string().max(100)).max(200),
        })
        .parse(v.settings);
      if (
        !s.demo &&
        (!s.contact_email ||
          !s.legal_name ||
          !s.tax_id ||
          !s.business_address ||
          !s.payments.some((p) => p.enabled) ||
          !s.delivery.some((p) => p.enabled))
      )
        throw new HttpError(
          400,
          "Completá identidad legal, RUC, domicilio, contacto y activá al menos un medio de pago y entrega.",
        );
      await d
        .prepare("UPDATE site_settings SET value=? WHERE key=?")
        .bind(JSON.stringify(s), "store")
        .run();
      return json({ ok: true });
    }
    if (v.action === "order_detail") {
      const id = z.string().max(80).parse(v.id);
      const [order, items, events] = await Promise.all([
        d.prepare("SELECT * FROM orders WHERE id=?").bind(id).first(),
        d.prepare("SELECT * FROM order_items WHERE order_id=?").bind(id).all(),
        d
          .prepare(
            "SELECT * FROM order_events WHERE order_id=? ORDER BY created_at",
          )
          .bind(id)
          .all(),
      ]);
      if (!order) throw new HttpError(404, "Pedido no encontrado.");
      return json({ order, items: items.results, events: events.results });
    }
    if (v.action === "order_status") {
      const o = z
        .object({
          id: z.string().max(80),
          status: z.string().refine((s) => statuses.includes(s)),
          internal_note: z.string().max(5000),
        })
        .parse(v);
      const before = await d
        .prepare("SELECT status FROM orders WHERE id=?")
        .bind(o.id)
        .first();
      if (!before) throw new HttpError(404, "Pedido no encontrado.");
      if (before.status === "Cancelado" && o.status !== "Cancelado")
        throw new HttpError(
          409,
          "Un pedido cancelado no puede reabrirse; creá otra solicitud.",
        );
      const statements: any[] = [
        d
          .prepare("UPDATE orders SET status=?,internal_note=? WHERE id=?")
          .bind(o.status, o.internal_note, o.id),
      ];
      if (before.status !== o.status)
        statements.push(
          d
            .prepare(
              "INSERT INTO order_events (id,order_id,status,created_at) VALUES (?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              o.id,
              o.status,
              new Date().toISOString(),
            ),
        );
      await d.batch(statements);
      return json({ ok: true });
    }
    if (v.action === "coupon") {
      const c = z
        .object({
          code: z.string().trim().min(2).max(30),
          percent: z.number().int().min(1).max(100),
          active: z.boolean(),
          expires_at: z.string().nullable(),
        })
        .parse(v.coupon);
      await d
        .prepare(
          "INSERT INTO coupons (code,percent,active,expires_at) VALUES (?,?,?,?) ON CONFLICT(code) DO UPDATE SET percent=excluded.percent,active=excluded.active,expires_at=excluded.expires_at",
        )
        .bind(c.code.toUpperCase(), c.percent, c.active ? 1 : 0, c.expires_at)
        .run();
      return json({ ok: true });
    }
    throw new HttpError(400, "Acción desconocida.");
  } catch (e) {
    return fail(e);
  }
}
