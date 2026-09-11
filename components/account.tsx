"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  CheckCircle2,
  LogOut,
  Mail,
  Package,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSupabaseClient } from "@/lib/supabase-client";
import { POLICY_VERSION } from "@/lib/catalog-presentation";
import { money } from "@/lib/types";
import { OrderTimeline } from "./information";
import { LoadState } from "./primitives";

type AccountOrder = {
  id: string;
  order_code: string;
  status: string;
  total: number;
  city: string;
  created_at: string;
  items: Array<{
    name_snapshot: string;
    variant_snapshot: string;
    quantity: number;
    price_snapshot: number;
  }>;
  events: Array<{ status: string; created_at: string }>;
};

export function AccountApp() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    getSupabaseClient().then(async (supabase) => {
      if (!active) return;
      setConfigured(Boolean(supabase));
      setClient(supabase);
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (active) setSession(data.session);
      const listener = supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          if (active) setSession(nextSession);
        },
      );
      unsubscribe = () => listener.data.subscription.unsubscribe();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setOrders([]);
      setProfile(null);
      return;
    }
    setLoadingOrders(true);
    fetch("/api/account/orders", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "No pudimos cargar tus pedidos.");
        setOrders(data.orders || []);
        setProfile(data.profile || null);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoadingOrders(false));
  }, [session]);

  if (configured === null) return <LoadState />;
  if (!configured)
    return (
      <main id="main" className="container account-shell">
        <div className="page-heading">
          <p className="eyebrow">Tu espacio personal</p>
          <h1>Mi cuenta.</h1>
          <p className="muted">
            El área de cuentas está preparada y se habilitará al conectar el
            proyecto de autenticación.
          </p>
        </div>
        <div className="account-empty">
          <ShieldCheck size={34} />
          <h2>Seguimiento privado, en un solo lugar.</h2>
          <p>
            Mientras se completa la conexión, podés seguir cualquier pedido con
            su código y tu teléfono o correo.
          </p>
          <Link className="button" href="/mi-pedido">
            Seguir un pedido <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    );

  if (session)
    return (
      <AccountDashboard
        client={client!}
        session={session}
        orders={orders}
        profile={profile}
        loadingOrders={loadingOrders}
      />
    );

  return (
    <main id="main" className="container account-shell">
      <div className="page-heading account-heading">
        <div>
          <p className="eyebrow">Tu espacio personal</p>
          <h1>Entrá con tranquilidad.</h1>
          <p className="muted">
            Consultá todos tus pedidos sin volver a ingresar códigos.
          </p>
        </div>
        <div className="account-benefits">
          <span>
            <Package size={17} /> Historial y seguimiento
          </span>
          <span>
            <ShieldCheck size={17} /> Acceso privado
          </span>
          <span>
            <Mail size={17} /> Avisos operativos
          </span>
        </div>
      </div>
      <Tabs defaultValue="login" className="account-auth">
        <TabsList>
          <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
          <TabsTrigger value="register">Crear cuenta</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <LoginForm
            client={client!}
            busy={busy}
            setBusy={setBusy}
            message={message}
            setMessage={setMessage}
          />
        </TabsContent>
        <TabsContent value="register">
          <RegisterForm
            client={client!}
            busy={busy}
            setBusy={setBusy}
            message={message}
            setMessage={setMessage}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function LoginForm({
  client,
  busy,
  setBusy,
  message,
  setMessage,
}: {
  client: SupabaseClient;
  busy: boolean;
  setBusy: (value: boolean) => void;
  message: string;
  setMessage: (value: string) => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const { error } = await client.auth.signInWithPassword({
      email: String(data.get("email") || "").trim(),
      password: String(data.get("password") || ""),
    });
    if (error)
      setMessage(
        "No pudimos iniciar sesión. Revisá tus datos o confirmá tu correo.",
      );
    setBusy(false);
  }
  return (
    <form className="account-form" onSubmit={submit}>
      <label className="field">
        Correo electrónico
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </label>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? "Ingresando…" : "Entrar a mi cuenta"} <ArrowRight size={16} />
      </button>
      <button
        type="button"
        className="text-link"
        onClick={async () => {
          const email = window
            .prompt("Ingresá el correo de tu cuenta:")
            ?.trim();
          if (!email) return;
          const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: `${location.origin}/cuenta`,
          });
          setMessage(
            error
              ? "No pudimos enviar el correo. Intentá nuevamente."
              : "Si la cuenta existe, recibirás un enlace para recuperar tu acceso.",
          );
        }}
      >
        Olvidé mi contraseña
      </button>
    </form>
  );
}

