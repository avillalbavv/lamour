"use client";
import { newId } from "@/lib/client-id";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  Check,
  Copy,
  Lock,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useStore } from "./store-provider";
import { Price } from "./products";
import { Choice, EmptyState, LoadState } from "./primitives";
import { money, lead, availabilityLabels } from "@/lib/types";
import { api } from "@/lib/api";
import { getSupabaseClient } from "@/lib/supabase-client";
export function CartContents({
  drawer = false,
  onNavigate = () => {},
}: {
  drawer?: boolean;
  onNavigate?: () => void;
}) {
  const { store, cart, quantity, discreet } = useStore();
  if (!store) return <LoadState />;
  if (!cart.length)
    return (
      <EmptyState
        title="Un espacio para tus elegidos."
        text="Todavía no agregaste productos a tu carrito."
      />
    );
  const lines = cart.map((i) => ({
    i,
    p: store.products.find((p) => p.id === i.product_id),
  }));
  const subtotal = lines.reduce(
    (s, { p, i }) =>
      s +
      (p
        ? p.price +
          (p.variants.find((v) => v.id === i.variant_id)?.price_modifier || 0)
        : 0) *
        i.quantity,
    0,
  );
  const mixed =
    lines.some((l) => l.p?.availability_type === "on_order") &&
    lines.some((l) => l.p && l.p.availability_type !== "on_order");
  return (
    <div className={drawer ? "stack" : "cart-layout"}>
      <div>
        {lines.map(({ p, i }) => {
          if (!p)
            return (
              <div className="cart-row" key={i.product_id}>
                <p>Producto no disponible</p>
                <button onClick={() => quantity(i.product_id, i.variant_id, 0)}>
                  Quitar
                </button>
              </div>
            );
          const v = p.variants.find((v) => v.id === i.variant_id);
          return (
            <div className="cart-row" key={i.product_id + ":" + i.variant_id}>
              <Link href={"/producto/" + p.slug} onClick={onNavigate}>
                <img
                  src={p.images[0]}
                  alt=""
                  className={discreet ? "blurred" : ""}
                />
              </Link>
              <div>
                <Link href={"/producto/" + p.slug} onClick={onNavigate}>
                  <h3>{discreet ? p.neutral_name : p.name}</h3>
                </Link>
                {v && (
                  <p>
                    {v.name}: {v.value}
                  </p>
                )}
                <p>
                  {availabilityLabels[p.availability_type]}
                  {p.availability_type === "on_order" ? " · " + lead(p) : ""}
                </p>
                <div className="quantity">
                  <button
                    aria-label="Reducir cantidad"
                    onClick={() => quantity(p.id, i.variant_id, i.quantity - 1)}
                  >
                    <Minus size={14} style={{ margin: "auto" }} />
                  </button>
                  <span>{i.quantity}</span>
                  <button
                    aria-label="Aumentar cantidad"
                    disabled={
                      i.quantity >= 20 ||
                      (p.availability_type !== "on_order" &&
                        i.quantity >=
                          Math.min(
                            p.stock_quantity,
                            v?.stock_quantity ?? Infinity,
                          ))
                    }
                    onClick={() => quantity(p.id, i.variant_id, i.quantity + 1)}
                  >
                    <Plus size={14} style={{ margin: "auto" }} />
                  </button>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Price
                  value={(p.price + (v?.price_modifier || 0)) * i.quantity}
                />
                <button
                  className="icon-button"
                  aria-label="Quitar producto"
                  onClick={() => quantity(p.id, i.variant_id, 0)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
        {mixed && (
          <p className="notice" style={{ marginTop: 20 }}>
            Tu selección combina productos disponibles y por pedido.
            Coordinaremos si preferís recibir todo junto o en entregas
            separadas; confirmaremos cualquier costo adicional antes de avanzar.
          </p>
        )}
      </div>
      <div className="summary">
        <h3>Tu selección, en detalle.</h3>
        <div className="row between">
          <span>Subtotal</span>
          <Price value={subtotal} />
        </div>
        <p>El envío se calcula al elegir la entrega.</p>
        <Link className="button" href="/checkout" onClick={onNavigate}>
          Continuar con mi pedido
          <ArrowRight size={16} />
        </Link>
        {drawer && (
          <Link
            className="text-link"
            href="/carrito"
            onClick={onNavigate}
            style={{ marginTop: 15 }}
          >
            Ver carrito completo
          </Link>
        )}
      </div>
    </div>
  );
}
const formSchema = z.object({
  customer_name: z.string().min(2, "Ingresá tu nombre completo."),
  phone: z
    .string()
    .min(7, "Ingresá un teléfono válido.")
    .refine(
      (s) => s.replace(/\D/g, "").length >= 7,
      "Ingresá un teléfono válido.",
    ),
  email: z.string().email("Ingresá un correo válido."),
  city: z.string().min(2, "Ingresá tu ciudad."),
  address: z.string(),
  reference: z.string(),
  notes: z.string(),
  coupon: z.string(),
});
type Form = z.infer<typeof formSchema>;
export function Checkout() {
  const { store, cart, clear } = useStore();
  const [payment, setPayment] = useState("");
  const [delivery, setDelivery] = useState("");
  const [consent, setConsent] = useState(false);
  const [adult, setAdult] = useState(false);
  const [accountToken, setAccountToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const key = useRef("");
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
  } = useForm<Form>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: "",
      phone: "",
      email: "",
      city: "",
      address: "",
      reference: "",
      notes: "",
      coupon: "",
    },
  });
  useEffect(() => {
    getSupabaseClient().then(async (client) => {
      if (!client) return;
      const { data } = await client.auth.getSession();
      const session = data.session;
      if (!session) return;
      setAccountToken(session.access_token);
      const metadata = session.user.user_metadata || {};
      if (metadata.full_name) setValue("customer_name", metadata.full_name);
      if (metadata.phone) setValue("phone", metadata.phone);
      if (session.user.email) setValue("email", session.user.email);
      if (metadata.age_confirmed === true) setAdult(true);
    });
  }, [setValue]);
  if (!store)
    return (
      <main id="main">
        <LoadState />
      </main>
    );
  if (result)
    return (
      <main id="main" className="container tracking">
        <div className="page-heading">
          <p className="eyebrow">Gracias por elegirnos</p>
          <h1>Ya estamos más cerca.</h1>
          <p>
            Recibimos tu solicitud. Guardá este código para seguir su estado.
          </p>
        </div>
        <div className="summary">
          <div className="row between">
            <strong style={{ fontSize: 22 }}>{result.code}</strong>
            <button
              className="icon-button"
              aria-label="Copiar código"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(result.code);
                  toast.success("Código copiado");
                } catch {
                  toast.error("Seleccioná el código para copiarlo.");
                }
              }}
            >
              <Copy size={20} />
            </button>
          </div>
          <p>{result.payment_instructions}</p>
          <p className="notice">
            Solicitud recibida, sujeta a confirmación. No se efectuó ningún
            cobro.
          </p>
          <Link className="button" href={"/mi-pedido?codigo=" + result.code}>
            Seguir mi pedido
            <ArrowRight size={16} />
          </Link>
          {result.account_linked && (
            <Link className="text-link" href="/cuenta">
              Ver en mi cuenta
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </main>
    );
  if (!cart.length)
    return (
      <main id="main">
        <EmptyState
          title="Tu carrito está vacío."
          text="Elegí algo que conecte con vos para continuar."
        />
      </main>
    );
  const method = store.settings.delivery.find((d) => d.id === delivery);
  const subtotal = cart.reduce((s, i) => {
    const p = store.products.find((p) => p.id === i.product_id);
    return (
      s +
      (p
        ? p.price +
          (p.variants.find((v) => v.id === i.variant_id)?.price_modifier || 0)
        : 0) *
        i.quantity
    );
  }, 0);
  async function submit(values: Form) {
    setError("");
    if (!payment || !delivery) {
      setError("Elegí el método de pago y de entrega.");
      return;
    }
    if (!consent) {
      setError("Leé y aceptá las condiciones para continuar.");
      return;
    }
    if (!adult) {
      setError("Confirmá que sos mayor de 18 años para continuar.");
      return;
    }
    if (delivery !== "pickup" && values.address.trim().length < 5) {
      setError("Completá la dirección para el envío.");
      return;
    }
    setBusy(true);
    try {
      if (!key.current) key.current = newId();
      const r = await api(
        "orders",
        {
          ...values,
          coupon: appliedCoupon,
          items: cart,
          payment_method: payment,
          delivery_method: delivery,
          consent,
          age_confirmed: adult,
          idempotency_key: key.current,
        },
        { token: accountToken || undefined },
      );
      setResult(r);
      clear();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="container">
      <div className="page-heading">
        <p className="eyebrow">El próximo paso, con tranquilidad</p>
        <h1>Hagámoslo tuyo.</h1>
        <p className="muted">
          La cuenta es opcional. Si{" "}
          <Link href="/cuenta" className="text-link">
            iniciás sesión
          </Link>
          , este pedido aparecerá automáticamente en tu historial.
        </p>
      </div>
      <form onSubmit={handleSubmit(submit)} className="cart-layout">
        <div className="checkout-fields">
          <h3>Tu información</h3>
          {[
            ["customer_name", "Nombre completo", "text", "name"],
            ["phone", "Teléfono / WhatsApp", "tel", "tel"],
            ["email", "Correo electrónico", "email", "email"],
            ["city", "Ciudad", "text", "address-level2"],
            ["address", "Dirección", "text", "street-address"],
            ["reference", "Referencia (opcional)", "text", "off"],
          ].map(([key, label, type, complete]) => (
            <label className="field" key={key}>
              {label}
              <input
                type={type}
                autoComplete={complete}
                {...register(key as keyof Form)}
                aria-invalid={!!errors[key as keyof Form]}
              />
              {errors[key as keyof Form] && (
                <span className="error">
                  {errors[key as keyof Form]?.message}
                </span>
              )}
            </label>
          ))}
          <h3>Cómo lo recibís</h3>
          <div className="wide stack">
            <Choice
              label="Método de entrega"
              value={delivery}
              onChange={setDelivery}
              options={store.settings.delivery
                .filter((d) => d.enabled)
                .map((d) => ({
                  value: d.id,
                  label: `${d.name} · ${d.price ? money(d.price) : "Sin costo"}`,
                }))}
            />
            <p className="notice">{store.settings.shipping_text}</p>
          </div>
          <h3>Cómo preferís pagar</h3>
          <div className="wide stack">
            <Choice
              label="Método de pago"
              value={payment}
              onChange={setPayment}
              options={store.settings.payments
                .filter((p) => p.enabled)
                .map((p) => ({ value: p.id, label: p.name }))}
            />
            {payment && (
              <p className="notice">
                {
                  store.settings.payments.find((p) => p.id === payment)
                    ?.instructions
                }
              </p>
            )}
          </div>
          <label className="field wide">
            ¿Algo que debamos saber? (opcional)
            <textarea {...register("notes")} maxLength={1000} />
          </label>
          <label className="field">
            Cupón (opcional)
            <input
              {...register("coupon", {
                onChange: () => {
                  setDiscountPercent(0);
                  setAppliedCoupon("");
                },
              })}
              maxLength={30}
            />
            <button
              type="button"
              className="text-link"
              onClick={async () => {
                try {
                  const r = await api("coupon", { code: getValues("coupon") });
                  setDiscountPercent(r.percent);
                  setAppliedCoupon(r.code);
                  toast.success("Cupón aplicado");
                } catch (e) {
                  setDiscountPercent(0);
                  setAppliedCoupon("");
                  toast.error((e as Error).message);
                }
              }}
            >
              Aplicar cupón
            </button>
          </label>
        </div>
        <aside className="summary">
          <h3>Tu pedido</h3>
          {cart.map((i) => {
            const p = store.products.find((p) => p.id === i.product_id);
            return (
              <div
                className="row between"
                key={i.product_id + ":" + i.variant_id}
              >
                <span>
                  {p?.neutral_name || "Producto no disponible"} × {i.quantity}
                </span>
                <span>
                  {p &&
                    money(
                      (p.price +
                        (p.variants.find((v) => v.id === i.variant_id)
                          ?.price_modifier || 0)) *
                        i.quantity,
                    )}
                </span>
              </div>
            );
          })}
          <div className="row between">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="row between">
            <span>Entrega</span>
            <span>{method ? money(method.price) : "Elegí una opción"}</span>
          </div>
          {discountPercent > 0 && (
            <div className="row between">
              <span>Descuento ({discountPercent}%)</span>
              <span>
                − {money(Math.round((subtotal * discountPercent) / 100))}
              </span>
            </div>
          )}
          <div className="row between total">
            <span>Total</span>
            <span>
              {money(
                subtotal +
                  (method?.price || 0) -
                  Math.round((subtotal * discountPercent) / 100),
              )}
            </span>
          </div>
          <p className="notice">
            Confirmaremos disponibilidad, entrega y pago antes de avanzar. En
            este paso no se realiza ningún cobro.
          </p>
          <label className="checkline" style={{ marginTop: 25 }}>
            <Checkbox
              checked={adult}
              onCheckedChange={(v) => setAdult(v === true)}
              aria-label="Confirmo que soy mayor de 18 años"
            />
            <span>Confirmo que soy mayor de 18 años.</span>
          </label>
          <label className="checkline" style={{ marginTop: 14 }}>
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              aria-label="Acepto las condiciones"
            />
            <span>
              Leí y acepto los{" "}
              <Link href="/terminos" style={{ textDecoration: "underline" }}>
                términos
              </Link>{" "}
              y la{" "}
              <Link href="/privacidad" style={{ textDecoration: "underline" }}>
                política de privacidad
              </Link>
              .
            </span>
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy} type="submit">
            {busy ? "Guardando tu solicitud…" : "Confirmar pedido"}
            <ArrowRight size={16} />
          </button>
          <p className="row">
            <Lock size={14} /> No solicitamos datos de tarjetas.
          </p>
        </aside>
      </form>
    </main>
  );
}
