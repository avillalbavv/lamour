"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import Link from "next/link";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Package,
  RefreshCw,
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

type AuthView = "login" | "register" | "forgot" | "email-sent" | "recovery";
type Notice = { tone: "info" | "success" | "error"; text: string };
type EmailPurpose = "signup" | "recovery";

function accountRedirect() {
  return `${location.origin}/cuenta`;
}

function authErrorMessage(
  error: { code?: string; status?: number } | null,
  fallback: string,
) {
  switch (error?.code) {
    case "invalid_credentials":
      return "El correo o la contraseña no son correctos.";
    case "email_not_confirmed":
      return "Primero tenés que confirmar tu correo electrónico.";
    case "user_already_exists":
    case "email_exists":
      return "Ese correo ya tiene una cuenta. Probá iniciar sesión o recuperar la contraseña.";
    case "weak_password":
      return "Elegí una contraseña más segura de al menos 8 caracteres.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Se enviaron demasiadas solicitudes. Esperá unos minutos antes de intentar otra vez.";
    case "same_password":
      return "La contraseña nueva debe ser distinta a la anterior.";
    case "signup_disabled":
      return "La creación de cuentas está temporalmente deshabilitada.";
    default:
      return error?.status === 429
        ? "Se hicieron demasiados intentos. Esperá unos minutos y volvé a probar."
        : fallback;
  }
}

function clearAuthUrl() {
  window.history.replaceState({}, "", "/cuenta");
}

