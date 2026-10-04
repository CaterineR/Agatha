# Ágata Beauty — Catálogo digital interactivo

Versión web del **Catálogo 2026 de Ágata Beauty** (*Makeup • Skincare • Selfcare*), diseñado originalmente en Canva. Conserva la identidad del catálogo (fotografías, textos, precios, colores, tipografías del logo, el círculo con anillo cobrizo y los adornos de línea) y permite **buscar, filtrar por marca y categoría y consultar cada producto sin pasar página por página**.

- **225 productos** de **25 marcas**, extraídos del PDF original de 121 páginas.
- Vista productos (búsqueda) y **vista catálogo** (las páginas originales, con índice por marca).
- Botón **"Comprar / Solicitar producto"** que abre WhatsApp (3135496268) con el nombre del producto, siguiendo el proceso de compra del catálogo.

El diagnóstico completo y los datos pendientes están en [`docs/AUDITORIA.md`](docs/AUDITORIA.md). La lista de productos está en [`docs/PRODUCTOS.md`](docs/PRODUCTOS.md).

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
index.html                  Página única: portada, catálogo, cómo comprar, contacto, detalle
css/styles.css              Estilos base mobile first + variables de identidad visual
css/responsive.css          Puntos de quiebre (640px, 900px, 1100px)
js/app.js                   Punto de entrada: carga datos, eventos, sincronización con la URL
js/products.js              Carga y validación de data/products.json
js/search.js                Búsqueda instantánea (sin tildes ni mayúsculas, varias palabras)
js/filters.js               Marcas y categorías (derivadas de los datos), ofertas y orden
js/state.js                 Estado en la URL (atrás del navegador y enlaces compartibles)
js/ui.js                    Tarjetas, detalle, vista catálogo, proceso de compra, contacto
data/products.json          ÚNICA fuente de datos: marca, contacto, proceso de compra, páginas y productos
assets/images/productos/    Foto de cada producto (círculo del catálogo) + fotos de tonos/variantes
assets/catalog/             Páginas originales del catálogo (vista catálogo)
assets/images/decor/        Fondo y adornos de línea extraídos del catálogo
assets/icons/               Favicon e íconos de Instagram / WhatsApp del catálogo
catalogo-original/          Lugar del PDF de Canva (no se sube: pesa ~160 MB)
scripts/extract-catalog.py  Genera productos, fotos y páginas a partir del PDF
scripts/optimize-images.mjs Convierte fotos sueltas a WebP (para productos agregados a mano)
docs/                       Auditoría del catálogo y tabla de productos
```

## Actualizar el catálogo cuando cambie el PDF

Si el catálogo se sigue editando en Canva, lo más fácil es regenerarlo todo:

1. Exportar desde Canva: **Compartir → Descargar → PDF estándar**.
2. Guardarlo como `catalogo-original/catalogo.pdf`.
3. Ejecutar:

   ```bash
   pip install pymupdf pillow
   npm run catalog
   ```

El script lee cada página (marca, sección, nombre, precios y descripciones según la tipografía del catálogo), recorta la foto de cada producto tal como aparece en el círculo y exporta las páginas. Conserva el bloque `brand` de `products.json` y reemplaza `pages` y `products`. Revisa el resumen que imprime y la página en el navegador antes de publicar.

> El script depende del diseño actual (marco de tarjeta, círculo, tipografías). Si cambia la plantilla de Canva, puede necesitar ajustes.

## Agregar o modificar productos a mano

También se puede editar `data/products.json` directamente, sin tocar HTML ni JavaScript (los cambios manuales se pierden si después se regenera desde el PDF):

```json
{
  "id": "montoc-003-2",
  "name": "Polvos Translúcidos",
  "brand": "Montoc",
  "category": "Rostro",
  "price": 27000,
  "variants": [
    { "label": "5gr", "price": 27000 },
    { "label": "10gr", "price": 33000 },
    { "label": "30gr", "price": 62000 }
  ],
  "presentation": "Contenido, si aparece en el catálogo (p. ej. 450 ml)",
  "description": "Texto tal como aparece en el catálogo",
  "details": { "Aromas": "Irresistible, Majestuosa" },
  "reference": "Referencia",
  "offer": "Texto de la oferta, o true",
  "tags": ["palabras", "extra", "para", "buscar"],
  "image": "assets/images/productos/montoc-003-2-640.webp",
  "imageSmall": "assets/images/productos/montoc-003-2-320.webp",
  "imageWidth": 640,
  "imageHeight": 640,
  "imageAlt": "Descripción de la foto",
  "gallery": [{ "src": "assets/images/productos/montoc-003-2-variantes.webp", "width": 720, "height": 400, "alt": "…" }],
  "page": 3
}
```

Reglas:

- **Solo `id` y `name` son obligatorios.** Los demás campos se escriben únicamente si el dato existe en el catálogo. Un campo ausente no se muestra; **no inventes datos**.
- `id` debe ser único y no cambiar (se usa en los enlaces: `?producto=montoc-003-2`).
- `price` es un número sin puntos ni símbolo y sirve para ordenar. Si hay `variants` (tamaños, tonos…), `price` es el menor y la tarjeta muestra la lista completa.
- **Marcas y categorías se generan automáticamente** a partir de `brand` y `category`, en el orden en que aparecen en el catálogo.
- `offer` marca el producto como oferta. El menú "Ofertas" solo aparece si existe al menos uno (el catálogo 2026 no tiene ofertas).
- `page` enlaza el producto con su página en la vista catálogo (botón "Ver en el catálogo original").
- Para fotos nuevas: `npm run images -- carpeta-con-fotos assets/images/productos` (solo redimensiona y comprime; no altera el producto).

### Marca, contacto y proceso de compra

El bloque `brand` de `products.json` contiene el nombre, el lema, el contacto (`whatsapp`, `whatsappCountryCode`, `instagram`, y opcionalmente `phone`, `email`, `website`) y los pasos de **Proceso de compra** copiados de la página 2 del catálogo. La sección Contacto, los íconos de la portada y el botón de WhatsApp se generan desde ahí.

## Cambiar la identidad visual

Colores, tipografías y radios están en el primer bloque de `css/styles.css` (variables `--color-*`, `--font-*`, `--gradient-*`). Los valores se midieron sobre el catálogo original.

Tipografías: el logo usa **Cormorant Garamond** y **Dancing Script**, las mismas del catálogo (Google Fonts). Los títulos de marca del catálogo usan *The Seasons* y los textos *Garet* / *Mont*, fuentes con licencia de Canva que no pueden publicarse en la web; se reemplazaron por Cormorant Garamond y **Poppins** (que el catálogo también usa).

## Funcionalidades

- Búsqueda instantánea por nombre, marca, categoría, presentación, descripción, variantes y etiquetas. No distingue tildes ni mayúsculas, y con varias palabras exige todas ("shampoo niños").
- Filtro por marca (con contador) y por categoría (con contador). Cada contador tiene en cuenta los demás filtros.
- Orden: catálogo, nombre A-Z / Z-A, precio menor/mayor.
- Contador "Mostrando X de Y productos" y estado sin resultados con "Limpiar búsqueda".
- Detalle en ventana modal (pantalla completa en celular) con enlace propio, fotos de tonos, aviso de disponibilidad, cierre con Esc y "← Volver al catálogo".
- Búsqueda, marca, categoría, orden, vista y producto viven en la URL: el botón atrás del navegador no pierde el filtro y se puede compartir un enlace a un producto.
- Vista catálogo con las páginas originales, índice por marca y botones para abrir los productos de cada página.
- Imágenes WebP con carga diferida, dimensiones definidas, `srcset` y una imagen de respaldo si alguna falla.
- Accesibilidad: HTML semántico, navegación por teclado, foco visible, ARIA en controles, movimiento reducido respetado.

## Evolución prevista (no implementada)

- **V2:** favoritos, carrito y pedido por WhatsApp con varios productos. El botón actual ya arma el mensaje por producto (`buildOrderLink` en `js/ui.js`).
- **V3:** backend, base de datos, panel administrador, inventario. `products.json` puede pasar a ser la respuesta de una API con la misma forma.
- **V4:** e-commerce, pagos, usuarios.
