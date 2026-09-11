"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "./store-provider";
import { ProductGrid } from "./products";
import { Choice, EmptyState, LoadState } from "./primitives";
import { availabilityLabels } from "@/lib/types";
export function Catalog({
  favoritesOnly = false,
}: {
  favoritesOnly?: boolean;
}) {
  const { store, favorites } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const [search, setSearch] = useState(params.get("q") || "");
  useEffect(() => setSearch(params.get("q") || ""), [params]);
  function update(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value && value !== "all") p.set(key, value);
    else p.delete(key);
    router.replace(
      (favoritesOnly ? "/favoritos" : "/tienda") +
        (p.size ? "?" + p.toString() : ""),
      { scroll: false },
    );
  }
  useEffect(() => {
    if (search === (params.get("q") || "")) return;
    const t = setTimeout(() => update("q", search), 250);
    return () => clearTimeout(t);
  }, [search]);
  const cat = params.get("categoria") || "all";
  const av = params.get("disponibilidad") || "all";
  const newOnly = params.get("novedades") === "1";
  const offersOnly = params.get("ofertas") === "1";
  const sort = params.get("orden") || "curated";
  const min = Number(params.get("min") || 0);
  const max = Number(params.get("max") || 0);
  const items = useMemo(() => {
    if (!store) return [];
    const c = store.categories.find((c) => c.slug === cat);
    const q = (params.get("q") || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return store.products
      .filter(
        (p) =>
          (!favoritesOnly || favorites.includes(p.id)) &&
          (cat === "all" ||
            p.category_id === c?.id ||
            p.category_ids.includes(c?.id || "")) &&
          (av === "all" || p.availability_type === av) &&
          (!newOnly || p.is_new) &&
          (!offersOnly ||
            (p.compare_at_price !== null && p.compare_at_price > p.price)) &&
          (!min || p.price >= min) &&
          (!max || p.price <= max) &&
          (
            p.name +
            " " +
            p.description +
            " " +
            p.tags.join(" ") +
            " " +
            store.categories.find((c) => c.id === p.category_id)?.name
          )
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes(q),
      )
      .sort((a, b) =>
        sort === "price-asc"
          ? a.price - b.price
          : sort === "price-desc"
            ? b.price - a.price
            : sort === "name"
              ? a.name.localeCompare(b.name)
              : Number(b.featured) - Number(a.featured),
      );
  }, [store, params, favorites, favoritesOnly]);
  const filters = (
    <>
      <Choice
        label="Categoría"
        value={cat}
        onChange={(v) => update("categoria", v)}
        options={[
          { value: "all", label: "Todas las categorías" },
          ...(store?.categories.map((c) => ({
            value: c.slug,
            label: c.name,
          })) || []),
        ]}
      />
      <Choice
        label="Disponibilidad"
        value={av}
        onChange={(v) => update("disponibilidad", v)}
        options={[
          { value: "all", label: "Disponibilidad" },
          ...Object.entries(availabilityLabels).map(([value, label]) => ({
            value,
            label,
          })),
        ]}
      />
      <label className="checkline">
        <Checkbox
          checked={newOnly}
          onCheckedChange={(v) => update("novedades", v ? "1" : "")}
          aria-label="Solo novedades"
        />{" "}
        Novedades
      </label>
      <label className="checkline">
        <Checkbox
          checked={offersOnly}
          onCheckedChange={(v) => update("ofertas", v ? "1" : "")}
          aria-label="Solo ofertas"
        />{" "}
        Ofertas
      </label>
      <label className="field">
        Desde ₲
        <input
          style={{ maxWidth: 125 }}
          type="number"
          min="0"
          placeholder="0"
          value={params.get("min") || ""}
          onChange={(e) => update("min", e.target.value)}
        />
      </label>
      <label className="field">
        Hasta ₲
        <input
          style={{ maxWidth: 125 }}
          type="number"
          min="0"
          placeholder="Sin límite"
          value={params.get("max") || ""}
          onChange={(e) => update("max", e.target.value)}
        />
      </label>
    </>
  );
  return (
    <main id="main" className="container">
      <div className="page-heading">
        <p className="eyebrow">
          {favoritesOnly ? "Lo que conecta con vos" : "El universo L’Amour"}
        </p>
        <h1>
          {favoritesOnly
            ? "Tus favoritos."
            : offersOnly
              ? "Ofertas para descubrir."
              : newOnly
                ? "Algo nuevo para descubrir."
                : av === "on_order"
                  ? "Especialmente para vos."
                  : "Tu intimidad, a tu manera."}
        </h1>
        <p className="muted">
          {favoritesOnly
            ? "Tu selección, guardada en este dispositivo."
            : "Explorá sin apuro. Encontrá tu próximo pequeño ritual."}
        </p>
      </div>
      <div className="catalog-search">
        <Search size={20} />
        <label className="sr-only" htmlFor="catalog-q">
          Buscar productos
        </label>
        <input
          id="catalog-q"
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscá un producto, una categoría o un detalle…"
        />
      </div>
      <div className="filter-bar">
        <div className="filters">{filters}</div>
        <button
          className="text-link mobile-only"
          onClick={() => setSheet(true)}
        >
          <SlidersHorizontal size={17} /> Filtrar
        </button>
        <Choice
          label="Ordenar"
          value={sort}
          onChange={(v) => update("orden", v)}
          options={[
            { value: "curated", label: "Nuestra selección" },
            { value: "price-asc", label: "Menor precio" },
            { value: "price-desc", label: "Mayor precio" },
            { value: "name", label: "Nombre A–Z" },
          ]}
        />
      </div>
      {!store ? (
        <LoadState />
      ) : (
        <div className="catalog-products">
          <div className="row between results-note">
            <p>
              {items.length}{" "}
              {items.length === 1 ? "descubrimiento" : "descubrimientos"}
            </p>
            {params.size > 0 && (
              <button
                className="row"
                onClick={() =>
                  router.replace(favoritesOnly ? "/favoritos" : "/tienda", {
                    scroll: false,
                  })
                }
              >
                Limpiar filtros
                <X size={14} />
              </button>
            )}
          </div>
          {items.length ? (
            <ProductGrid products={items} />
          ) : (
            <EmptyState
              title={
                favoritesOnly
                  ? "Tus próximos favoritos empiezan acá."
                  : "No encontramos esa combinación."
              }
              text={
                favoritesOnly
                  ? "Tocá el corazón de un producto para guardarlo."
                  : "Probá con otra búsqueda o quitá algún filtro."
              }
            />
          )}
        </div>
      )}
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="filter-sheet">
          <SheetTitle className="sheet-title">Encontrá tu selección</SheetTitle>
          <SheetDescription>
            Combiná las opciones que prefieras.
          </SheetDescription>
          <div className="stack">
            {filters}
            <button className="button" onClick={() => setSheet(false)}>
              Ver {items.length} productos
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