export function AccountApp() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [emailPurpose, setEmailPurpose] = useState<EmailPurpose>("signup");
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    const search = new URLSearchParams(location.search);
    const recoveryHint =
      hash.get("type") === "recovery" || search.get("modo") === "recuperar";
    const urlError = hash.get("error_description") || search.get("error_description");

    window.queueMicrotask(() => {
      if (!active) return;
      if (recoveryHint) setView("recovery");
      if (urlError) {
        setView("forgot");
        setNotice({
          tone: "error",
          text: "El enlace venció o ya fue utilizado. Solicitá uno nuevo.",
        });
        clearAuthUrl();
      }
    });

    getSupabaseClient().then(async (supabase) => {
      if (!active) return;
      setConfigured(Boolean(supabase));
      setClient(supabase);
      if (!supabase) {
        setAuthReady(true);
        return;
      }
      const listener = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        if (event === "PASSWORD_RECOVERY") {
          setView("recovery");
          setNotice(null);
        }
        if (event === "SIGNED_OUT") {
          setOrders([]);
          setProfile(null);
        }
      });
      unsubscribe = () => listener.data.subscription.unsubscribe();
      const { data } = await supabase.auth.getSession();
      if (active) {
        setSession(data.session);
        setAuthReady(true);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    const controller = new AbortController();
    window.queueMicrotask(() => {
      if (active) setLoadingOrders(true);
    });
    fetch("/api/account/orders", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "No pudimos cargar tus pedidos.");
        if (active) {
          setOrders(data.orders || []);
          setProfile(data.profile || null);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") toast.error(error.message);
      })
      .finally(() => {
        if (active) setLoadingOrders(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [session]);

  function go(next: AuthView) {
    setNotice(null);
    setView(next);
  }

  if (configured === null || !authReady) return <AccountLoading />;
  if (!configured)
    return (
      <main id="main" className="container account-shell">
        <div className="page-heading">
          <p className="eyebrow">Tu espacio personal</p>
          <h1>Mi cuenta.</h1>
        </div>
        <div className="account-empty">
          <ShieldCheck size={34} />
          <h2>El acceso no está disponible.</h2>
          <p>Podés seguir un pedido con su código y tu teléfono o correo.</p>
          <Link className="button" href="/mi-pedido">
            Seguir un pedido <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    );

  if (view === "recovery")
    return session ? (
      <RecoveryForm
        client={client!}
        notice={notice}
        setNotice={setNotice}
        onFinished={() => go("login")}
      />
    ) : (
      <InvalidRecovery onRetry={() => go("forgot")} />
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
            Tus pedidos y datos permanecen privados en un solo lugar.
          </p>
        </div>
      </div>
      <div className="account-auth-layout">
        <section className="account-auth" aria-label="Acceso a la cuenta">
          {view === "login" || view === "register" ? (
            <Tabs
              value={view}
              onValueChange={(value) => go(value as AuthView)}
            >
              <TabsList className="account-tabs" aria-label="Opciones de acceso">
                <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="register">Crear cuenta</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="auth-panel">
                <LoginForm
                  client={client!}
                  email={email}
                  setEmail={setEmail}
                  notice={notice}
                  setNotice={setNotice}
                  onForgot={() => go("forgot")}
                  onEmailSent={() => {
                    setEmailPurpose("signup");
                    go("email-sent");
                  }}
                />
              </TabsContent>
              <TabsContent value="register" className="auth-panel">
                <RegisterForm
                  client={client!}
                  email={email}
                  setEmail={setEmail}
                  notice={notice}
                  setNotice={setNotice}
                  onEmailSent={() => {
                    setEmailPurpose("signup");
                    go("email-sent");
                  }}
                  onLogin={() => go("login")}
                />
              </TabsContent>
            </Tabs>
          ) : view === "forgot" ? (
            <ForgotPasswordForm
              client={client!}
              email={email}
              setEmail={setEmail}
              notice={notice}
              setNotice={setNotice}
              onBack={() => go("login")}
              onEmailSent={() => {
                setEmailPurpose("recovery");
                go("email-sent");
              }}
            />
          ) : (
            <EmailSent
              client={client!}
              email={email}
              purpose={emailPurpose}
              notice={notice}
              setNotice={setNotice}
              onBack={() => go("login")}
            />
          )}
        </section>
        <aside className="account-auth-aside" aria-label="Ventajas de tu cuenta">
          <ShieldCheck size={32} />
          <div>
            <p className="eyebrow">Acceso protegido</p>
            <h2>Todo bajo tu control.</h2>
          </div>
          <ul>
            <li>
              <Package size={18} /> Historial y seguimiento de pedidos
            </li>
            <li>
              <Mail size={18} /> Confirmación segura por correo
            </li>
            <li>
              <LockKeyhole size={18} /> Recuperación privada de contraseña
            </li>
          </ul>
          <p>
            Para cuidar la privacidad de la tienda, nunca mostramos si un correo
            está registrado al solicitar recuperación.
          </p>
        </aside>
      </div>
    </main>
  );
}

function AccountLoading() {
  return (
    <main id="main" className="container account-shell account-loading" role="status">
      <LoaderCircle className="auth-spinner" size={28} />
      <div>
        <strong>Preparando tu acceso…</strong>
        <p className="muted">Esto debería tomar solo unos segundos.</p>
      </div>
    </main>
  );
}

function AuthNotice({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  const Icon = notice.tone === "error" ? CircleAlert : CheckCircle2;
  return (
    <div
      className={`auth-notice ${notice.tone}`}
      role={notice.tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <Icon size={19} />
      <span>{notice.text}</span>
    </div>
  );
}

function PasswordField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field password-field">
      {label}
      <span className="password-control">
        <input {...props} type={visible ? "text" : "password"} />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </span>
    </label>
  );
}

function SubmitLabel({ busy, idle, loading }: { busy: boolean; idle: string; loading: string }) {
  return (
    <>
      {busy && <LoaderCircle className="auth-spinner" size={17} />}
      {busy ? loading : idle}
      {!busy && <ArrowRight size={16} />}
    </>
  );
}

function LoginForm({
  client,
  email,
  setEmail,
  notice,
  setNotice,
  onForgot,
  onEmailSent,
}: {
  client: SupabaseClient;
  email: string;
  setEmail: (value: string) => void;
  notice: Notice | null;
  setNotice: (value: Notice | null) => void;
  onForgot: () => void;
  onEmailSent: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showResend, setShowResend] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setShowResend(false);
    setNotice(null);
    const data = new FormData(event.currentTarget);
    try {
      const { error } = await client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: String(data.get("password") || ""),
      });
      if (error) {
        setShowResend(error.code === "email_not_confirmed");
        setNotice({
          tone: "error",
          text: authErrorMessage(error, "No pudimos iniciar sesión. Intentá nuevamente."),
        });
      }
    } catch {
      setNotice({
        tone: "error",
        text: "No pudimos conectar con el servicio. Revisá tu conexión e intentá otra vez.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (!email.trim()) {
      setNotice({ tone: "error", text: "Ingresá primero tu correo electrónico." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await client.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: accountRedirect() },
      });
      if (error)
        setNotice({
          tone: "error",
          text: authErrorMessage(error, "No pudimos reenviar el correo."),
        });
      else onEmailSent();
    } catch {
      setNotice({ tone: "error", text: "No pudimos reenviar el correo." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="account-form" onSubmit={submit} aria-busy={busy}>
      <div className="auth-form-heading">
        <p className="eyebrow">Bienvenida de vuelta</p>
        <h2>Iniciá sesión.</h2>
      </div>
      <label className="field">
        Correo electrónico
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <PasswordField
        label="Contraseña"
        name="password"
        autoComplete="current-password"
        required
        minLength={8}
      />
      <AuthNotice notice={notice} />
      <button className="button auth-submit" disabled={busy}>
        <SubmitLabel busy={busy} idle="Entrar a mi cuenta" loading="Verificando…" />
      </button>
      <div className="auth-actions">
        <button type="button" className="text-link" onClick={onForgot} disabled={busy}>
          Olvidé mi contraseña
        </button>
        {showResend && (
          <button
            type="button"
            className="text-link"
            onClick={resendConfirmation}
            disabled={busy}
          >
            Reenviar confirmación
          </button>
        )}
      </div>
    </form>
  );
}

function RegisterForm({
  client,
  email,
  setEmail,
  notice,
  setNotice,
  onEmailSent,
  onLogin,
}: {
  client: SupabaseClient;
  email: string;
  setEmail: (value: string) => void;
  notice: Notice | null;
  setNotice: (value: Notice | null) => void;
  onEmailSent: () => void;
  onLogin: () => void;
}) {
  const [adult, setAdult] = useState(false);
  const [legal, setLegal] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!adult || !legal) {
      setNotice({
        tone: "error",
        text: "Confirmá tu mayoría de edad y aceptá las condiciones para continuar.",
      });
      return;
    }
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("password_confirmation") || "");
    const phone = String(form.get("phone") || "").replace(/[^0-9+]/g, "");
    if (password !== confirmation) {
      setNotice({ tone: "error", text: "Las contraseñas no coinciden." });
      return;
    }
    if (phone.replace(/\D/g, "").length < 7) {
      setNotice({ tone: "error", text: "Ingresá un número de teléfono válido." });
      return;
    }
    setBusy(true);
    const now = new Date().toISOString();
    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: accountRedirect(),
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
      if (error) {
        setNotice({
          tone: "error",
          text: authErrorMessage(error, "No pudimos crear la cuenta. Revisá los datos."),
        });
      } else if (!data.session) {
        onEmailSent();
      } else {
        setNotice({ tone: "success", text: "Cuenta creada correctamente." });
      }
    } catch {
      setNotice({
        tone: "error",
        text: "No pudimos conectar con el servicio. Revisá tu conexión e intentá otra vez.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="account-form" onSubmit={submit} aria-busy={busy}>
      <div className="auth-form-heading">
        <p className="eyebrow">Tu cuenta privada</p>
        <h2>Creá tu acceso.</h2>
      </div>
      <label className="field">
        Nombre completo
        <input name="full_name" autoComplete="name" required minLength={2} />
      </label>
      <label className="field">
        Correo electrónico
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="field">
        Teléfono / WhatsApp
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          placeholder="+595 981 000 000"
        />
      </label>
      <PasswordField
        label="Contraseña"
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        aria-describedby="password-help"
      />
      <p className="field-help" id="password-help">
        Usá al menos 8 caracteres y evitá contraseñas repetidas en otros sitios.
      </p>
      <PasswordField
        label="Repetir contraseña"
        name="password_confirmation"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <label className="checkline auth-checkline">
        <Checkbox
          className="auth-checkbox"
          checked={adult}
          onCheckedChange={(value) => setAdult(value === true)}
          aria-label="Confirmo que soy mayor de 18 años"
        />
        <span>Confirmo que soy mayor de 18 años.</span>
      </label>
      <label className="checkline auth-checkline">
        <Checkbox
          className="auth-checkbox"
          checked={legal}
          onCheckedChange={(value) => setLegal(value === true)}
          aria-label="Acepto los términos y la política de privacidad"
        />
        <span>
          Acepto los <Link href="/terminos">términos y condiciones</Link> y la{" "}
          <Link href="/privacidad">política de privacidad</Link>.
        </span>
      </label>
      <AuthNotice notice={notice} />
      <button className="button auth-submit" disabled={busy}>
        <SubmitLabel busy={busy} idle="Crear mi cuenta" loading="Creando tu cuenta…" />
      </button>
      <p className="auth-login-hint">
        ¿Ya tenés cuenta?{" "}
        <button type="button" className="text-link" onClick={onLogin}>
          Iniciar sesión
        </button>
      </p>
    </form>
  );
}

function ForgotPasswordForm({
  client,
  email,
  setEmail,
  notice,
  setNotice,
  onBack,
  onEmailSent,
}: {
  client: SupabaseClient;
  email: string;
  setEmail: (value: string) => void;
  notice: Notice | null;
  setNotice: (value: Notice | null) => void;
  onBack: () => void;
  onEmailSent: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await client.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: accountRedirect() },
      );
      if (error)
        setNotice({
          tone: "error",
          text: authErrorMessage(error, "No pudimos enviar el enlace."),
        });
      else onEmailSent();
    } catch {
      setNotice({
        tone: "error",
        text: "No pudimos conectar con el servicio. Revisá tu conexión e intentá otra vez.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="account-form auth-panel" onSubmit={submit} aria-busy={busy}>
      <button type="button" className="auth-back" onClick={onBack}>
        <ArrowLeft size={17} /> Volver
      </button>
      <div className="auth-form-heading">
        <LockKeyhole size={30} />
        <p className="eyebrow">Recuperación segura</p>
        <h2>Restablecé tu contraseña.</h2>
        <p className="muted">
          Te enviaremos un enlace de un solo uso. No revelaremos si el correo está
          registrado.
        </p>
      </div>
      <label className="field">
        Correo electrónico
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoFocus
        />
      </label>
      <AuthNotice notice={notice} />
      <button className="button auth-submit" disabled={busy}>
        <SubmitLabel busy={busy} idle="Enviar enlace seguro" loading="Solicitando enlace…" />
      </button>
    </form>
  );
}

function EmailSent({
  client,
  email,
  purpose,
  notice,
  setNotice,
  onBack,
}: {
  client: SupabaseClient;
  email: string;
  purpose: EmailPurpose;
  notice: Notice | null;
  setNotice: (value: Notice | null) => void;
  onBack: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function resend() {
    if (!email || cooldown > 0) return;
    setBusy(true);
    setNotice(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } =
        purpose === "signup"
          ? await client.auth.resend({
              type: "signup",
              email: normalizedEmail,
              options: { emailRedirectTo: accountRedirect() },
            })
          : await client.auth.resetPasswordForEmail(normalizedEmail, {
              redirectTo: accountRedirect(),
            });
      if (error)
        setNotice({
          tone: "error",
          text: authErrorMessage(error, "No pudimos reenviar el correo."),
        });
      else {
        setCooldown(30);
        setNotice({ tone: "success", text: "Enviamos un nuevo correo." });
      }
    } catch {
      setNotice({ tone: "error", text: "No pudimos reenviar el correo." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account-form auth-panel auth-email-sent">
      <span className="auth-success-icon">
        <Mail size={32} />
      </span>
      <div className="auth-form-heading">
        <p className="eyebrow">
          {purpose === "signup" ? "Confirmá tu cuenta" : "Recuperación segura"}
        </p>
        <h2>El enlace está en camino.</h2>
        <p className="muted">
          Si existe una cuenta para <strong>{email || "ese correo"}</strong>, el
          mensaje llegará en unos minutos. Revisá también Spam o Promociones.
        </p>
      </div>
      <AuthNotice notice={notice} />
      <button
        type="button"
        className="button secondary"
        onClick={resend}
        disabled={busy || cooldown > 0}
      >
        <RefreshCw className={busy ? "auth-spinner" : ""} size={17} />
        {busy
          ? "Reenviando…"
          : cooldown > 0
            ? `Reenviar en ${cooldown} s`
            : "Reenviar correo"}
      </button>
      <button type="button" className="text-link auth-back-center" onClick={onBack}>
        Volver a iniciar sesión
      </button>
    </div>
  );
}

function RecoveryForm({
  client,
  notice,
  setNotice,
  onFinished,
}: {
  client: SupabaseClient;
  notice: Notice | null;
  setNotice: (value: Notice | null) => void;
  onFinished: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("password_confirmation") || "");
    setNotice(null);
    if (password !== confirmation) {
      setNotice({ tone: "error", text: "Las contraseñas no coinciden." });
      return;
    }
    setBusy(true);
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        setNotice({
          tone: "error",
          text: authErrorMessage(error, "No pudimos actualizar la contraseña."),
        });
        return;
      }
      await client.auth.signOut();
      clearAuthUrl();
      onFinished();
      toast.success("Contraseña actualizada. Ya podés iniciar sesión.");
    } catch {
      setNotice({
        tone: "error",
        text: "No pudimos completar el cambio. Solicitá un enlace nuevo.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main" className="container account-shell recovery-shell">
      <section className="account-auth auth-panel">
        <form className="account-form" onSubmit={submit} aria-busy={busy}>
          <div className="auth-form-heading">
            <LockKeyhole size={32} />
            <p className="eyebrow">Enlace verificado</p>
            <h1>Elegí una contraseña nueva.</h1>
            <p className="muted">El cambio cerrará esta sesión temporal.</p>
          </div>
          <PasswordField
            label="Nueva contraseña"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            autoFocus
          />
          <PasswordField
            label="Repetir contraseña"
            name="password_confirmation"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <AuthNotice notice={notice} />
          <button className="button auth-submit" disabled={busy}>
            <SubmitLabel busy={busy} idle="Guardar contraseña" loading="Guardando…" />
          </button>
        </form>
      </section>
    </main>
  );
}

function InvalidRecovery({ onRetry }: { onRetry: () => void }) {
  return (
    <main id="main" className="container account-shell recovery-shell">
      <section className="account-auth auth-panel auth-email-sent">
        <span className="auth-error-icon">
          <CircleAlert size={32} />
        </span>
        <div className="auth-form-heading">
          <p className="eyebrow">Enlace no válido</p>
          <h1>Necesitás un enlace nuevo.</h1>
          <p className="muted">
            El enlace pudo haber vencido o ya fue utilizado. Solicitá otro para
            continuar de forma segura.
          </p>
        </div>
        <button className="button" onClick={onRetry}>
          Solicitar otro enlace <ArrowRight size={17} />
        </button>
      </section>
    </main>
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
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
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
          <UserRound size={19} /> {String(profile?.phone || "Teléfono pendiente")}
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
              toast.error("La nueva contraseña debe tener al menos 8 caracteres.");
              return;
            }
            if (newPassword !== passwordConfirmation) {
              toast.error("Las contraseñas no coinciden.");
              return;
            }
            setPasswordBusy(true);
            try {
              const { error } = await client.auth.updateUser({ password: newPassword });
              if (error) toast.error(authErrorMessage(error, "No pudimos actualizar la contraseña."));
              else {
                setNewPassword("");
                setPasswordConfirmation("");
                toast.success("Contraseña actualizada.");
              }
            } catch {
              toast.error("No pudimos actualizar la contraseña.");
            } finally {
              setPasswordBusy(false);
            }
          }}
        >
          <PasswordField
            label="Nueva contraseña"
            autoComplete="new-password"
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          <PasswordField
            label="Repetir contraseña"
            autoComplete="new-password"
            minLength={8}
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            required
          />
          <button className="button" disabled={passwordBusy}>
            <SubmitLabel busy={passwordBusy} idle="Actualizar contraseña" loading="Actualizando…" />
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
          <div className="account-orders-loading" role="status">
            <LoaderCircle className="auth-spinner" size={24} /> Cargando pedidos…
          </div>
        ) : orders.length ? (
          orders.map((order) => (
            <details className="account-order" key={order.id}>
              <summary>
                <span>
                  <strong>{order.order_code}</strong>
                  <small>
                    {new Date(order.created_at).toLocaleDateString("es-PY")} · {order.status}
                  </small>
                </span>
                <strong>{money(order.total)}</strong>
              </summary>
              <div className="account-order-body">
                <div>
                  {order.items.map((item, index) => (
                    <p key={`${item.name_snapshot}-${index}`}>
                      {item.name_snapshot} {item.variant_snapshot} × {item.quantity}
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
