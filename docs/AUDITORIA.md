# Fase 1 — Auditoría del catálogo original

**Fuente:** https://canva.link/agatabeautycatalogo
**Estado:** ⛔ No realizada — sin acceso al catálogo.

## Problema de extracción

El entorno de desarrollo bloquea `canva.link` y `canva.com` (la política de red responde 403). Aunque se permitiera el acceso, Canva carga el contenido con JavaScript, así que la extracción automática de textos y fotos sería poco fiable.

**Solución:** exportar desde Canva y guardar en `catalogo-original/`:

1. PDF del catálogo (Compartir → Descargar → PDF estándar).
2. PNG de cada página (para la paleta y la composición, y para la Vista catálogo).
3. Fotografías originales de los productos, si existen por separado.
4. Logotipo (PNG transparente o SVG).
5. Nombres de las tipografías usadas en Canva.

## Diagnóstico

| Aspecto | Resultado |
| --- | --- |
| Número de páginas | [INFORMACIÓN PENDIENTE] |
| Categorías | [INFORMACIÓN PENDIENTE] |
| Cantidad de productos | [INFORMACIÓN PENDIENTE] |
| Datos disponibles por producto (precio, referencia, presentación…) | [INFORMACIÓN PENDIENTE] |
| Paleta de colores | [INFORMACIÓN PENDIENTE] |
| Tipografías | [INFORMACIÓN PENDIENTE] |
| Elementos gráficos / fondos / iconografía | [INFORMACIÓN PENDIENTE] |
| Canales de contacto / compra | [INFORMACIÓN PENDIENTE] |
| Ofertas | [INFORMACIÓN PENDIENTE] |

## Fase 2 — Modelo de datos

| ID | Producto | Categoría | Referencia | Precio | Imagen |
| -- | -------- | --------- | ---------- | ------ | ------ |
| — | [INFORMACIÓN PENDIENTE] | | | | |

## Decisiones tomadas sin el catálogo (reversibles)

- La interfaz se construyó con `products.json` vacío; no se incluyó ningún producto, precio ni categoría inventados.
- Colores y tipografías son neutros y provisionales, centralizados en las variables de `css/styles.css`.
- Favicon provisional (letra "A"), a reemplazar por el isotipo real.
- La meta `og:locale` es `es_CO` y los precios se formatean con separador de miles. Hay que confirmarlo con el catálogo.
