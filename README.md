# L’Amour

Boutique íntima para Paraguay construida con React, TypeScript, Vinext/Vite, Tailwind, React Hook Form y Zod. Identidad original preservada a partir de los PNG oficiales.

## Operación

- El catálogo inicia con ocho productos de demostración, identificados en las fichas y en administración. Las solicitudes se guardan en la base de datos; no hay cobros automáticos.
- /admin requiere una sesión de ChatGPT y un correo incluido en ADMIN_EMAILS. La cuenta propietaria ya está configurada en el entorno publicado. La autenticación no basta por sí sola: todas las operaciones de administración validan la lista en el servidor.
- Configurar productos reales, fotos, precios, plazos, contacto, zonas, medios de pago y políticas antes de desactivar el modo de demostración. Los productos marcados como demostración se excluyen al desactivarlo.
- Los pedidos disponibles reservan stock en una transacción. Una cancelación no repone stock automáticamente; la administración debe comprobar el inventario y ajustarlo explícitamente.
- Los métodos manuales admiten transferencia, QR/manual y efectivo contra entrega. No hay integración bancaria automática ni envío automático de mensajes o correos.
- Newsletter guarda consentimiento; el envío de campañas requiere conectar un proveedor externo.

## Datos y seguridad

D1 almacena catálogo, variantes, imágenes, categorías, pedidos, historial, auditoría, configuración, cupones, suscripciones y límites de solicitudes. R2 almacena imágenes subidas. Supabase gestiona la autenticación y los perfiles cuando se configuran sus variables; los pedidos permanecen en D1 y se asocian a la cuenta mediante el identificador verificado. La clave service role se usa solo en el servidor.

El servidor recalcula precios, entrega y descuentos. Las confirmaciones usan claves de idempotencia. Las transacciones y restricciones impiden inventarios negativos. El seguimiento devuelve solo código, estado, fechas e historial tras verificar el correo o teléfono. Los endpoints usan consultas preparadas, validación, controles de origen y límites de intentos.

El modo discreto y los favoritos se guardan localmente, así como el carrito provisional. La preferencia visual no oculta el historial del navegador. El service worker solo cachea imágenes públicas; nunca pedidos, checkout o administración.

## Configuración

ADMIN_EMAILS: correos administradores separados por coma (configurado como secreto en Sites).
SITE_URL: origen canónico de la tienda. El valor utilizado para metadata también está en lib/site.ts; actualizarlo al cambiar de dominio.
DB y BUCKET: bindings nativos declarados en .openai/hosting.json; no requieren claves en el cliente.
SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY: configuración pública del proyecto de autenticación.
SUPABASE_SERVICE_ROLE_KEY: secreto exclusivo del servidor para la auditoría administrativa. Ejecutar `supabase/schema.sql` una vez en el SQL Editor.

## Verificación

node node_modules/typescript/bin/tsc --noEmit
node tests/commerce/run.mjs

Las pruebas de comercio usan SQLite aislado y un contexto de identidad simulado; no leen ni modifican la base publicada. Cubren catálogo persistido, precio calculado en servidor, idempotencia, stock, agotados, verificación de seguimiento, acceso denegado sin autorización, edición validada, variantes, historial, cupones, consentimiento y rechazo de origen externo.

La revisión en navegador cubrió inicio, filtros, carrito, confirmación y seguimiento verificado de un pedido de prueba, modo discreto y favoritos. Se revisó ausencia de desbordamiento horizontal de la home en anchos de 360, 390, 430, 768, 1024, 1440 y 1920 px. Lighthouse y una auditoría WCAG formal no se ejecutaron; no se atribuyen puntuaciones no medidas.

## Estructura

app/: rutas y APIs.
components/: identidad, tienda, catálogo, detalle, compra, información y administración.
lib/: modelos, demo, cliente HTTP, utilidades y acceso al servidor.
db/schema.ts y drizzle/: esquema y migraciones versionadas.
public/brand/: versiones optimizadas de los logos oficiales.
public/images/: fotografías editoriales e imágenes ilustrativas de demostración.
tests/commerce/: pruebas de integración aisladas.
