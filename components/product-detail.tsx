"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import {
  Heart,
  Package,
  ArrowRight,
  ZoomIn,
  Check,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useStore } from "./store-provider";
import {
  AvailabilityBadge,
  Price,
  ProductImage,
  ProductGrid,
} from "./products";
import { EmptyState, LoadState } from "./primitives";
import { lead, money } from "@/lib/types";
export function ProductDetail({ slug }: { slug: string }) {
  const { store, add, favorite, favorites, discreet } = useStore();
  const [selected, setSelected] = useState(0);
  const [variant, setVariant] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [zoom, setZoom] = useState(false);
  const start = useRef(0);
  if (!store)
    return (
      <main id="main">
        <LoadState />
      </main>
    );
  const p = store.products.find((p) => p.slug === slug);
  if (!p)
    return (
      <main id="main">
        <EmptyState
          title="Este producto no está disponible."
          text="Podés seguir explorando nuestra selección."
        />
      </main>
    );
  const v = p.variants.find((v) => v.id === variant);
  const price = p.price + (v?.price_modifier || 0);
  const sale = p.compare_at_price !== null && p.compare_at_price > p.price;
  const savings = sale ? p.compare_at_price! - p.price : 0;
  const maxQuantity =
    p.availability_type === "on_order"
      ? 20
      : Math.max(1, Math.min(20, v?.stock_quantity ?? p.stock_quantity));
  const category = store.categories.find((c) => c.id === p.category_id);
  return (
    <main id="main" className="container">
      <p className="results-note" style={{ padding: "20px 0" }}>
        <Link href="/tienda">Tienda</Link> /{" "}
        {category && (
          <>
            <Link href={`/tienda?categoria=${category.slug}`}>
              {category.name}
            </Link>{" "}
            /{" "}
          </>
        )}
        {discreet ? p.neutral_name : p.name}
      </p>
      <div className="detail-grid">
        <div>
          <div
            className="detail-main"
            onTouchStart={(e) => (start.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const d = e.changedTouches[0].clientX - start.current;
              if (Math.abs(d) > 40)
                setSelected(
                  (i) =>
                    (i + (d < 0 ? 1 : -1) + p.images.length) % p.images.length,
                );
            }}
          >
            <ProductImage key={selected} product={p} index={selected} />
            <button
              className="icon-button"
              style={{
                position: "absolute",
                right: 10,
                bottom: 10,
                background: "var(--background)",
                borderRadius: "50%",
              }}
              aria-label="Ampliar imagen"
              onClick={() => setZoom(true)}
            >
              <ZoomIn size={20} />
            </button>
          </div>
          <div className="thumbs">
            {p.images.map((im, i) => (
              <button
                key={im + i}
                onClick={() => setSelected(i)}
                className={i === selected ? "selected" : ""}
                aria-label={"Ver imagen " + (i + 1)}
              >
                <img
                  className={discreet ? "blurred" : ""}
                  src={im}
                  alt=""
                  width="78"
                  height="78"
                />
              </button>
            ))}
          </div>
        </div>
        <div className="product-info">
          {p.notice_text && (
            <div className={`product-notice ${p.notice_tone}`}>
              {p.notice_text}
            </div>
          )}
          <p className="eyebrow">{category?.name}</p>
          <h1>{discreet ? p.neutral_name : p.name}</h1>
          <Price value={price} previous={p.compare_at_price} />
          {sale && <p className="sale-saving">Ahorrás {money(savings)}</p>}
          <p>{p.short_description}</p>
          {p.highlights.length > 0 && (
            <ul className="product-highlights">
              {p.highlights.map((item) => (
                <li key={item}>
                  <Check size={16} /> {item}
                </li>
              ))}
            </ul>
          )}
          <AvailabilityBadge value={p.availability_type} />
          {p.availability_type === "on_order" ? (
            <div className="notice" style={{ marginTop: 20 }}>
              <strong>Plazo estimado: {lead(p)}</strong>
              <p>
                Disponibilidad pendiente de confirmación. Te contactaremos antes
                de avanzar.
              </p>
              {store.settings.reservation_text && (
                <p>{store.settings.reservation_text}</p>
              )}
            </div>
          ) : (
            <p className="lead-time">
              {p.is_demo
                ? "Disponibilidad a confirmar"
                : p.stock_quantity > 0
                  ? `${p.stock_quantity} unidades disponibles`
                  : "Sin unidades disponibles"}
            </p>
          )}
          {p.variants.some((a) => a.active) && (
            <fieldset className="variant-fieldset">
              <legend>Elegí una variante</legend>
              <div className="variant-options">
                {p.variants
                  .filter((option) => option.active)
                  .map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={variant === option.id ? "selected" : ""}
                      aria-pressed={variant === option.id}
                      disabled={
                        p.availability_type !== "on_order" &&
                        option.stock_quantity === 0
                      }
                      onClick={() => {
                        setVariant(option.id);
                        setQuantity(1);
                      }}
                    >
                      <span>{option.name}</span>
                      <strong>{option.value}</strong>
                      {option.price_modifier > 0 && (
                        <small>+ {money(option.price_modifier)}</small>
                      )}
                    </button>
                  ))}
              </div>
            </fieldset>
          )}
          <div className="purchase-controls">
            <div className="quantity detail-quantity" aria-label="Cantidad">
              <button
                type="button"
                aria-label="Reducir cantidad"
                disabled={quantity <= 1}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                <Minus size={15} />
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                aria-label="Aumentar cantidad"
                disabled={quantity >= maxQuantity}
                onClick={() =>
                  setQuantity((value) => Math.min(maxQuantity, value + 1))
                }
              >
                <Plus size={15} />
              </button>
            </div>
            <span className="muted">{money(price * quantity)}</span>
          </div>
          <div className="detail-actions">
            <button
              className="button"
              disabled={
                p.availability_type === "sold_out" ||
                (p.variants.some((v) => v.active) && !variant)
              }
              onClick={() => add(p, variant || null, quantity)}
            >
              {p.availability_type === "sold_out"
                ? "Agotado"
                : p.availability_type === "on_order"
                  ? "Solicitar por pedido"
                  : "Agregar al carrito"}
              <ArrowRight size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Guardar en favoritos"
              aria-pressed={favorites.includes(p.id)}
              onClick={() => favorite(p.id)}
            >
              <Heart
                fill={favorites.includes(p.id) ? "currentColor" : "none"}
                size={22}
              />
            </button>
          </div>
          <div className="product-assurances">
            <span>
              <Package size={18} /> Empaque discreto
            </span>
            <span>
              <Truck size={18} /> Entrega coordinada
            </span>
            <span>
              <ShieldCheck size={18} /> Compra acompañada
            </span>
          </div>
          <div className="details-list">
            {[
              ["Acerca de este producto", p.description],
              ["Materiales y dimensiones", p.materials + " " + p.dimensions],
              ["Cuidados e instrucciones", p.care],
              ["Uso responsable", p.usage_note],
              ["Envío y entrega", store.settings.shipping_text],
              [
                "Cambios y devoluciones",
                p.return_note ||
                  "Consultá las condiciones aplicables antes de abrir el producto.",
              ],
            ].map(([title, text]) => (
              <details key={title}>
                <summary>{title}</summary>
                <p>{text}</p>
                {title === "Cambios y devoluciones" && (
                  <Link className="text-link" href="/terminos">
                    Ver términos completos <RotateCcw size={15} />
                  </Link>
                )}
              </details>
            ))}
          </div>
        </div>
      </div>
      <section className="section" style={{ paddingTop: 10 }}>
        <div className="section-head">
          <h2>También puede gustarte.</h2>
        </div>
        <ProductGrid
          products={store.products
            .filter((x) => x.id !== p.id)
            .sort(
              (a, b) =>
                Number(b.category_id === p.category_id) -
                Number(a.category_id === p.category_id),
            )
            .slice(0, 4)}
        />
      </section>
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent style={{ maxWidth: 850 }} className="modal-content">
          <DialogTitle className="sr-only">Imagen del producto</DialogTitle>
          <DialogDescription className="sr-only">
            Vista ampliada
          </DialogDescription>
          <div
            style={{
              position: "relative",
              maxHeight: "75vh",
              overflow: "auto",
            }}
          >
            <ProductImage product={p} index={selected} />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
