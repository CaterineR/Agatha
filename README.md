# Agatha Beauty — Catálogo digital interactivo

Versión web del catálogo de Agatha Beauty (diseñado originalmente en Canva). Conserva la identidad visual del catálogo y permite **buscar, filtrar y consultar productos sin pasar página por página**.

> **Estado actual (v0.1):** el motor del catálogo está construido y probado, pero **aún no contiene productos**. Falta la auditoría del catálogo original (ver [`docs/AUDITORIA.md`](docs/AUDITORIA.md)). La paleta y las tipografías son provisionales. `[INFORMACIÓN PENDIENTE]`

## Ejecutar en local

El sitio es HTML + CSS + JavaScript sin compilación, pero carga `data/products.json`, así que necesita un servidor local (abrir `index.html` con doble clic no funciona).

```bash
# Opción 1 — sin instalar nada
python3 -m http.server 8080

# Opción 2 — con Node.js
npm install
npm start
```

Abrir <http://localhost:8080>.

## Estructura

```
index.html              Página única (header, portada, catálogo, contacto, detalle)
css/styles.css          Estilos base mobile first + variables de identidad visual
css/responsive.css      Puntos de quiebre (tablet 640px, escritorio 900px / 1100px)
js/app.js               Punto de entrada: carga datos, eventos, sincronización
js/products.js          Carga y validación de data/products.json
js/search.js            Búsqueda instantánea (sin tildes ni mayúsculas, varias palabras)
js/filters.js           Categorías (derivadas de los datos), ofertas y ordenamiento
js/state.js             Estado en la URL (atrás del navegador y enlaces compartibles)
js/ui.js                Renderizado de tarjetas, detalle, vista catálogo y contacto
data/products.json      ÚNICA fuente de datos: marca, contacto, páginas y productos
assets/images/          Fotos de producto optimizadas (WebP) + placeholder.svg
assets/catalog/         Páginas del catálogo original exportadas (vista catálogo)
assets/logo/            Logotipo
assets/icons/           Favicon (provisional)
assets/fonts/           Tipografías del catálogo, si se pueden usar en web
catalogo-original/      Exportaciones originales de Canva — NO modificar
scripts/optimize-images.mjs  Conversión de fotos a WebP (sin alterar el producto)
docs/AUDITORIA.md       Diagnóstico del catálogo original y datos pendientes
```

## Cómo agregar o modificar productos

Todo se edita en `data/products.json`; no hace falta tocar HTML ni JavaScript.

```json
{
  "id": "producto-001",
  "name": "Nombre exacto del catálogo",
  "category": "Categoría exacta del catálogo",
  "type": "Tipo de producto",
  "reference": "Referencia",
  "price": 25000,
  "priceText": "$25.000",
  "presentation": "Presentación",
  "shortDescription": "Texto breve para la tarjeta",
  "description": "Descripción completa del catálogo",
  "offer": "Texto de la oferta, o true",
  "details": { "Tono": "…", "Contenido": "…" },
  "tags": ["palabras", "extra", "para", "buscar"],
  "image": "assets/images/producto-001-800.webp",
  "imageSmall": "assets/images/producto-001-400.webp",
  "imageWidth": 800,
  "imageHeight": 800,
  "imageAlt": "Descripción de la foto",
  "page": 3
}
```

Reglas:

- **Solo `id` y `name` son obligatorios.** Los demás campos se escriben únicamente si el dato existe en el catálogo original. Un campo ausente simplemente no se muestra; **no inventes datos**.
- `id` debe ser único y no cambiar (se usa en los enlaces: `?producto=producto-001`).
- `price` es un número (sin puntos ni símbolo) y sirve para ordenar. `priceText` es opcional: si existe, se muestra tal cual aparece en el catálogo. El orden por precio solo aparece si algún producto tiene `price`.
- Las **categorías se generan automáticamente** a partir de `category`, en el orden en que aparecen. Para crear una categoría basta con usarla en un producto.
- `offer` marca el producto como oferta. El menú "Ofertas" solo aparece si existe al menos uno.
- `page` enlaza el producto con su página en la vista catálogo.

### Marca, contacto y páginas del catálogo

```json
"brand": {
  "name": "Agatha Beauty",
  "tagline": "Frase de la portada, si existe",
  "logo": "assets/logo/agatha-beauty.svg",
  "currencySymbol": "$",
  "contact": {
    "whatsapp": "+57 …",
    "instagram": "@usuario",
    "phone": "…",
    "email": "…",
    "website": "https://…"
  }
},
"pages": [
  { "number": 1, "image": "assets/catalog/pagina-01.webp", "width": 1080, "height": 1350, "products": ["producto-001", "producto-002"] }
]
```

- La sección Contacto y el botón **"Comprar / Solicitar producto"** solo aparecen si hay canales reales en `contact`. Prioridad del botón: WhatsApp (con mensaje que incluye el nombre y la referencia del producto) → Instagram → correo.
- `pages` alimenta la **Vista catálogo**: muestra las páginas originales en orden, y bajo cada página hay botones para abrir sus productos.

### Optimizar fotografías

```bash
npm install
npm run images -- catalogo-original/fotos assets/images
```

Genera `nombre-400.webp` (`imageSmall`) y `nombre-800.webp` (`image`) e imprime las dimensiones para `products.json`. **Solo redimensiona y comprime**: no recorta ni retoca. Las fotografías deben ser siempre las reales del catálogo.

## Cambiar la identidad visual

Colores, tipografías, radios y fondo de la portada están en el primer bloque de `css/styles.css` (variables `--color-*`, `--font-*`, `--radius-*`, `--hero-*`). Ese bloque es el único que hay que modificar para aplicar la identidad del catálogo original.

## Funcionalidades

- Búsqueda instantánea por nombre, categoría, tipo, referencia, presentación, descripción y etiquetas. No distingue tildes ni mayúsculas, y con varias palabras exige todas ("labial rojo").
- Filtro por categoría con contador por categoría, y filtro de ofertas cuando existen.
- Ordenamiento: orden del catálogo, nombre A-Z / Z-A, y precio si hay precios.
- Contador "Mostrando X de Y productos" y estado sin resultados con "Limpiar búsqueda".
- Detalle en ventana modal (pantalla completa en celular), con enlace propio, cierre con Esc y "← Volver al catálogo".
- Búsqueda, categoría, orden, vista y producto viven en la URL: el botón atrás del navegador no pierde el filtro y se puede compartir un enlace a un producto.
- Vista productos (búsqueda) / Vista catálogo (páginas originales).
- Imágenes con carga diferida, dimensiones definidas, `srcset` y una imagen de respaldo si alguna falla.
- Accesibilidad: HTML semántico, navegación por teclado, foco visible, ARIA en controles y movimiento reducido respetado.

## Evolución prevista (no implementada)

- **V2:** favoritos, carrito y pedido por WhatsApp. El botón de solicitud ya construye el mensaje por producto (`buildOrderLink` en `js/ui.js`).
- **V3:** backend, base de datos, panel administrador, inventario. `products.json` puede pasar a ser la respuesta de una API con la misma forma.
- **V4:** e-commerce, pagos, usuarios.
