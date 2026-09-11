"use client";
import { SiteMotion } from "./site-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Heart,
  ShoppingBag,
  Menu,
  EyeOff,
  ArrowRight,
  Lock,
  Camera,
  MessageCircle,
  UserRound,
  X,
  ChevronRight,
  House,
  LayoutGrid,
  Sparkles,
  Tags,
  PackageSearch,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { useStore } from "./store-provider";
import { BrandLogo, Isotipo } from "./brand";
import { CartContents } from "./shopping";
import { money } from "@/lib/types";
const links = [
  ["Inicio", "/"],
  ["Tienda", "/tienda"],
  ["Categorías", "/categorias"],
  ["Novedades", "/tienda?novedades=1"],
  ["Ofertas", "/tienda?ofertas=1"],
  ["Sobre L’Amour", "/sobre-lamour"],
  ["Preguntas frecuentes", "/preguntas-frecuentes"],
];
export function DiscreetModeToggle({ className = "" }: { className?: string }) {
  const { discreet, setDiscreet } = useStore();
  return (
    <label className={`discreet-toggle ${className}`}>
      <EyeOff size={14} />
      <span>Modo discreto</span>
      <Switch
        checked={discreet}
        onCheckedChange={setDiscreet}
        aria-label="Activar modo discreto"
      />
    </label>
  );
}
export function Header() {
  const { store, cart, setCartOpen, setSearchOpen } = useStore();
  const [menu, setMenu] = useState(false);
  const path = usePathname();
  useEffect(() => setMenu(false), [path]);
  return (
    <>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <div className="announcement">
        {store?.settings.banner ||
          "Empaque discreto · Atención personalizada · Paraguay"}
      </div>
      <header className="header">
        <div className="container header-inner">
          <BrandLogo />
          <nav className="nav" aria-label="Navegación principal">
            {links.map(([name, url]) => (
              <Link
                key={name}
                href={url}
                className={path === url ? "active" : ""}
              >
                {name}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="icon-button header-search"
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar"
            >
              <Search size={21} />
            </button>
            <Link
              className="icon-button desktop-only"
              href="/cuenta"
              aria-label="Mi cuenta"
            >
              <UserRound size={21} />
            </Link>
            <Link
              className="icon-button desktop-only"
              href="/favoritos"
              aria-label="Favoritos"
            >
              <Heart size={21} />
            </Link>
            <button
              className="icon-button header-cart"
              onClick={() => setCartOpen(true)}
              aria-label={`Carrito, ${cart.reduce((s, i) => s + i.quantity, 0)} productos`}
              style={{ position: "relative" }}
            >
              <ShoppingBag size={21} />
              {cart.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    fontSize: 10,
                    background: "#f5eee8",
                    color: "#420a25",
                    borderRadius: 20,
                    padding: "0 5px",
                  }}
                >
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
            <button
              className="icon-button mobile-only menu-trigger"
              onClick={() => setMenu(true)}
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>
      <div className="container discreet-bar">
        <DiscreetModeToggle />
      </div>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent
          side="right"
          className="sheet-content mobile-menu-sheet"
          showCloseButton={false}
        >
          <div className="mobile-menu-header">
            <BrandLogo />
            <SheetClose className="mobile-menu-close" aria-label="Cerrar menú">
              <X size={21} />
            </SheetClose>
          </div>
          <SheetTitle className="sr-only">Menú principal</SheetTitle>
          <SheetDescription className="mobile-menu-kicker">
            Explorá L’Amour a tu ritmo
          </SheetDescription>
          <nav className="menu-links" aria-label="Menú móvil">
            {[
              { name: "Tienda", url: "/tienda", Icon: LayoutGrid },
              { name: "Novedades", url: "/tienda?novedades=1", Icon: Sparkles },
              { name: "Ofertas", url: "/tienda?ofertas=1", Icon: Tags },
              { name: "Categorías", url: "/categorias", Icon: LayoutGrid },
              { name: "Sobre L’Amour", url: "/sobre-lamour", Icon: Heart },
            ].map(({ name, url, Icon }, index) => (
              <Link
                href={url}
                key={name}
                onClick={() => setMenu(false)}
                className={path === url ? "active" : ""}
              >
                <span className="menu-link-index">0{index + 1}</span>
                <Icon size={19} />
                <span>{name}</span>
                <ChevronRight className="menu-link-arrow" size={18} />
              </Link>
            ))}
          </nav>
          <div className="mobile-menu-quick" aria-label="Accesos rápidos">
            {[
              { name: "Mi cuenta", url: "/cuenta", Icon: UserRound },
              { name: "Favoritos", url: "/favoritos", Icon: Heart },
              { name: "Mi pedido", url: "/mi-pedido", Icon: PackageSearch },
            ].map(({ name, url, Icon }) => (
              <Link href={url} key={name} onClick={() => setMenu(false)}>
                <Icon size={20} />
                <span>{name}</span>
              </Link>
            ))}
          </div>
          <div className="mobile-menu-footer">
            <DiscreetModeToggle className="menu-discreet" />
            <div className="mobile-menu-secondary">
              <Link href="/preguntas-frecuentes" onClick={() => setMenu(false)}>
                Ayuda
              </Link>
              <Link href="/contacto" onClick={() => setMenu(false)}>
                Contacto
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <nav className="mobile-dock" aria-label="Navegación rápida móvil">
        <Link href="/" className={path === "/" ? "active" : ""}>
          <House size={20} />
          <span>Inicio</span>
        </Link>
        <Link href="/tienda" className={path === "/tienda" ? "active" : ""}>
          <LayoutGrid size={20} />
          <span>Tienda</span>
        </Link>
        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Buscar productos"
        >
          <span className="dock-search-icon">
            <Search size={21} />
          </span>
          <span>Buscar</span>
        </button>
        <Link href="/cuenta" className={path === "/cuenta" ? "active" : ""}>
          <UserRound size={20} />
          <span>Cuenta</span>
        </Link>
        <button
          onClick={() => setCartOpen(true)}
          aria-label={`Abrir carrito, ${cart.reduce((sum, item) => sum + item.quantity, 0)} productos`}
        >
          <span className="dock-cart-icon">
            <ShoppingBag size={20} />
            {cart.length > 0 && (
              <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b>
            )}
          </span>
          <span>Bolsa</span>
        </button>
      </nav>
    </>
  );
}
export function AgeGate() {
  const { store } = useStore();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (store?.settings.age_gate) {
      try {
        setOpen(localStorage.getItem("lp-adult") !== "yes");
      } catch {
        setOpen(true);
      }
    }
  }, [store?.settings.age_gate]);
  return (
    <Dialog open={open}>
      <DialogContent
        className="modal-content"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <Isotipo className="age-logo" />
        <p className="eyebrow" style={{ textAlign: "center" }}>
          Un espacio solo para adultos
        </p>
        <DialogTitle className="age-title">
          L’Amour es un espacio para mayores de 18 años.
        </DialogTitle>
        <DialogDescription className="age-desc">
          Entrá con tranquilidad. Tu intimidad, a tu manera.
        </DialogDescription>
        <div className="age-actions">
          <button
            className="button"
            onClick={() => {
              try {
                localStorage.setItem("lp-adult", "yes");
              } catch {}
              setOpen(false);
            }}
          >
            Soy mayor de 18
            <ArrowRight size={16} />
          </button>
          <a
            className="button secondary"
            href="https://www.google.com"
            rel="noreferrer"
          >
            Salir
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function SearchOverlay() {
  const { store, searchOpen, setSearchOpen, discreet } = useStore();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 220);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setSearchOpen]);
  const found =
    store?.products
      .filter((p) =>
        (
          p.name +
          " " +
          p.description +
          " " +
          p.tags.join(" ") +
          " " +
          store.categories.find((c) => c.id === p.category_id)?.name
        )
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(
            debounced
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase(),
          ),
      )
      .slice(0, 7) || [];
  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="modal-content search-modal">
        <DialogTitle className="sheet-title">
          ¿Qué querés descubrir?
        </DialogTitle>
        <DialogDescription className="sr-only">
          Buscá por producto, categoría o detalle.
        </DialogDescription>
        <Command shouldFilter={false} style={{ background: "transparent" }}>
          <CommandInput
            placeholder="Un producto, un ritual, un detalle…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList style={{ maxHeight: "55vh" }}>
            <CommandEmpty>No encontramos coincidencias.</CommandEmpty>
            {found.map((p) => (
              <CommandItem
                key={p.id}
                value={p.id}
                onSelect={() => {
                  setSearchOpen(false);
                  location.href = "/producto/" + p.slug;
                }}
                className="search-result"
              >
                <img
                  src={p.images[0]}
                  alt=""
                  className={discreet ? "blurred" : ""}
                />
                <div>
                  <h3>{discreet ? p.neutral_name : p.name}</h3>
                  <p>{money(p.price)}</p>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
export function CartDrawer() {
  const { cartOpen, setCartOpen } = useStore();
  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="sheet-content cart-sheet">
        <SheetTitle className="sheet-title">Tu selección</SheetTitle>
        <SheetDescription>Un espacio para lo que elegiste.</SheetDescription>
        <CartContents drawer onNavigate={() => setCartOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
export function Footer() {
  const { store } = useStore();
  const s = store?.settings;
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-main">
          <div>
            <BrandLogo vertical />
            <p style={{ fontSize: 12, color: "#d9bfc1" }}>
              Tu intimidad, a tu manera.
            </p>
          </div>
          <div>
            <h4>DESCUBRÍ</h4>
            <Link href="/tienda">La tienda</Link>
            <Link href="/categorias">Categorías</Link>
            <Link href="/sobre-lamour">Sobre L’Amour</Link>
            <Link href="/favoritos">Mis favoritos</Link>
          </div>
          <div>
            <h4>TE ACOMPAÑAMOS</h4>
            <Link href="/mi-pedido">Seguir mi pedido</Link>
            <Link href="/cuenta">Mi cuenta</Link>
            <Link href="/preguntas-frecuentes">Preguntas frecuentes</Link>
            <Link href="/envios">Envíos y entregas</Link>
            <Link href="/contacto">Contacto</Link>
          </div>
          <div>
            <h4>EN CONFIANZA</h4>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/terminos">Términos y condiciones</Link>
            {s?.instagram && (
              <a href={s.instagram} target="_blank" rel="noreferrer">
                <span className="row">
                  <Camera size={15} /> Instagram
                </span>
              </a>
            )}
            {s?.whatsapp && (
              <a
                href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent("Hola, tengo una consulta sobre L’Amour.")}`}
                target="_blank"
                rel="noreferrer"
              >
                <span className="row">
                  <MessageCircle size={15} /> WhatsApp
                </span>
              </a>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} L’Amour · Paraguay</span>
          <span className="row" style={{ gap: 6 }}>
            <Lock size={12} /> Un espacio exclusivo para mayores de 18 años.
          </span>
        </div>
      </div>
    </footer>
  );
}
export function Chrome({ children }: { children: React.ReactNode }) {
  const { store } = useStore();
  return (
    <>
      <SiteMotion />
      <Header />
      {children}
      <Footer />
      <AgeGate />
      <SearchOverlay />
      <CartDrawer />
    </>
  );
}
