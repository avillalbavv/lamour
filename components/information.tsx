"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, MessageCircle, Mail } from "lucide-react";
import { useStore } from "./store-provider";
import { LoadState } from "./primitives";
import { CategoryEditorialGrid } from "./home";
import { api } from "@/lib/api";
import { statuses } from "@/lib/types";
export function OrderTimeline({
  status,
  events,
}: {
  status: string;
  events: any[];
}) {
  return (
    <ol className="timeline">
      {(status === "Cancelado"
        ? [
            ...events
              .filter((e: any) => e.status !== "Cancelado")
              .map((e: any) => e.status),
            "Cancelado",
          ]
        : statuses.filter((s) => s !== "Cancelado")
      ).map((s, i) => {
        const actual = events.find((e: any) => e.status === s);
        return (
          <li
            key={s + i}
            className={
              (actual ? "done " : "") + (status === s ? "current" : "")
            }
          >
            <span>{s}</span>
            {actual && (
              <p style={{ fontSize: 12, fontWeight: 400 }}>
                {new Date(actual.created_at).toLocaleString("es-PY")}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
export function Tracking() {
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("codigo") || "");
  const [verification, setVerification] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main id="main" className="container tracking">
      <div className="page-heading">
        <p className="eyebrow">Te acompañamos en cada paso</p>
        <h1>Tu pedido, más cerca.</h1>
        <p className="muted">
          Consultá el estado con el código y el teléfono o correo que usaste.
        </p>
      </div>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setResult(null);
          try {
            setResult(await api("track", { code, verification }));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Código de pedido
          <input
            placeholder="LA-2026-…"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <label className="field">
          Teléfono o correo de verificación
          <input
            value={verification}
            onChange={(e) => setVerification(e.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Consultando…" : "Consultar mi pedido"}
          <ArrowRight size={16} />
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
      {result && (
        <div style={{ marginTop: 35 }}>
          <h3>{result.code}</h3>
          <OrderTimeline status={result.status} events={result.events} />
        </div>
      )}
    </main>
  );
}
const faqs = [
  [
    "¿Cómo funcionan los productos por pedido?",
    "Elegís el producto y enviás tu solicitud. Confirmamos con el proveedor la disponibilidad y el plazo antes de avanzar. Cada ficha muestra su propio rango estimado.",
  ],
  [
    "¿Cómo llega el empaque?",
    "La entrega se prepara en un empaque discreto, sin referencias al contenido en el exterior.",
  ],
  [
    "¿Puedo combinar productos disponibles y por pedido?",
    "Sí. Te avisaremos que los tiempos son diferentes y coordinaremos si recibís todo junto o por separado. Cualquier costo adicional se confirma antes de avanzar.",
  ],
  [
    "¿Necesito crear una cuenta?",
    "No. La cuenta es opcional: permite ver el historial y seguimiento en un solo lugar. También podés comprar como invitado y consultar con el código y tu teléfono o correo.",
  ],
  [
    "¿Cómo funciona el modo discreto?",
    "Difumina las imágenes y muestra nombres neutros en las vistas rápidas. Podés revelar una imagen cuando quieras. La preferencia se guarda en este dispositivo y no oculta el historial del navegador.",
  ],
  [
    "¿Cómo puedo pagar?",
    "Los métodos habilitados aparecen en el checkout. Nunca pedimos datos de tarjetas. Los pagos manuales se confirman según las instrucciones del método elegido.",
  ],
  [
    "¿Puedo cancelar o cambiar mi pedido?",
    "Contactanos con tu código antes de que avance la preparación o el pedido al proveedor. Las condiciones específicas se publican en los términos de compra.",
  ],
];
export function Information({ page }: { page: string }) {
  const { store } = useStore();
  if (page === "categorias")
    return (
      <main id="main" className="container">
        <div className="page-heading">
          <p className="eyebrow">El universo L’Amour</p>
          <h1>Un espacio para cada momento.</h1>
        </div>
        <section style={{ paddingBottom: 80 }}>
          <CategoryEditorialGrid />
        </section>
      </main>
    );
  const title: Record<string, string> = {
    "sobre-lamour": "Lo íntimo también es extraordinario.",
    "preguntas-frecuentes": "Hablemos con confianza.",
    envios: "Hasta tus manos.",
    privacidad: "Tu confianza, cuidada.",
    terminos: "Todo claro, desde el inicio.",
    contacto: "Estamos para acompañarte.",
  };
  return (
    <main id="main" className="container prose">
      <div className="page-heading">
        <p className="eyebrow">L’Amour</p>
        <h1>{title[page] || "L’Amour"}</h1>
      </div>
      {page === "sobre-lamour" ? (
        <>
          <img
            src="/images/packaging.webp"
            alt="Empaque editorial marfil y cinta malva"
            width="780"
            height="520"
            style={{ borderRadius: 5 }}
          />
          <p>
            L’Amour nace de una idea simple: descubrir tu bienestar íntimo puede
            ser una experiencia cómoda, privada y bonita.
          </p>
          <p>
            Queremos acompañarte a elegir a tu ritmo, sin prejuicios y sin
            presiones. Con información clara, atención cercana y detalles
            cuidados desde el primer clic hasta la entrega.
          </p>
          <h2>Tu intimidad, a tu manera.</h2>
          <p>
            Nuestra selección combina bienestar personal, propuestas para
            parejas, cuidado íntimo y accesorios. Algunos productos están
            disponibles y otros se consiguen por pedido; siempre te contamos
            cuál es el caso antes de avanzar.
          </p>
          <Link className="button" href="/tienda">
            Conocé la selección
            <ArrowRight size={16} />
          </Link>
        </>
      ) : page === "preguntas-frecuentes" ? (
        faqs.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))
      ) : !store ? (
        <LoadState />
      ) : page === "contacto" ? (
        <>
          {store.settings.legal_name && (
            <div className="notice">
              <strong>{store.settings.legal_name}</strong>
              {store.settings.tax_id && <p>RUC: {store.settings.tax_id}</p>}
              {store.settings.business_address && (
                <p>{store.settings.business_address}</p>
              )}
            </div>
          )}
          <p>
            Para consultas sobre un pedido, tené a mano tu código. Compartí solo
            la información que quieras incluir.
          </p>
          {store.settings.contact_email || store.settings.whatsapp ? (
            <div className="stack">
              {store.settings.contact_email && (
                <a
                  className="text-link"
                  href={"mailto:" + store.settings.contact_email}
                >
                  <Mail size={20} />
                  {store.settings.contact_email}
                </a>
              )}
              {store.settings.whatsapp && (
                <a
                  className="button"
                  href={`https://wa.me/${store.settings.whatsapp}?text=${encodeURIComponent("Hola, tengo una consulta sobre L’Amour.")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={20} /> Escribinos por WhatsApp
                </a>
              )}
            </div>
          ) : (
            <p className="notice">
              Pronto vas a encontrar acá nuestros canales de atención. Mientras
              tanto, podés explorar la tienda y consultar el estado de tu
              solicitud.
            </p>
          )}
          <Link className="text-link" href="/mi-pedido">
            Seguir mi pedido
            <ArrowRight size={16} />
          </Link>
        </>
      ) : (
        <PolicyContent
          text={
            page === "envios"
              ? store.settings.shipping_text
              : page === "privacidad"
                ? store.settings.privacy_text
                : store.settings.terms_text
          }
        />
      )}
    </main>
  );
}

function PolicyContent({ text }: { text: string }) {
  return (
    <div className="policy-content">
      {text.split(/\n\s*\n/).map((block, index) => {
        const value = block.trim();
        if (!value) return null;
        const heading = /^(\d+\.|[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{4,})/.test(value);
        return heading ? (
          <h2 key={index}>{value}</h2>
        ) : (
          <p key={index}>{value}</p>
        );
      })}
    </div>
  );
}