function RegisterForm({
  client,
  busy,
  setBusy,
  message,
  setMessage,
}: {
  client: SupabaseClient;
  busy: boolean;
  setBusy: (value: boolean) => void;
  message: string;
  setMessage: (value: string) => void;
}) {
  const [adult, setAdult] = useState(false);
  const [legal, setLegal] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!adult || !legal) {
      setMessage("Confirmá tu mayoría de edad y aceptá las condiciones.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("password_confirmation") || "");
    const phone = String(form.get("phone") || "").replace(/[^0-9+]/g, "");
    if (password !== confirmation) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 7) {
      setMessage("Ingresá un número de teléfono válido.");
      return;
    }
    setBusy(true);
    const now = new Date().toISOString();
    const { data, error } = await client.auth.signUp({
      email: String(form.get("email") || "").trim(),
      password,
      options: {
        emailRedirectTo: `${location.origin}/cuenta`,
        data: {
          full_name: String(form.get("full_name") || "").trim(),
          phone,
          age_confirmed: true,
          age_confirmed_at: now,
          terms_version: POLICY_VERSION,
          privacy_version: POLICY_VERSION,
        },
      },
    });
    if (error)
      setMessage(
        "No pudimos crear la cuenta. Revisá los datos o probá con otro correo.",
      );
    else if (!data.session)
      setMessage("Cuenta creada. Revisá tu correo para confirmar el acceso.");
    else setMessage("Cuenta creada correctamente.");
    setBusy(false);
  }
  return (
    <form className="account-form" onSubmit={submit}>
      <label className="field">
        Nombre completo
        <input name="full_name" autoComplete="name" required minLength={2} />
      </label>
      <label className="field">
        Correo electrónico
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Teléfono / WhatsApp
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          placeholder="+595…"
        />
      </label>
      <label className="field">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </label>
      <label className="field">
        Repetir contraseña
        <input
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </label>
      <label className="checkline">
        <Checkbox
          checked={adult}
          onCheckedChange={(value) => setAdult(value === true)}
        />
        Confirmo que soy mayor de 18 años.
      </label>
      <label className="checkline">
        <Checkbox
          checked={legal}
          onCheckedChange={(value) => setLegal(value === true)}
        />
        <span>
          Acepto los <Link href="/terminos">términos y condiciones</Link> y la{" "}
          <Link href="/privacidad">política de privacidad</Link>.
        </span>
      </label>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? "Creando tu cuenta…" : "Crear mi cuenta"}{" "}
        <ArrowRight size={16} />
      </button>
      <p className="field-help">
        La cuenta es personal y exclusiva para mayores de 18 años.
      </p>
    </form>
  );
}

function AccountDashboard({
  client,
  session,
  orders,
  profile,
  loadingOrders,
}: {
  client: SupabaseClient;
  session: Session;
  orders: AccountOrder[];
  profile: Record<string, unknown> | null;
  loadingOrders: boolean;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  return (
    <main id="main" className="container account-shell">
      <div className="page-heading account-heading">
        <div>
          <p className="eyebrow">Mi cuenta</p>
          <h1>Hola, {String(profile?.full_name || "qué lindo verte")}.</h1>
          <p className="muted">{session.user.email}</p>
        </div>
        <button className="text-link" onClick={() => client.auth.signOut()}>
          Cerrar sesión <LogOut size={16} />
        </button>
      </div>
      <div className="account-profile">
        <span>
          <UserRound size={19} />{" "}
          {String(profile?.phone || "Teléfono pendiente")}
        </span>
        <span>
          <CheckCircle2 size={19} /> Mayoría de edad confirmada
        </span>
      </div>
      <details className="account-settings">
        <summary>Seguridad de la cuenta</summary>
        <form
          className="account-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (newPassword.length < 8) {
              toast.error(
                "La nueva contraseña debe tener al menos 8 caracteres.",
              );
              return;
            }
            setPasswordBusy(true);
            const { error } = await client.auth.updateUser({
              password: newPassword,
            });
            setPasswordBusy(false);
            if (error) toast.error("No pudimos actualizar la contraseña.");
            else {
              setNewPassword("");
              toast.success("Contraseña actualizada.");
            }
          }}
        >
          <label className="field">
            Nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>
          <button className="button" disabled={passwordBusy}>
            {passwordBusy ? "Actualizando…" : "Actualizar contraseña"}
          </button>
        </form>
      </details>
      <section className="account-orders">
        <div className="section-head">
          <div>
            <p className="eyebrow">Historial privado</p>
            <h2>Mis pedidos.</h2>
          </div>
          <Link className="text-link" href="/tienda">
            Seguir comprando
          </Link>
        </div>
        {loadingOrders ? (
          <LoadState />
        ) : orders.length ? (
          orders.map((order) => (
            <details className="account-order" key={order.id}>
              <summary>
                <span>
                  <strong>{order.order_code}</strong>
                  <small>
                    {new Date(order.created_at).toLocaleDateString("es-PY")} ·{" "}
                    {order.status}
                  </small>
                </span>
                <strong>{money(order.total)}</strong>
              </summary>
              <div className="account-order-body">
                <div>
                  {order.items.map((item, index) => (
                    <p key={`${item.name_snapshot}-${index}`}>
                      {item.name_snapshot} {item.variant_snapshot} ×{" "}
                      {item.quantity}
                    </p>
                  ))}
                </div>
                <OrderTimeline status={order.status} events={order.events} />
              </div>
            </details>
          ))
        ) : (
          <div className="account-empty">
            <Package size={32} />
            <h3>Todavía no hay pedidos en tu cuenta.</h3>
            <p>
              Si hiciste uno como invitado con el mismo correo y teléfono, se
              asociará automáticamente.
            </p>
            <Link className="button" href="/tienda">
              Descubrir la tienda
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
