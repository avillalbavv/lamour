import { db, fail, json, normalized, rate, HttpError } from "@/lib/server";
import { getSupabaseAccount } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    await rate(request, "account-orders", 30);
    const account = await getSupabaseAccount(request);
    if (!account)
      throw new HttpError(401, "Iniciá sesión para ver tus pedidos.");
    const email = account.email?.toLowerCase() || "";
    const phone = normalized(
      account.user_metadata?.phone || account.phone || "",
    );
    const database = db();
    const now = new Date().toISOString();
    if (email && phone) {
      const unclaimed = await database
        .prepare(
          "SELECT id FROM orders WHERE account_id='' AND lower(email)=? AND phone=? LIMIT 50",
        )
        .bind(email, phone)
        .all();
      if (unclaimed.results.length) {
        const statements = unclaimed.results.flatMap((row: any) => [
          database
            .prepare(
              "UPDATE orders SET account_id=? WHERE id=? AND account_id=''",
            )
            .bind(account.id, row.id),
          database
            .prepare(
              "INSERT INTO customer_audit (id,account_id,event_type,reference_id,metadata,created_at) VALUES (?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              account.id,
              "guest_order_linked",
              row.id,
              JSON.stringify({ method: "verified_email_phone" }),
              now,
            ),
        ]);
        await database.batch(statements);
      }
    }
    const orders = await database
      .prepare(
        "SELECT id,order_code,status,subtotal,shipping,discount,total,payment_method,delivery_method,city,created_at FROM orders WHERE account_id=? ORDER BY created_at DESC LIMIT 100",
      )
      .bind(account.id)
      .all();
    const enriched = await Promise.all(
      orders.results.map(async (order: any) => {
        const [items, events] = await Promise.all([
          database
            .prepare(
              "SELECT name_snapshot,variant_snapshot,price_snapshot,quantity FROM order_items WHERE order_id=?",
            )
            .bind(order.id)
            .all(),
          database
            .prepare(
              "SELECT status,created_at FROM order_events WHERE order_id=? ORDER BY created_at",
            )
            .bind(order.id)
            .all(),
        ]);
        return { ...order, items: items.results, events: events.results };
      }),
    );
    return json({
      profile: {
        id: account.id,
        email: account.email || "",
        phone: account.user_metadata?.phone || account.phone || "",
        full_name: account.user_metadata?.full_name || "",
        age_confirmed: account.user_metadata?.age_confirmed === true,
      },
      orders: enriched,
    });
  } catch (error) {
    return fail(error);
  }
}
