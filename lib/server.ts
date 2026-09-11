import {
  catalogPresentation,
  settingsPresentation,
} from "./catalog-presentation";
import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { defaultSettings, demoCategories, demoProducts } from "./demo";
import type { Product, Category, Settings } from "./types";
export const db = () => {
  const d = (env as any).DB;
  if (!d)
    throw new Error(
      "Almacenamiento temporalmente no disponible. Intentá nuevamente.",
    );
  return d;
};
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export function fail(e: unknown) {
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  if (e instanceof Error && e.name === "ZodError")
    return json(
      { error: "Revisá los campos. Hay datos incompletos o inválidos." },
      400,
    );
  return json(
    {
      error:
        "No se pudo completar la operación. Revisá tus datos e intentá nuevamente.",
    },
    500,
  );
}
export async function admin() {
  const user = await getChatGPTUser();
  if (!user) throw new HttpError(401, "Iniciá sesión para acceder.");
  const allowed = String((env as any).ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim());
  if (!allowed.includes(user.email.toLowerCase()))
    throw new HttpError(
      403,
      "Tu cuenta no tiene acceso de administración. Configurá ADMIN_EMAILS con el correo de la persona administradora.",
    );
  return user;
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    throw new HttpError(403, "Solicitud no permitida.");
}
export async function body(req: Request) {
  sameOrigin(req);
  if (Number(req.headers.get("content-length") || 0) > 150000)
    throw new HttpError(413, "Solicitud demasiado grande.");
  const raw = await req.text();
  if (raw.length > 150000)
    throw new HttpError(413, "Solicitud demasiado grande.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Solicitud inválida.");
  }
}
export async function rate(req: Request, scope: string, max = 15) {
  const ip = req.headers.get("cf-connecting-ip") || "local";
  const bin = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip + scope),
  );
  const hash = Array.from(new Uint8Array(bin))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  const now = Math.floor(Date.now() / 60000);
  const key = `${hash}:${now}`;
  const row = await db()
    .prepare(
      "INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    )
    .bind(key, now + 2)
    .first();
  if (row.count > max)
    throw new HttpError(
      429,
      "Demasiados intentos. Esperá un minuto y volvé a intentar.",
    );
  await db()
    .prepare("DELETE FROM rate_limits WHERE expires < ?")
    .bind(now)
    .run();
}
export async function seed() {
  const d = db();
  const exists = await d
    .prepare("SELECT key FROM site_settings WHERE key=?")
    .bind("store")
    .first();
  if (exists) return;
  const now = new Date().toISOString();
  const statements: any[] = [];
  for (const c of demoCategories)
    statements.push(
      d
        .prepare(
          "INSERT OR IGNORE INTO categories (id,name,slug,data,active,sort_order) VALUES (?,?,?,?,?,?)",
        )
        .bind(c.id, c.name, c.slug, JSON.stringify(c), 1, c.sort_order),
    );
  for (const p of demoProducts) {
    statements.push(
      d
        .prepare(
          "INSERT OR IGNORE INTO products (id,name,slug,sku,category_id,price,stock_quantity,availability_type,active,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
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
          1,
          JSON.stringify(p),
          now,
          now,
        ),
    );
    p.images.forEach((url, i) =>
      statements.push(
        d
          .prepare(
            "INSERT OR IGNORE INTO product_images (id,product_id,url,sort_order) VALUES (?,?,?,?)",
          )
          .bind(`${p.id}-img-${i}`, p.id, url, i),
      ),
    );
  }
  statements.push(
    d
      .prepare("INSERT OR IGNORE INTO site_settings (key,value) VALUES (?,?)")
      .bind("store", JSON.stringify(defaultSettings)),
  );
  await d.batch(statements);
}
export async function settings(): Promise<Settings> {
  await seed();
  const r = await db()
    .prepare("SELECT value FROM site_settings WHERE key=?")
    .bind("store")
    .first();
  return settingsPresentation({ ...defaultSettings, ...JSON.parse(r.value) });
}
export async function getProducts(all = false): Promise<Product[]> {
  await seed();
  const d = db();
  const [ps, ims, vs] = await Promise.all([
    d
      .prepare(
        `SELECT * FROM products ${all ? "" : "WHERE active=1"} ORDER BY created_at DESC,id`,
      )
      .all(),
    d.prepare("SELECT * FROM product_images ORDER BY sort_order").all(),
    d.prepare("SELECT * FROM product_variants").all(),
  ]);
  return ps.results
    .map((r: any) => {
      const data = JSON.parse(r.data);
      return {
        ...data,
        id: r.id,
        name: r.name,
        slug: r.slug,
        sku: r.sku,
        category_id: r.category_id,
        price: r.price,
        stock_quantity: r.stock_quantity,
        availability_type:
          r.availability_type !== "on_order" && r.stock_quantity === 0
            ? "sold_out"
            : r.availability_type,
        active: !!r.active,
        category_ids:
          Array.isArray(data.category_ids) && data.category_ids.length
            ? data.category_ids
            : [r.category_id],
        highlights: Array.isArray(data.highlights) ? data.highlights : [],
        notice_text: data.notice_text || "",
        notice_tone: data.notice_tone || "info",
        usage_note: data.usage_note || "",
        return_note: data.return_note || "",
        images: ims.results
          .filter((im: any) => im.product_id === r.id)
          .map((im: any) => im.url),
        variants: vs.results
          .filter((v: any) => v.product_id === r.id)
          .map((v: any) => ({ ...v, active: !!v.active })),
      };
    })
    .map(catalogPresentation);
}
export async function getCategories(all = false): Promise<Category[]> {
  await seed();
  const r = await db()
    .prepare(
      `SELECT * FROM categories ${all ? "" : "WHERE active=1"} ORDER BY sort_order`,
    )
    .all();
  return r.results.map((v: any) => ({
    ...JSON.parse(v.data),
    id: v.id,
    name: v.name,
    slug: v.slug,
    active: !!v.active,
    sort_order: v.sort_order,
  }));
}
export async function getStore() {
  const [products, categories, config] = await Promise.all([
    getProducts(),
    getCategories(),
    settings(),
  ]);
  return {
    products: products.filter((p) => config.demo || !p.is_demo),
    categories,
    settings: config,
  };
}
export const normalized = (s: string) =>
  s.includes("@") ? s.trim().toLowerCase() : s.replace(/\D/g, "");
export const bucket = () => {
  const b = (env as any).BUCKET;
  if (!b)
    throw new HttpError(
      503,
      "Las imágenes no están disponibles temporalmente.",
    );
  return b;
};
