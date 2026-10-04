# Catálogo original (fuente)

Aquí va la exportación de Canva **sin modificar**:

- `catalogo.pdf`: PDF del catálogo (Compartir → Descargar → PDF).

El PDF de 2026 pesa unos 160 MB y GitHub no acepta archivos de más de 100 MB, así que **no se sube al repositorio** (está en `.gitignore`). Guárdalo aquí en tu computador y, cuando cambie el catálogo, regenera el sitio con:

```bash
pip install pymupdf pillow
npm run catalog        # equivale a: python3 scripts/extract-catalog.py catalogo-original/catalogo.pdf
```

El script vuelve a generar `data/products.json` (conservando el bloque `brand`), las fotos de producto en `assets/images/productos/` y las páginas en `assets/catalog/`.
