import { z } from "zod";
import {
  db,
  body,
  json,
  rate,
  fail,
  getProducts,
  settings,
  normalized,
  HttpError,
} from "@/lib/server";
import { lead } from "@/lib/types";
import { POLICY_VERSION } from "@/lib/catalog-presentation";
import { getSupabaseAccount } from "@/lib/supabase-server";
const schema = z.object({
  idempotency_key: z.string().uuid(),
  customer_name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .min(7)
    .max(30)
    .refine((v) => v.replace(/\D/g, "").length >= 7),
  email: z.string().email().max(200),
  city: z.string().trim().min(2).max(100),
  address: z.string().max(300),
  reference: z.string().max(300).default(""),
  notes: z.string().max(1000).default(""),
  payment_method: z.string().max(50),
  delivery_method: z.string().max(50),
  consent: z.literal(true),
  age_confirmed: z.literal(true),
  coupon: z.string().max(30).optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().max(80),
        variant_id: z.string().max(80).nullable(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(30),
});
export async function POST(req: Request) {
  try {
    const v = schema.parse(await body(req));
    const config = await settings();
    await rate(req, "checkout", 8);
    const account = await getSupabaseAccount(req);
    if (req.headers.get("authorization") && !account)
      throw new HttpError(401, "Tu sesión venció. Iniciá sesión nuevamente.");
    if (account && account.user_metadata?.age_confirmed !== true)
      throw new HttpError(403, "La cuenta debe confirmar la mayoría de edad.");
    const d = db();
    const previous = await d
      .prepare(
        "SELECT order_code,phone,email FROM orders WHERE idempotency_key=?",
      )
      .bind(v.idempotency_key)
      .first();
    if (previous) {
      if (
        normalized(previous.phone) !== normalized(v.phone) ||
        normalized(previous.email) !== normalized(v.email)
      )
        throw new HttpError(
          409,
          "La solicitud ya fue utilizada. Actualizá la página.",
        );
      return json({ code: previous.order_code, is_demo: config.demo });
    }
    const pay = config.payments.find(
      (p) => p.id === v.payment_method && p.enabled,
    );
    const delivery = config.delivery.find(
      (p) => p.id === v.delivery_method && p.enabled,
    );
    if (!pay || !delivery)
      throw new HttpError(400, "Elegí un método de pago y entrega disponible.");
    if (delivery.id !== "pickup" && v.address.trim().length < 5)
      throw new HttpError(400, "Completá la dirección para el envío.");
    if (
      config.zones.length &&
      !config.zones.some((c) => c.toLowerCase() === v.city.toLowerCase())
    )
      throw new HttpError(
        400,
        "Tu ciudad está fuera de las zonas habilitadas. Contactanos para coordinar.",
      );
    const products = await getProducts();
    const merged = new Map<string, (typeof v.items)[0]>();
    for (const item of v.items) {
      const key = item.product_id + ":" + item.variant_id;
      const prev = merged.get(key);
      merged.set(key, {
        ...item,
        quantity: item.quantity + (prev?.quantity || 0),
      });
    }
    const lines = [...merged.values()].map((item) => {
      if (item.quantity > 20)
        throw new HttpError(400, "Máximo 20 unidades por producto.");
      const p = products.find(
        (p) =>
          p.id === item.product_id && p.active && (config.demo || !p.is_demo),
      );
      if (!p || p.availability_type === "sold_out")
        throw new HttpError(
          409,
          "Un producto ya no está disponible. Revisá el carrito.",
        );
      const variant = item.variant_id
        ? p.variants.find((a) => a.id === item.variant_id && a.active)
        : null;
      if (
        (item.variant_id && !variant) ||
        (!variant && p.variants.some((x) => x.active))
      )
        throw new HttpError(400, "Seleccioná una variante válida.");
      if (
        p.availability_type !== "on_order" &&
        (p.stock_quantity < item.quantity ||
          (variant && variant.stock_quantity < item.quantity))
      )
        throw new HttpError(409, `No hay suficientes unidades de ${p.name}.`);
      return {
        item,
        p,
        variant,
        price: p.price + (variant?.price_modifier || 0),
      };
    });
    const subtotal = lines.reduce((s, l) => s + l.price * l.item.quantity, 0);
    let discount = 0;
    if (v.coupon) {
      const c = await d
        .prepare("SELECT * FROM coupons WHERE code=? AND active=1")
        .bind(v.coupon.trim().toUpperCase())
        .first();
      if (!c || (c.expires_at && c.expires_at < new Date().toISOString()))
        throw new HttpError(400, "El cupón no está vigente.");
      discount = Math.round((subtotal * c.percent) / 100);
    }
    const id = crypto.randomUUID();
    const code = `LA-${new Date().getUTCFullYear()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    const now = new Date().toISOString();
    const status = lines.some((l) => l.p.availability_type === "on_order")
      ? "Pendiente de confirmación"
      : "Solicitud recibida";
    const statements: any[] = [
      d
        .prepare(
          "INSERT INTO orders (id,order_code,idempotency_key,customer_name,phone,email,city,address,reference,subtotal,shipping,discount,total,payment_method,delivery_method,status,notes,internal_note,is_demo,account_id,age_confirmed,terms_version,privacy_version,consent_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          code,
          v.idempotency_key,
          v.customer_name,
          normalized(v.phone),
          v.email.toLowerCase(),
          v.city,
          v.address,
          v.reference,
          subtotal,
          delivery.price,
          discount,
          subtotal + delivery.price - discount,
          pay.id,
          delivery.id,
          status,
          v.notes,
          "",
          config.demo ? 1 : 0,
          account?.id || "",
          1,
          POLICY_VERSION,
          POLICY_VERSION,
          now,
          now,
        ),
    ];
    for (const l of lines) {
      if (l.p.availability_type !== "on_order") {
        statements.push(
          d
            .prepare(
              "UPDATE products SET stock_quantity=stock_quantity-? WHERE id=?",
            )
            .bind(l.item.quantity, l.p.id),
        );
        if (l.variant)
          statements.push(
            d
              .prepare(
                "UPDATE product_variants SET stock_quantity=stock_quantity-? WHERE id=?",
              )
              .bind(l.item.quantity, l.variant.id),
          );
      }
      statements.push(
        d
          .prepare(
            "INSERT INTO order_items (id,order_id,product_id,variant_id,name_snapshot,variant_snapshot,price_snapshot,quantity,availability_snapshot,lead_time_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            l.p.id,
            l.variant?.id || null,
            l.p.name,
            l.variant ? `${l.variant.name}: ${l.variant.value}` : "",
            l.price,
            l.item.quantity,
            l.p.availability_type,
            lead(l.p),
          ),
      );
    }
    statements.push(
      d
        .prepare(
          "INSERT INTO order_events (id,order_id,status,created_at) VALUES (?,?,?,?)",
        )
        .bind(crypto.randomUUID(), id, status, now),
    );
    if (account)
      statements.push(
        d
          .prepare(
            "INSERT INTO customer_audit (id,account_id,event_type,reference_id,metadata,created_at) VALUES (?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            account.id,
            "order_created",
            id,
            JSON.stringify({ order_code: code }),
            now,
          ),
      );
    await d.batch(statements);
    return json(
      {
        code,
        is_demo: config.demo,
        total: subtotal + delivery.price - discount,
        payment_instructions: pay.instructions,
        account_linked: Boolean(account),
      },
      201,
    );
  } catch (e) {
    if (
      e instanceof Error &&
      /CHECK constraint|stock_nonnegative/.test(e.message)
    )
      return json(
        { error: "El stock cambió mientras confirmabas. Revisá el carrito." },
        409,
      );
    return fail(e);
  }
}
