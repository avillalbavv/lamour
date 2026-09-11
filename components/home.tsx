"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Package,
  Lock,
  ShieldCheck,
  MessageCircle,
  Truck,
  ArrowUpRight,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useStore } from "./store-provider";
import { Isotipo } from "./brand";
import { ProductGrid } from "./products";
import { LoadState } from "./primitives";
import { api } from "@/lib/api";
export function CategoryEditorialGrid() {
  const { store, discreet } = useStore();
  const cats = store?.categories || [];
  const arranged = [
    cats.find((c) => c.id === "personal"),
    cats.find((c) => c.id === "parejas"),
    cats.find((c) => c.id === "cuidado"),
  ].filter(Boolean);
  const show = arranged.length === 3 ? arranged : cats.slice(0, 3);
  return (
    <>
      <div className="editorial-grid">
        {show.map(
          (c, i) =>
            c && (
              <Link
                key={c.id}
                href={"/tienda?categoria=" + c.slug}
                className="category-tile"
              >
                <img
                  className={discreet ? "blurred" : ""}
                  src={c.image_url}
                  width="400"
                  height="400"
                  alt={c.name}
                  loading="lazy"
                />
                <div className="category-caption">
                  <div>
                    <h3>{c.name}</h3>
                    <p>{c.description}</p>
                  </div>
                  <ArrowUpRight size={23} />
                </div>
              </Link>
            ),
        )}
      </div>
      <div className="extra-categories">
        {cats
          .filter((c) => !show.some((s) => s?.id === c.id))
          .map((c) => (
            <Link
              key={c.id}
              className="text-link"
              href={"/tienda?categoria=" + c.slug}
            >
              {c.name}
              <ArrowRight size={15} />
            </Link>
          ))}
        <Link className="text-link" href="/tienda?novedades=1">
          Las novedades
          <ArrowRight size={15} />
        </Link>
        <Link className="text-link" href="/tienda?ofertas=1">
          Ofertas
          <ArrowRight size={15} />
        </Link>
      </div>
    </>
  );
}
export function Newsletter() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <section className="section container newsletter">
      <div>
        <p className="eyebrow" style={{ marginBottom: 14 }}>
          Cerca, sin invadir
        </p>
        <h2>
          Un poco de L’Amour
          <br />
          en tu inbox.
        </h2>
        <p className="muted">
          Novedades y pequeños rituales. Solo cuando haya algo lindo para
          contarte.
        </p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!consent) {
            toast.error("Aceptá recibir novedades para suscribirte.");
            return;
          }
          setBusy(true);
          try {
            await api("newsletter", { email, consent });
            setDone(true);
            toast.success("Ya sos parte. Gracias por acompañarnos.");
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {done ? (
          <p role="status">Gracias. Ya guardamos tu suscripción.</p>
        ) : (
          <>
            <div className="newsletter-input">
              <label htmlFor="newsletter-email" className="sr-only">
                Tu correo electrónico
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Tu correo electrónico"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                className="icon-button"
                aria-label="Suscribirme"
                disabled={busy}
              >
                <ArrowRight size={23} />
              </button>
            </div>
            <label className="newsletter-consent">
              <Checkbox
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                aria-label="Acepto recibir novedades"
              />
              <span>
                Acepto recibir novedades y leí la{" "}
                <Link
                  href="/privacidad"
                  style={{ textDecoration: "underline" }}
                >
                  política de privacidad
                </Link>
                .
              </span>
            </label>
          </>
        )}
      </form>
    </section>
  );
}
export function Home() {
  const { store } = useStore();
  const offers =
    store?.products.filter(
      (product) =>
        product.compare_at_price !== null &&
        product.compare_at_price > product.price,
    ) || [];
  return (
    <main id="main">
      <div className="container">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Boutique íntima · Paraguay</p>
            <h1>
              {!store ||
              store.settings.hero_title ===
                "Más que un placer, un espacio para ti." ? (
                <>
                  Más que un placer,
                  <br />
                  un espacio
                  <br />
                  <em>para ti.</em>
                </>
              ) : (
                store.settings.hero_title
              )}
            </h1>
            <p>
              {store?.settings.hero_description ||
                "Bienestar íntimo, diseño y discreción en una experiencia pensada para acompañarte."}
            </p>
            <div className="hero-ctas">
              <Link className="button" href="/tienda">
                Descubrir la tienda
                <ArrowRight size={17} />
              </Link>
              <Link className="text-link" href="/sobre-lamour">
                Conocer L’Amour
              </Link>
            </div>
            <div className="hero-note">
              <Lock size={13} />
              <span>Elegís con libertad. Recibís con discreción.</span>
            </div>
          </div>
          <div className="hero-art">
            <img
              src={
                store?.settings.hero_image || "/images/brand-woman-flower.webp"
              }
              alt="Retrato editorial con orquídea en tonos vino"
              width="868"
              height="1228"
              fetchPriority="high"
            />
            <div className="hero-symbol">
              <Isotipo />
            </div>
            <span className="hero-caption">ELEGANCIA ÍNTIMA, A TU MANERA</span>
          </div>
        </section>
        <div className="trust-line">
          <span>
            <Package size={19} /> Empaque discreto
          </span>
          <span>
            <MessageCircle size={19} /> Atención personalizada
          </span>
          <span>
            <Truck size={19} /> Envíos en Paraguay
          </span>
        </div>
      </div>
      <section className="section container">
        <div className="section-head">
          <div>
            <p className="eyebrow">Cada momento, una forma de sentir</p>
            <h2>Descubrí tu espacio.</h2>
          </div>
          <Link className="text-link" href="/categorias">
            Explorar todo
            <ArrowRight size={16} />
          </Link>
        </div>
        {store ? <CategoryEditorialGrid /> : <LoadState />}
      </section>
      <section className="section container" style={{ paddingTop: 15 }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Una selección para vos</p>
            <h2>Pequeños descubrimientos.</h2>
          </div>
          <Link className="text-link" href="/tienda">
            Ver la tienda
            <ArrowRight size={16} />
          </Link>
        </div>
        {store ? (
          <ProductGrid
            products={store.products.filter((p) => p.featured).slice(0, 4)}
            className="home-products"
          />
        ) : (
          <LoadState />
        )}
      </section>
      <section className="container brand-story">
        <img
          className="brand-story-image"
          src={store?.settings.story_image || "/images/brand-woman-satin.webp"}
          alt="Retrato editorial envuelto en satén color vino"
          width="640"
          height="1192"
          loading="lazy"
        />
        <div>
          <p className="eyebrow" style={{ marginBottom: 18 }}>
            El universo L’Amour
          </p>
          <h2>
            {store?.settings.story_title ||
              "Lo íntimo también es extraordinario."}
          </h2>
          <p>
            {store?.settings.story_description ||
              "Creemos en el bienestar que empieza con vos. En elegir sin apuro, descubrir sin prejuicios y encontrar detalles que se sientan propios."}
          </p>
          <Link className="text-link" href="/sobre-lamour">
            Nuestra esencia
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <section className="section container offer-section">
        <div className="offer-banner">
          <div>
            <p className="eyebrow">Oportunidades L’Amour</p>
            <h2>Ofertas para descubrir.</h2>
            <p>
              Una selección especial, siempre con el mismo cuidado y discreción.
            </p>
          </div>
          <Link className="button" href="/tienda?ofertas=1">
            Ver ofertas
            <ArrowRight size={17} />
          </Link>
        </div>
        {offers.length > 0 && (
          <ProductGrid
            products={offers.slice(0, 4)}
            className="offer-products"
          />
        )}
      </section>
      <section className="section container order-section">
        <div>
          <p className="eyebrow">Especialmente para vos</p>
          <h2>
            Lo elegís.
            <br />
            <em>Nosotros lo conseguimos.</em>
          </h2>
          <p className="muted">
            Hay cosas que vale la pena esperar. Descubrí nuestra selección por
            pedido, con acompañamiento en cada paso.
          </p>
          <Link className="text-link" href="/tienda?disponibilidad=on_order">
            Ver productos por pedido
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="order-steps">
          {[
            [
              "01",
              "Elegí tu producto.",
              "Encontrá ese detalle que conecta con vos.",
            ],
            [
              "02",
              "Confirmamos disponibilidad y plazo.",
              "Vas a saber qué esperar antes de avanzar.",
            ],
            [
              "03",
              "Te acompañamos hasta recibirlo.",
              "Consultá el estado de tu pedido cuando quieras.",
            ],
          ].map(([n, t, d]) => (
            <div className="order-step" key={n}>
              <span>{n}</span>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="privacy-section">
        <div className="container">
          <div className="section-head">
            <div>
              <p
                className="eyebrow"
                style={{ marginBottom: 15, color: "#d7c6c6" }}
              >
                Tu confianza, en cada detalle
              </p>
              <h2>Privado desde el primer clic.</h2>
            </div>
            <Lock size={35} className="desktop-only" />
          </div>
          <div className="privacy-grid">
            {[
              [
                Package,
                "Empaque discreto",
                "Una presentación cuidada, sin referencias al contenido en el exterior.",
              ],
              [
                MessageCircle,
                "Comunicación reservada",
                "Vos decidís qué compartir y cómo querés que te acompañemos.",
              ],
              [
                ShieldCheck,
                "Cuidado de tus datos",
                "Pedimos la información necesaria para gestionar tu experiencia.",
              ],
            ].map(([Icon, t, d], i) => {
              const I = Icon as typeof Lock;
              return (
                <div key={i}>
                  <I size={26} />
                  <h3>{t as string}</h3>
                  <p>{d as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <Newsletter />
    </main>
  );
}
