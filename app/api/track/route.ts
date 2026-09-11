import { z } from "zod";
import {
  db,
  body,
  json,
  rate,
  fail,
  normalized,
  seed,
  HttpError,
} from "@/lib/server";
export async function POST(req: Request) {
  try {
    await seed();
    await rate(req, "track", 8);
    const v = z
      .object({
        code: z.string().min(8).max(40),
        verification: z.string().min(5).max(200),
      })
      .parse(await body(req));
    const order = await db()
      .prepare(
        "SELECT id,order_code,status,phone,email,created_at,is_demo FROM orders WHERE order_code=?",
      )
      .bind(v.code.trim().toUpperCase())
      .first();
    if (
      !order ||
      ![normalized(order.phone), normalized(order.email)].includes(
        normalized(v.verification),
      )
    )
      throw new HttpError(
        404,
        "No encontramos una solicitud con esos datos. Verificá el código y el teléfono o correo que usaste.",
      );
    const events = await db()
      .prepare(
        "SELECT status,created_at FROM order_events WHERE order_id=? ORDER BY created_at",
      )
      .bind(order.id)
      .all();
    return json({
      code: order.order_code,
      status: order.status,
      created_at: order.created_at,
      is_demo: !!order.is_demo,
      events: events.results,
    });
  } catch (e) {
    return fail(e);
  }
}
