"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import type { Product, Availability } from "@/lib/types";
import { availabilityLabels, money, lead } from "@/lib/types";
import { useStore } from "./store-provider";
export function AvailabilityBadge({
  value,
  isNew = false,
}: {
  value: Availability;
  isNew?: boolean;
}) {
  return (
    <span className={"badge " + (value === "on_order" ? "on-order" : "")}>
      {isNew && value === "available" ? "Novedad" : availabilityLabels[value]}
    </span>
  );
}
export function Price({
  value,
  previous,
}: {
  value: number;
  previous?: number | null;
}) {
  return (
    <span className="price">
      {money(value)}
      {previous != null && previous > value && <del>{money(previous)}</del>}
    </span>
  );
}
export function ProductImage({
  product,
  className = "",
  index = 0,
  reveal = true,
}: {
  product: Product;
  className?: string;
  index?: number;
  reveal?: boolean;
}) {
  const { discreet } = useStore();
  const [shown, setShown] = useState(false);
  return (
    <>
      <img
        className={className + (discreet && !shown ? " blurred" : "")}
        src={product.images[index] || product.images[0]}
        alt={
          discreet && !shown ? "Imagen oculta en modo discreto" : product.name
        }
        width="440"
        height="500"
        loading="lazy"
      />
      {discreet && !shown && reveal && (
        <button
          className="reveal-image"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShown(true);
          }}
        >
          Revelar imagen
        </button>
      )}
    </>
  );
}
export function ProductCard({ product: p }: { product: Product }) {
  const { add, favorite, favorites, discreet, store } = useStore();
  return (
    <article className="product-card">
      <div className="product-image">
        <Link
          href={"/producto/" + p.slug}
          aria-label={discreet ? p.neutral_name : p.name}
        >
          <ProductImage product={p} reveal={false} />
        </Link>
        <div className="product-badges">
          {p.compare_at_price !== null && p.compare_at_price > p.price && (
            <span className="badge offer">Oferta</span>
          )}
          <AvailabilityBadge value={p.availability_type} isNew={p.is_new} />
        </div>
        <button
          className="favorite"
          aria-label={
            favorites.includes(p.id)
              ? "Quitar de favoritos"
              : "Guardar en favoritos"
          }
          aria-pressed={favorites.includes(p.id)}
          onClick={() => favorite(p.id)}
        >
          <Heart
            size={18}
            fill={favorites.includes(p.id) ? "currentColor" : "none"}
          />
        </button>
      </div>
      <div className="product-meta">
        <p className="eyebrow">
          {store?.categories.find((c) => c.id === p.category_id)?.name}
        </p>
        <Link href={"/producto/" + p.slug}>
          <h3>{discreet ? p.neutral_name : p.name}</h3>
        </Link>
        <div className="product-bottom">
          <Price value={p.price} previous={p.compare_at_price} />
          <button
            className="add-quick"
            onClick={() => add(p)}
            disabled={p.availability_type === "sold_out"}
            aria-label={
              discreet
                ? "Agregar selección al carrito"
                : `Agregar ${p.name} al carrito`
            }
          >
            <Plus size={17} />
          </button>
        </div>
        {p.availability_type === "on_order" && (
          <p className="lead-time">Plazo estimado: {lead(p)}</p>
        )}
      </div>
    </article>
  );
}
export function ProductGrid({
  products,
  className = "",
}: {
  products: Product[];
  className?: string;
}) {
  return (
    <div className={"products " + className}>
      {products.map((p) => (
        <ProductCard product={p} key={p.id} />
      ))}
    </div>
  );
}
