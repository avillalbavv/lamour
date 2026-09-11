"use client";
import { newId } from "@/lib/client-id";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Save,
  Copy,
  Printer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import type { Product, Category, Settings } from "@/lib/types";
import { money, statuses, availabilityLabels } from "@/lib/types";
import { Choice } from "./primitives";
import { OrderTimeline } from "./information";
import { useStore } from "./store-provider";
function Field({
  label,
  value,
  onChange,
  type = "text",
  wide = false,
  area = false,
}: {
  label: string;
  value: any;
  onChange: (v: any) => void;
  type?: string;
  wide?: boolean;
  area?: boolean;
}) {
  return (
    <label className={"field " + (wide ? "wide" : "")}>
      {label}
      {area ? (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) =>
            onChange(
              type === "number"
                ? e.target.value === ""
                  ? null
                  : Number(e.target.value)
                : e.target.value,
            )
          }
        />
      )}
    </label>
  );
}
function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="checkline">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
      />
      {label}
    </label>
  );
}
async function upload(file: File) {
  const f = new FormData();
  f.set("file", file);
  const r = await fetch("/api/upload", { method: "POST", body: f });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data.url as string;
}
function SingleImageField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="wide image-field">
      <div>
        <strong>{label}</strong>
        {help && <p className="field-help">{help}</p>}
      </div>
      {value && <img src={value} alt={`Vista previa de ${label}`} />}
      <Field label="URL de imagen" value={value} onChange={onChange} wide />
      <label className="field">
        {busy ? "Subiendo imagen…" : "Reemplazar con PNG, JPG o WebP"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              onChange(await upload(file));
              toast.success("Imagen cargada");
            } catch (error) {
              toast.error((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
    </div>
  );
}
export function ProductEditor({
  initial,
  categories,
  onSave,
  onBack,
}: {
  initial: Product;
  categories: Category[];
  onSave: () => void;
  onBack: () => void;
}) {
  const [p, setP] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const set = (key: keyof Product, value: any) =>
    setP((p) => ({ ...p, [key]: value }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("admin", { action: "product", product: p });
      toast.success("Producto guardado");
      onSave();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="product-editor" onSubmit={save}>
      <div className="admin-toolbar">
        <button type="button" className="text-link" onClick={onBack}>
          <ArrowLeft size={17} /> Volver
        </button>
        <button className="button" disabled={busy}>
          <Save size={16} />
          {busy ? "Guardando…" : "Guardar producto"}
        </button>
      </div>
      <h1>{p.name || "Nuevo producto"}</h1>
      {p.is_demo && (
        <p className="notice" style={{ marginBottom: 25 }}>
          Producto de muestra. Sus datos no representan existencias ni ofertas
          reales.
        </p>
      )}
      <div className="form-grid">
        {[
          ["name", "Nombre"],
          ["neutral_name", "Nombre en modo discreto"],
          ["slug", "URL / slug"],
          ["sku", "SKU"],
        ].map(([key, label]) => (
          <Field
            key={key}
            label={label}
            value={p[key as keyof Product]}
            onChange={(v) => set(key as keyof Product, v)}
          />
        ))}
        <label className="field">
          Categoría principal
          <Choice
            label="Categoría principal"
            value={p.category_id}
            onChange={(v) =>
              setP((product) => ({
                ...product,
                category_id: v,
                category_ids: Array.from(new Set([v, ...product.category_ids])),
              }))
            }
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </label>
        <label className="field">
          Disponibilidad
          <Choice
            label="Estado"
            value={p.availability_type}
            onChange={(v) => set("availability_type", v)}
            options={Object.entries(availabilityLabels).map(
              ([value, label]) => ({ value, label }),
            )}
          />
        </label>
        <div className="wide status-panel">
          <strong>Categorías y colecciones donde aparece</strong>
          <p className="field-help">
            Podés mostrar el mismo producto en varias categorías. La principal
            se usa en la ficha y las demás ayudan a encontrarlo.
          </p>
          <div className="category-checks">
            {categories.map((category) => (
              <CheckField
                key={category.id}
                label={category.name}
                checked={p.category_ids.includes(category.id)}
                onChange={(checked) => {
                  if (category.id === p.category_id && !checked) return;
                  set(
                    "category_ids",
                    checked
                      ? Array.from(new Set([...p.category_ids, category.id]))
                      : p.category_ids.filter((id) => id !== category.id),
                  );
                }}
              />
            ))}
          </div>
        </div>
        {[
          ["price", "Precio ₲"],
          [
            "compare_at_price",
            "Precio anterior ₲ (si lo completás, aparece en Ofertas)",
          ],
          ["stock_quantity", "Unidades en stock"],
          ["lead_time_min_days", "Plazo mínimo (días)"],
          ["lead_time_max_days", "Plazo máximo (días)"],
        ].map(([key, label]) => (
          <Field
            key={key}
            label={label}
            value={p[key as keyof Product]}
            onChange={(v) => set(key as keyof Product, v)}
            type="number"
          />
        ))}
        <Field
          label="Descripción breve"
          value={p.short_description}
          onChange={(v) => set("short_description", v)}
          wide
          area
        />
        <Field
          label="Descripción completa"
          value={p.description}
          onChange={(v) => set("description", v)}
          wide
          area
        />
        <Field
          label="Puntos destacados (uno por línea)"
          value={p.highlights.join("\n")}
          onChange={(value) =>
            set(
              "highlights",
              value
                .split("\n")
                .map((item: string) => item.trim())
                .filter(Boolean),
            )
          }
          wide
          area
        />
        <label className="field">
          Estilo del aviso sobre el producto
          <Choice
            label="Estilo del aviso"
            value={p.notice_tone}
            onChange={(value) => set("notice_tone", value)}
            options={[
              { value: "info", label: "Información" },
              { value: "warning", label: "Importante" },
              { value: "offer", label: "Promoción" },
            ]}
          />
        </label>
        <Field
          label="Aviso visible en la ficha (opcional)"
          value={p.notice_text}
          onChange={(value) => set("notice_text", value)}
          area
        />
        {[
          ["materials", "Materiales"],
          ["dimensions", "Dimensiones"],
          ["care", "Cuidados e instrucciones"],
          ["usage_note", "Información de uso responsable"],
          ["return_note", "Condición particular de cambios y devoluciones"],
        ].map(([key, label]) => (
          <Field
            key={key}
            label={label}
            value={p[key as keyof Product]}
            onChange={(v) => set(key as keyof Product, v)}
            area
          />
        ))}
        <Field
          label="Etiquetas (separadas por coma)"
          value={p.tags.join(", ")}
          onChange={(v) =>
            set(
              "tags",
              v
                .split(",")
                .map((x: string) => x.trim())
                .filter(Boolean),
            )
          }
        />
        <div className="wide row" style={{ flexWrap: "wrap" }}>
          {[
            ["active", "Publicado"],
            ["featured", "Destacado"],
            ["is_new", "Novedad"],
            ["is_demo", "Producto de muestra"],
          ].map(([key, label]) => (
            <CheckField
              key={key}
              label={label}
              checked={p[key as keyof Product] as boolean}
              onChange={(v) => set(key as keyof Product, v)}
            />
          ))}
        </div>
        <div className="wide">
          <h3>Imágenes del producto</h3>
          <p className="field-help">
            La primera es la portada. Todas se muestran en proporción 4:5 y se
            recortan de forma uniforme; podés cambiar el orden o reemplazarlas.
          </p>
        </div>
        <div className="wide admin-image-list">
          {p.images.map((url, i) => (
            <div key={url + i}>
              <img src={url} alt={"Imagen " + (i + 1)} />
              <div className="row" style={{ gap: 0 }}>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Mover imagen después"
                  disabled={i === p.images.length - 1}
                  onClick={() => {
                    const imgs = [...p.images];
                    [imgs[i], imgs[i + 1]] = [imgs[i + 1], imgs[i]];
                    set("images", imgs);
                  }}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Mover imagen antes"
                  disabled={!i}
                  onClick={() => {
                    const imgs = [...p.images];
                    [imgs[i - 1], imgs[i]] = [imgs[i], imgs[i - 1]];
                    set("images", imgs);
                  }}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Eliminar imagen"
                  onClick={() =>
                    set(
                      "images",
                      p.images.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <label className="field">
          Subir PNG, JPG o WebP (máx. 5 MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                set("images", [...p.images, await upload(f)]);
                toast.success("Imagen cargada");
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          />
        </label>
        <div>
          <Field
            label="O pegar URL HTTPS de imagen"
            value={imageUrl}
            onChange={setImageUrl}
          />
          <button
            type="button"
            className="text-link"
            onClick={() => {
              if (!imageUrl.startsWith("https://"))
                return toast.error("Usá una URL HTTPS.");
              set("images", [...p.images, imageUrl]);
              setImageUrl("");
            }}
          >
            Agregar imagen
            <Plus size={14} />
          </button>
        </div>
        <h3 className="wide">Variantes</h3>
        {p.variants.map((v, i) => (
          <div className="wide form-grid status-panel" key={v.id}>
            <Field
              label="Tipo (ej. Color)"
              value={v.name}
              onChange={(a) =>
                set(
                  "variants",
                  p.variants.map((x, j) => (j === i ? { ...x, name: a } : x)),
                )
              }
            />
            <Field
              label="Valor (ej. Malva)"
              value={v.value}
              onChange={(a) =>
                set(
                  "variants",
                  p.variants.map((x, j) => (j === i ? { ...x, value: a } : x)),
                )
              }
            />
            <Field
              type="number"
              label="Precio adicional ₲"
              value={v.price_modifier}
              onChange={(a) =>
                set(
                  "variants",
                  p.variants.map((x, j) =>
                    j === i ? { ...x, price_modifier: a } : x,
                  ),
                )
              }
            />
            <Field
              type="number"
              label="Stock de la variante"
              value={v.stock_quantity}
              onChange={(a) =>
                set(
                  "variants",
                  p.variants.map((x, j) =>
                    j === i ? { ...x, stock_quantity: a } : x,
                  ),
                )
              }
            />
            <CheckField
              label="Activa"
              checked={v.active}
              onChange={(a) =>
                set(
                  "variants",
                  p.variants.map((x, j) => (j === i ? { ...x, active: a } : x)),
                )
              }
            />
            <button
              type="button"
              className="text-link"
              onClick={() =>
                set(
                  "variants",
                  p.variants.filter((_, j) => j !== i),
                )
              }
            >
              Quitar variante
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-link"
          onClick={() =>
            set("variants", [
              ...p.variants,
              {
                id: newId(),
                name: "Color",
                value: "",
                price_modifier: 0,
                stock_quantity: 0,
                active: true,
              },
            ])
          }
        >
          <Plus size={16} /> Agregar variante
        </button>
      </div>
    </form>
  );
}
export function SettingsEditor({
  initial,
  onSave,
}: {
  initial: Settings;
  onSave: () => void;
}) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Settings, v: any) => setS((s) => ({ ...s, [k]: v }));
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api("admin", { action: "settings", settings: s });
          toast.success("Configuración guardada");
          onSave();
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="admin-toolbar">
        <h1>Configuración</h1>
        <button className="button" disabled={busy}>
          Guardar cambios
        </button>
      </div>
      <div className="form-grid">
        <CheckField
          label="Catálogo de muestra (sin cobros)"
          checked={s.demo}
          onChange={(v) => set("demo", v)}
        />
        <CheckField
          label="Confirmación de mayoría de edad"
          checked={s.age_gate}
          onChange={(v) => set("age_gate", v)}
        />
        <h3 className="wide">Contacto</h3>
        {[
          ["contact_email", "Correo de atención"],
          ["whatsapp", "WhatsApp (código de país + número, solo dígitos)"],
          ["instagram", "URL de Instagram"],
        ].map(([k, l]) => (
          <Field
            key={k}
            label={l}
            value={s[k as keyof Settings]}
            onChange={(v) => set(k as keyof Settings, v)}
          />
        ))}
        <h3 className="wide">Datos comerciales y legales</h3>
        {[
          ["legal_name", "Nombre o razón social"],
          ["tax_id", "RUC / identificación tributaria"],
          ["business_address", "Domicilio comercial"],
        ].map(([k, l]) => (
          <Field
            key={k}
            label={l}
            value={s[k as keyof Settings]}
            onChange={(v) => set(k as keyof Settings, v)}
            wide
          />
        ))}
        <h3 className="wide">Página de inicio</h3>
        {[
          ["banner", "Mensaje de la franja superior"],
          ["hero_title", "Título principal"],
          ["hero_description", "Descripción principal"],
        ].map(([k, l]) => (
          <Field
            key={k}
            label={l}
            value={s[k as keyof Settings]}
            onChange={(v) => set(k as keyof Settings, v)}
            wide
          />
        ))}
        <SingleImageField
          label="Foto principal del inicio"
          value={s.hero_image}
          onChange={(value) => set("hero_image", value)}
          help="Recomendado: retrato vertical de al menos 1200 × 1500 px."
        />
        <Field
          label="Título del bloque editorial"
          value={s.story_title}
          onChange={(value) => set("story_title", value)}
          wide
        />
        <Field
          label="Texto del bloque editorial"
          value={s.story_description}
          onChange={(value) => set("story_description", value)}
          wide
          area
        />
        <SingleImageField
          label="Foto del bloque editorial"
          value={s.story_image}
          onChange={(value) => set("story_image", value)}
          help="Recomendado: retrato vertical de al menos 1000 × 1250 px."
        />
        <h3 className="wide">Métodos de pago</h3>
        {s.payments.map((p, i) => (
          <div className="wide status-panel" key={p.id}>
            <CheckField
              label={p.name}
              checked={p.enabled}
              onChange={(enabled) =>
                set(
                  "payments",
                  s.payments.map((x, j) => (i === j ? { ...x, enabled } : x)),
                )
              }
            />
            <Field
              label="Instrucciones, cuenta bancaria o enlace de QR"
              value={p.instructions}
              onChange={(instructions) =>
                set(
                  "payments",
                  s.payments.map((x, j) =>
                    i === j ? { ...x, instructions } : x,
                  ),
                )
              }
              area
            />
          </div>
        ))}
        <h3 className="wide">Entrega y zonas</h3>
        {s.delivery.map((d, i) => (
          <div key={d.id} className="status-panel">
            <CheckField
              label={d.name}
              checked={d.enabled}
              onChange={(enabled) =>
                set(
                  "delivery",
                  s.delivery.map((x, j) => (i === j ? { ...x, enabled } : x)),
                )
              }
            />
            <Field
              label="Costo de entrega ₲"
              type="number"
              value={d.price}
              onChange={(price) =>
                set(
                  "delivery",
                  s.delivery.map((x, j) => (i === j ? { ...x, price } : x)),
                )
              }
            />
          </div>
        ))}
        <Field
          label="Ciudades habilitadas (una por línea; vacío = todas)"
          value={s.zones.join("\n")}
          onChange={(v) => set("zones", v.split("\n").filter(Boolean))}
          wide
          area
        />
        {[
          ["shipping_text", "Información de envíos"],
          ["reservation_text", "Política de reserva (opcional)"],
          ["privacy_text", "Política de privacidad"],
          ["terms_text", "Términos de compra"],
        ].map(([k, l]) => (
          <Field
            key={k}
            label={l}
            value={s[k as keyof Settings]}
            onChange={(v) => set(k as keyof Settings, v)}
            wide
            area
          />
        ))}
      </div>
    </form>
  );
}
export function AdminApp() {
  const params = useSearchParams();
  const router = useRouter();
  const { reload: reloadStore } = useStore();
  const section = params.get("seccion") || "resumen";
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [edit, setEdit] = useState<Product | null>(null);
  const [cat, setCat] = useState<Category | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [deleteCat, setDeleteCat] = useState<string | null>(null);
  const [coupon, setCoupon] = useState({
    code: "",
    percent: 10,
    active: true,
    expires_at: "",
  });
  async function reload() {
    setError("");
    try {
      setData(await api("admin"));
      reloadStore();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    reload();
  }, []);
  useEffect(() => {
    setEdit(null);
    setCat(null);
    setDetail(null);
    setQuery("");
    setStatus("all");
  }, [section]);
  async function orderDetail(id: string) {
    try {
      setDetail(await api("admin", { action: "order_detail", id }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  if (error)
    return (
      <main id="main" className="container prose">
        <div className="page-heading">
          <p className="eyebrow">Acceso privado</p>
          <h1>Administración.</h1>
        </div>
        <p role="alert">{error}</p>
        <p>
          El panel permite gestionar productos, categorías, pedidos, pagos,
          envíos y contenido. El acceso se valida en el servidor.
        </p>
        <a
          className="button"
          href="/signin-with-chatgpt?return_to=%2Fadmin"
          target="_top"
        >
          Iniciar sesión
        </a>
        <button
          className="text-link"
          style={{ marginLeft: 20 }}
          onClick={reload}
        >
          Volver a comprobar
        </button>
      </main>
    );
  if (!data)
    return (
      <main className="container section" id="main">
        <p>Cargando administración…</p>
      </main>
    );
  const orders = data.orders as any[];
  const products = data.products as Product[];
  const today = new Date().toISOString().slice(0, 10);
  const metrics = [
    [
      "Pedidos de hoy",
      orders.filter((o) => o.created_at.startsWith(today)).length,
    ],
    [
      "Por confirmar",
      orders.filter((o) =>
        ["Solicitud recibida", "Pendiente de confirmación"].includes(o.status),
      ).length,
    ],
    ["En tránsito", orders.filter((o) => o.status === "En tránsito").length],
    [
      "Ventas entregadas",
      money(
        orders
          .filter((o) => o.status === "Entregado" && !o.is_demo)
          .reduce((s, o) => s + o.total, 0),
      ),
    ],
    [
      "Productos por pedido",
      products.filter((p) => p.availability_type === "on_order").length,
    ],
    [
      "Poco stock",
      products.filter(
        (p) =>
          p.stock_quantity > 0 &&
          p.stock_quantity <= 3 &&
          p.availability_type !== "on_order",
      ).length,
    ],
    ["Cuentas registradas", data.customers?.length || 0],
  ];
  function blankProduct() {
    return {
      id: newId(),
      name: "",
      slug: "",
      sku: "",
      neutral_name: "Selección personal",
      short_description: "",
      description: "",
      price: 0,
      compare_at_price: null,
      category_id: data.categories[0]?.id || "",
      category_ids: data.categories[0]?.id ? [data.categories[0].id] : [],
      availability_type: "on_order",
      stock_quantity: 0,
      lead_time_min_days: null,
      lead_time_max_days: null,
      featured: false,
      active: false,
      is_new: false,
      is_demo: false,
      tags: [],
      highlights: [],
      notice_text: "",
      notice_tone: "info",
      materials: "",
      dimensions: "",
      care: "",
      usage_note:
        "Uso exclusivo para personas adultas. Seguí las indicaciones del fabricante.",
      return_note:
        "Por higiene, los productos íntimos abiertos o con su sello alterado no admiten devolución, salvo falla o defecto.",
      images: [],
      variants: [],
      created_at: new Date().toISOString(),
    } as Product;
  }
  const filteredOrders = orders.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      (o.order_code + " " + o.customer_name + " " + o.phone)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <main id="main" className="admin-layout">
      <aside className="admin-sidebar">
        <h3 style={{ fontSize: 26, margin: "0 10px 25px" }}>El atelier.</h3>
        {[
          ["resumen", "Vista general"],
          ["productos", "Productos"],
          ["pedidos", "Pedidos"],
          ["clientes", "Clientes"],
          ["categorias", "Categorías"],
          ["configuracion", "Configuración"],
          ["cupones", "Cupones"],
          ["newsletter", "Newsletter"],
        ].map(([key, label]) => (
          <Link
            className={section === key ? "active" : ""}
            key={key}
            href={"/admin?seccion=" + key}
          >
            {label}
          </Link>
        ))}
      </aside>
      <div className="admin-main">
        {data.settings.demo && (
          <p className="notice no-print" style={{ marginBottom: 25 }}>
            Catálogo de muestra activo. Completá y verificá los datos
            comerciales antes de comenzar a vender.
          </p>
        )}
        {edit ? (
          <ProductEditor
            key={edit.id}
            initial={edit}
            categories={data.categories}
            onBack={() => setEdit(null)}
            onSave={() => {
              setEdit(null);
              reload();
            }}
          />
        ) : section === "configuracion" ? (
          <SettingsEditor initial={data.settings} onSave={reload} />
        ) : section === "productos" ? (
          <>
            <div className="admin-toolbar">
              <h1>Productos</h1>
              <button
                className="button"
                onClick={() => setEdit(blankProduct())}
              >
                <Plus size={16} /> Nuevo producto
              </button>
            </div>
            <input
              className="input"
              placeholder="Buscar por nombre o SKU"
              aria-label="Buscar productos"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ marginBottom: 25 }}
            />
            <div className="table-wrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      "Producto",
                      "Precio",
                      "Disponibilidad",
                      "Stock",
                      "Acciones",
                    ].map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products
                    .filter((p) =>
                      (p.name + p.sku)
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <strong>{p.name}</strong>
                          <br />
                          <small>
                            {p.sku}
                            {p.is_demo ? " · Muestra" : ""}
                            {!p.active ? " · Inactivo" : ""}
                            {p.is_new ? " · Novedad" : ""}
                            {p.compare_at_price !== null &&
                            p.compare_at_price > p.price
                              ? " · Oferta"
                              : ""}
                          </small>
                        </TableCell>
                        <TableCell>{money(p.price)}</TableCell>
                        <TableCell>
                          {availabilityLabels[p.availability_type]}
                        </TableCell>
                        <TableCell>{p.stock_quantity}</TableCell>
                        <TableCell>
                          <button
                            className="text-link"
                            onClick={() => setEdit(p)}
                          >
                            Editar
                          </button>
                          <button
                            className="icon-button"
                            aria-label="Duplicar producto"
                            onClick={() =>
                              setEdit({
                                ...p,
                                id: newId(),
                                name: p.name + " (copia)",
                                slug:
                                  p.slug +
                                  "-copia-" +
                                  Math.random().toString(36).slice(2, 6),
                                sku: p.sku + "-COPIA",
                                active: false,
                                variants: p.variants.map((v) => ({
                                  ...v,
                                  id: newId(),
                                })),
                              })
                            }
                          >
                            <Copy size={16} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : section === "categorias" ? (
          <>
            <div className="admin-toolbar">
              <h1>Categorías</h1>
              <button
                className="button"
                onClick={() =>
                  setCat({
                    id: newId(),
                    name: "",
                    slug: "",
                    description: "",
                    image_url: "",
                    active: true,
                    sort_order: data.categories.length,
                  })
                }
              >
                <Plus size={16} /> Nueva categoría
              </button>
            </div>
            {cat ? (
              <form
                className="form-grid"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api("admin", { action: "category", category: cat });
                    setCat(null);
                    reload();
                    toast.success("Categoría guardada");
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                {[
                  ["name", "Nombre"],
                  ["slug", "URL / slug"],
                  ["description", "Descripción"],
                  ["sort_order", "Orden"],
                ].map(([k, l]) => (
                  <Field
                    key={k}
                    label={l}
                    type={k === "sort_order" ? "number" : "text"}
                    value={cat[k as keyof Category]}
                    onChange={(v) => setCat({ ...cat, [k]: v })}
                  />
                ))}
                <SingleImageField
                  label="Imagen de la categoría"
                  value={cat.image_url}
                  onChange={(image_url) => setCat({ ...cat, image_url })}
                  help="Esta foto aparece en el inicio y en la página de categorías."
                />
                <CheckField
                  label="Activa"
                  checked={cat.active}
                  onChange={(v) => setCat({ ...cat, active: v })}
                />
                <div className="row">
                  <button className="button">Guardar</button>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setCat(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.categories.map((c: Category) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        {c.name}
                        {!c.active ? " · Inactiva" : ""}
                      </TableCell>
                      <TableCell>{c.sort_order}</TableCell>
                      <TableCell>
                        <button className="text-link" onClick={() => setCat(c)}>
                          Editar
                        </button>
                        <button
                          className="icon-button"
                          aria-label="Eliminar categoría"
                          onClick={() => setDeleteCat(c.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        ) : section === "clientes" ? (
          <>
            <div className="admin-toolbar">
              <div>
                <h1>Clientes</h1>
                <p className="muted">
                  Cuentas, consentimientos y relación con pedidos. Este panel
                  nunca muestra contraseñas ni tokens.
                </p>
              </div>
            </div>
            {!data.supabase?.configured ? (
              <div className="status-panel">
                <h3>Conexión pendiente</h3>
                <p>
                  Configurá las variables de Supabase y ejecutá
                  <code> supabase/schema.sql</code>. La compra como invitado y
                  el seguimiento por código continúan disponibles.
                </p>
              </div>
            ) : data.customers.length ? (
              <div className="table-wrap">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>+18</TableHead>
                      <TableHead>Alta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.customers.map((customer: any) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <strong>{customer.full_name || "Sin nombre"}</strong>
                          <br />
                          <small>{customer.email}</small>
                        </TableCell>
                        <TableCell>{customer.phone || "—"}</TableCell>
                        <TableCell>
                          {customer.age_confirmed ? "Confirmado" : "Pendiente"}
                        </TableCell>
                        <TableCell>
                          {new Date(customer.created_at).toLocaleDateString(
                            "es-PY",
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="notice">Todavía no hay cuentas registradas.</p>
            )}
            <h2 style={{ marginTop: 45 }}>Auditoría de cuentas</h2>
            <p className="muted">
              Asociación de pedidos y actividad operativa relevante.
            </p>
            {data.customer_audit?.length ? (
              <div className="table-wrap" style={{ marginTop: 20 }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.customer_audit.map((event: any) => (
                      <TableRow key={event.id}>
                        <TableCell>{event.event_type}</TableCell>
                        <TableCell>{event.reference_id}</TableCell>
                        <TableCell>
                          {new Date(event.created_at).toLocaleString("es-PY")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="notice" style={{ marginTop: 20 }}>
                Sin eventos registrados.
              </p>
            )}
          </>
        ) : section === "cupones" ? (
          <>
            <h1>Cupones</h1>
            <form
              className="form-grid"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api("admin", {
                    action: "coupon",
                    coupon: {
                      ...coupon,
                      expires_at: coupon.expires_at
                        ? new Date(
                            coupon.expires_at + "T23:59:59Z",
                          ).toISOString()
                        : null,
                    },
                  });
                  toast.success("Cupón guardado");
                  reload();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <Field
                label="Código"
                value={coupon.code}
                onChange={(v) => setCoupon({ ...coupon, code: v })}
              />
              <Field
                label="Porcentaje de descuento"
                value={coupon.percent}
                type="number"
                onChange={(v) => setCoupon({ ...coupon, percent: v })}
              />
              <Field
                label="Vence (opcional)"
                value={coupon.expires_at}
                type="date"
                onChange={(v) => setCoupon({ ...coupon, expires_at: v })}
              />
              <CheckField
                label="Activo"
                checked={coupon.active}
                onChange={(v) => setCoupon({ ...coupon, active: v })}
              />
              <button className="button">Guardar cupón</button>
            </form>
            <Table>
              <TableBody>
                {data.coupons.map((c: any) => (
                  <TableRow key={c.code}>
                    <TableCell>{c.code}</TableCell>
                    <TableCell>{c.percent}%</TableCell>
                    <TableCell>{c.active ? "Activo" : "Inactivo"}</TableCell>
                    <TableCell>
                      <button
                        className="text-link"
                        onClick={() =>
                          setCoupon({
                            ...c,
                            active: !!c.active,
                            expires_at: c.expires_at?.slice(0, 10) || "",
                          })
                        }
                      >
                        Editar
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : section === "newsletter" ? (
          <>
            <h1>Newsletter</h1>
            <p className="muted">
              {data.newsletter.length} suscripciones con consentimiento.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.newsletter.map((n: any) => (
                  <TableRow key={n.email}>
                    <TableCell>{n.email}</TableCell>
                    <TableCell>
                      {new Date(n.created_at).toLocaleDateString("es-PY")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : detail ? (
          <>
            <div className="admin-toolbar">
              <button className="text-link" onClick={() => setDetail(null)}>
                <ArrowLeft size={16} /> Pedidos
              </button>
              <button className="button" onClick={() => window.print()}>
                <Printer size={16} /> Imprimir ficha
              </button>
            </div>
            <h1>{detail.order.order_code}</h1>
            <p>
              {detail.order.customer_name} · {detail.order.phone} ·{" "}
              {detail.order.email}
            </p>
            <p>
              {detail.order.city} · {detail.order.address}
            </p>
            <p>Referencia: {detail.order.reference || "—"}</p>
            <p>Notas: {detail.order.notes || "—"}</p>
            <p>
              Pago: {detail.order.payment_method} · Entrega:{" "}
              {detail.order.delivery_method}
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio unitario</TableHead>
                  <TableHead>Entrega</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.items.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      {i.name_snapshot} {i.variant_snapshot}
                    </TableCell>
                    <TableCell>{i.quantity}</TableCell>
                    <TableCell>{money(i.price_snapshot)}</TableCell>
                    <TableCell>{i.lead_time_snapshot}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p style={{ margin: "25px 0" }}>
              <strong>Total: {money(detail.order.total)}</strong> · Envío{" "}
              {money(detail.order.shipping)} · Descuento{" "}
              {money(detail.order.discount)}
            </p>
            <div className="status-panel no-print">
              <h3>Actualizar pedido</h3>
              <Choice
                label="Estado del pedido"
                value={detail.order.status}
                onChange={(status) =>
                  setDetail({ ...detail, order: { ...detail.order, status } })
                }
                options={statuses.map((s) => ({ value: s, label: s }))}
              />
              <Field
                label="Nota interna (no visible al cliente)"
                value={detail.order.internal_note}
                onChange={(internal_note) =>
                  setDetail({
                    ...detail,
                    order: { ...detail.order, internal_note },
                  })
                }
                area
              />
              <button
                className="button"
                onClick={async () => {
                  try {
                    await api("admin", {
                      action: "order_status",
                      id: detail.order.id,
                      status: detail.order.status,
                      internal_note: detail.order.internal_note,
                    });
                    toast.success("Pedido actualizado");
                    orderDetail(detail.order.id);
                    reload();
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                Guardar actualización
              </button>
            </div>
            <OrderTimeline
              status={detail.order.status}
              events={detail.events}
            />
          </>
        ) : (
          <>
            {section === "resumen" ? (
              <>
                <h1>Tu boutique, de un vistazo.</h1>
                <div className="admin-metrics">
                  {metrics.map(([label, value]) => (
                    <div className="metric" key={label}>
                      <strong>{value}</strong>
                      <p>{label}</p>
                    </div>
                  ))}
                </div>
                <h3 style={{ marginBottom: 25 }}>Últimos pedidos</h3>
              </>
            ) : (
              <h1>Pedidos</h1>
            )}
            <div className="admin-toolbar">
              <input
                className="input"
                placeholder="Código, nombre o teléfono"
                aria-label="Buscar pedidos"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Choice
                label="Estado"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: "Todos los estados" },
                  ...statuses.map((s) => ({ value: s, label: s })),
                ]}
              />
            </div>
            <div className="table-wrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Código", "Cliente", "Estado", "Total", "Fecha", ""].map(
                      (h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ),
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        {o.order_code}
                        {o.is_demo ? <small> · Muestra</small> : null}
                      </TableCell>
                      <TableCell>{o.customer_name}</TableCell>
                      <TableCell>{o.status}</TableCell>
                      <TableCell>{money(o.total)}</TableCell>
                      <TableCell>
                        {new Date(o.created_at).toLocaleDateString("es-PY")}
                      </TableCell>
                      <TableCell>
                        <button
                          className="text-link"
                          onClick={() => orderDetail(o.id)}
                        >
                          Ver
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!filteredOrders.length && (
                <p className="empty-state">
                  Todavía no hay pedidos en esta vista.
                </p>
              )}
            </div>
          </>
        )}
      </div>
      <AlertDialog
        open={!!deleteCat}
        onOpenChange={(v) => !v && setDeleteCat(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>¿Eliminar esta categoría?</AlertDialogTitle>
          <AlertDialogDescription>
            Solo se puede eliminar si no tiene productos asignados.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await api("admin", {
                    action: "delete_category",
                    id: deleteCat,
                  });
                  setDeleteCat(null);
                  reload();
                  toast.success("Categoría eliminada");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
