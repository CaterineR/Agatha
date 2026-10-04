#!/usr/bin/env python3
"""
Genera data/products.json y las imágenes del sitio a partir del PDF exportado de Canva.

    pip install pymupdf pillow
    python3 scripts/extract-catalog.py ruta/al/catalogo.pdf

Qué hace:
  1. Lee el texto de cada página con su posición y tipografía:
       TheSeasons-Bd             -> marca (título de la página)
       Mont-Bold #764b36         -> sección / categoría
       Garet-Bold                -> nombre del producto y precios
       Garet-Regular             -> descripciones y etiquetas de variantes
  2. Usa el marco decorativo de cada tarjeta para agrupar texto e imágenes por producto.
  3. Recorta la foto del producto exactamente como aparece en el catálogo (círculo con
     el anillo cobrizo), sin alterarla, y las fotos de tonos/variantes que la acompañan.
  4. Exporta cada página completa para la "Vista catálogo".

No inventa información: los textos se copian tal cual. Las correcciones manuales
están en OVERRIDES y documentadas en docs/AUDITORIA.md.
"""
import io, json, re, sys, unicodedata
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
PDF = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'catalogo-original' / 'catalogo.pdf'
OUT_DATA = ROOT / 'data' / 'products.json'
OUT_PRODUCTS = ROOT / 'assets' / 'images' / 'productos'
OUT_PAGES = ROOT / 'assets' / 'catalog'

FRAME_SIZES = {(522, 930), (447, 797), (521, 930), (671, 1196)}
RING_SIDES = {259, 260, 263, 264, 287}
INFO_PAGES = {1, 2}                # portada y proceso de compra: sin productos, pero se muestran en la vista catálogo
SKIP_PAGES = {121}                 # contraportada vacía
CROP_DPI = 300                     # resolución del recorte (la foto original es menor: no se pierde calidad)
PHOTO_SIZES = (320, 640)
GALLERY_WIDTH = 720
PAGE_WIDTH = 900

# Etiquetas escritas sobre la foto (color #592510). El catálogo no les pone título;
# este es el rótulo con el que se muestran en la ficha.
LABEL_TITLES = {10: 'Indicada para', 51: 'Opciones', 91: 'Aromas'}

# Correcciones manuales verificadas contra las páginas renderizadas.
OVERRIDES = {}


def slug(text):
    text = unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def center(b):
    return ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)


def inside(pt, b, m=2):
    return b[0] - m <= pt[0] <= b[2] + m and b[1] - m <= pt[1] <= b[3] + m


def parse_price(text):
    m = re.search(r'\$\s*([\d.]+)', text)
    return int(m.group(1).replace('.', '')) if m else None


def clean(text):
    return re.sub(r'\s+', ' ', text).strip()


def join_lines(lines):
    out = ''
    for line in lines:
        line = clean(line)
        if not out:
            out = line
        elif out.endswith('-') and not out.endswith(' -'):
            out += line          # "Co-" + "wash" -> "Co-wash"
        else:
            out += ' ' + line
    return clean(out)


def page_spans(page):
    spans, seen = [], set()
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            for s in line['spans']:
                if not s['text'].strip():
                    continue
                key = (s['text'], round(s['bbox'][0]), round(s['bbox'][1]))
                if key in seen:      # Canva duplica los títulos
                    continue
                seen.add(key)
                spans.append(dict(t=s['text'], b=s['bbox'], f=s['font'], c='%06x' % s['color']))
    return spans


def group_lines(spans, tol=6):
    lines = []
    for s in sorted(spans, key=lambda s: (s['b'][1], s['b'][0])):
        if lines and abs(lines[-1][0]['b'][1] - s['b'][1]) <= tol:
            lines[-1].append(s)
        else:
            lines.append([s])
    return [sorted(l, key=lambda s: s['b'][0]) for l in lines]


def parse_card(spans):
    """Convierte los textos de una tarjeta en nombre, variantes de precio, descripción y etiquetas."""
    labels = [clean(s['t']) for s in sorted(spans, key=lambda s: s['b'][0]) if s['c'] == '592510']
    text_spans = [s for s in spans if s['c'] != '592510']
    lines = group_lines(text_spans)

    name_lines, desc_lines, prices = [], [], []
    pending_label = []     # líneas Regular que pueden continuar en la etiqueta de un precio
    name_done = False
    for line in lines:
        text = clean(''.join(s['t'] for s in line))
        bold_only = all(s['f'].startswith('Garet-Bold') for s in line)
        has_price = '$' in text
        if not name_done and bold_only and not has_price:
            name_lines.append(text)
            continue
        name_done = True
        if has_price:
            label = clean(text.split('$')[0]).rstrip(':').strip()
            if pending_label and (label or text.lstrip().startswith(':')):
                label = clean(' '.join(pending_label + [label])).rstrip(':').strip()
                pending_label = []
            elif pending_label:
                desc_lines.extend(pending_label)
                pending_label = []
            prices.append(dict(label=label, price=parse_price(text)))
        else:
            if pending_label:
                desc_lines.extend(pending_label)
            pending_label = [text]
    desc_lines.extend(pending_label)
    return join_lines(name_lines), prices, desc_lines, labels


def circle_crop(page, rect):
    pix = page.get_pixmap(clip=rect, dpi=CROP_DPI)
    img = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGBA')
    side = min(img.size)
    img = img.crop((0, 0, side, side))
    mask = Image.new('L', (side * 4, side * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, side * 4 - 1, side * 4 - 1), fill=255)
    img.putalpha(mask.resize((side, side), Image.LANCZOS))
    return img


def save_webp(img, path, width):
    path.parent.mkdir(parents=True, exist_ok=True)
    if img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    img.save(path, 'WEBP', quality=82, method=6)
    return img.size


_DECOR = None


def decor_sizes(doc):
    """Tamaños de imagen que se repiten en casi todas las páginas (fondo, trazos, estrellas, marcos,
    anillos, discos, divisores): son decoración, no fotos de producto."""
    global _DECOR
    if _DECOR is None:
        counts = {}
        for p in doc:
            for im in p.get_image_info():
                key = (im['width'], im['height'])
                counts[key] = counts.get(key, 0) + 1
        _DECOR = {k for k, v in counts.items() if v >= 100} | FRAME_SIZES | {(r, r) for r in RING_SIDES} | {
            (392, 360), (391, 360), (363, 52), (336, 52), (303, 43), (628, 22),
            (1450, 724), (1326, 792), (1501, 699), (1434, 732), (1208, 1712)}
    return _DECOR


def join_description(lines):
    """Une las líneas cortadas por el diseño y conserva las listas: una línea nueva empieza
    cuando arranca con mayúscula, número o viñeta."""
    out = []
    for line in (clean(l) for l in lines):
        if out and not re.match(r'^[A-ZÁÉÍÓÚÑ0-9✨•\-–]', line):
            out[-1] += ' ' + line
        else:
            out.append(line)
    return '\n'.join(out)


def gallery_bounds(union, frame, spans, images):
    """Limita el recorte de tonos/variantes al espacio entre el nombre (y su divisor) y el precio,
    para no repetir textos de la tarjeta. Las etiquetas escritas sobre las fotos (#592510) se conservan."""
    cy = (union.y0 + union.y1) / 2
    obstacles = [s['b'] for s in spans if s['c'] != '592510']
    obstacles += [im['bbox'] for im in images if (im['width'], im['height']) in {(336, 52), (363, 52), (303, 43)}
                  and inside(center(im['bbox']), frame)]
    above = [b[3] for b in obstacles if b[3] <= cy and b[2] > union.x0 and b[0] < union.x1]
    below = [b[1] for b in obstacles if b[1] >= cy and b[2] > union.x0 and b[0] < union.x1]
    top = max([union.y0] + [y + 2 for y in above])
    bottom = min([union.y1] + [y - 2 for y in below])
    return pymupdf.Rect(max(union.x0, frame[0] + 4), top, min(union.x1, frame[2] - 4), bottom)


def save_page(page, pno, brand, page_ids, pages):
    """Exporta la página completa para la vista catálogo."""
    pix = page.get_pixmap(dpi=150)
    pimg = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
    pw, ph = save_webp(pimg, OUT_PAGES / f'pagina-{pno:03d}.webp', PAGE_WIDTH)
    pages.append(dict(number=pno, image=f'assets/catalog/pagina-{pno:03d}.webp', width=pw, height=ph,
                      alt=f'Página {pno} del catálogo Ágata Beauty' + (f': {brand}' if brand else ''),
                      **({'brand': brand} if brand else {}), products=page_ids))


def main():
    doc = pymupdf.open(PDF)
    products, pages = [], []
    for folder in (OUT_PRODUCTS, OUT_PAGES):   # se regeneran completas: sin archivos huérfanos
        folder.mkdir(parents=True, exist_ok=True)
        for old in folder.glob('*.webp'):
            old.unlink()

    for pno, page in enumerate(doc, start=1):
        if pno in SKIP_PAGES:
            continue
        if pno in INFO_PAGES:
            save_page(page, pno, None, [], pages)
            continue
        spans = page_spans(page)
        brand = next((clean(s['t']) for s in spans if s['f'].startswith('TheSeasons')), None)
        section = clean(' '.join(s['t'] for s in sorted(spans, key=lambda s: s['b'][0])
                                 if s['f'] == 'Mont-Bold' and s['c'] == '764b36')) or None
        if section:
            section = section[0].upper() + section[1:]   # "labios" -> "Labios" (mismo nombre, otra mayúscula)

        images = page.get_image_info(xrefs=True)
        frames = []
        for im in images:
            if (im['width'], im['height']) in FRAME_SIZES:
                bb = tuple(round(v) for v in im['bbox'])
                if bb not in frames:
                    frames.append(bb)
        frames.sort(key=lambda b: (round(b[1] / 100), b[0]))

        page_ids = []
        for idx, fb in enumerate(frames, start=1):
            fspans = [s for s in spans if inside(center(s['b']), fb)
                      and not s['f'].startswith('TheSeasons')
                      and not (s['f'] == 'Mont-Bold' and s['c'] == '764b36')]
            name, prices, desc, labels = parse_card(fspans)
            if not name:
                continue
            pid = f'{slug(brand)}-{pno:03d}-{idx}'

            # Anillo: imagen cuadrada del tamaño del círculo; si hay varias, la primera (arriba / izquierda).
            rings = [im for im in images
                     if im['width'] == im['height'] and im['width'] in RING_SIDES
                     and inside(center(im['bbox']), fb)]
            wide = (fb[2] - fb[0]) > (fb[3] - fb[1])
            rings.sort(key=lambda im: center(im['bbox'])[0] if wide else center(im['bbox'])[1])
            ring = pymupdf.Rect(rings[0]['bbox']) if rings else None

            product = dict(id=pid, name=name, brand=brand)
            if section:
                product['category'] = section
            valid = [p for p in prices if p['price'] is not None]
            if len(valid) == 1 and not valid[0]['label']:
                product['price'] = valid[0]['price']
            elif valid:
                product['price'] = min(p['price'] for p in valid)
                product['variants'] = [dict(label=p['label'], price=p['price']) for p in valid]
            m = re.search(r'\bx\s?(\d+(?:[.,]\d+)?)\s?(ml|gr|g|Ml)\b', name, re.I)
            if m:
                product['presentation'] = f"{m.group(1)} {m.group(2).lower()}"
            if desc:
                product['description'] = join_description(desc)
            if labels:
                product['details'] = {LABEL_TITLES.get(pno, 'Etiquetas'): ', '.join(labels)}

            if ring:
                img = circle_crop(page, ring + (-1, -1, 1, 1))
                for w in PHOTO_SIZES:
                    save_webp(img, OUT_PRODUCTS / f'{pid}-{w}.webp', w)
                product['imageSmall'] = f'assets/images/productos/{pid}-{PHOTO_SIZES[0]}.webp'
                product['image'] = f'assets/images/productos/{pid}-{PHOTO_SIZES[1]}.webp'
                product['imageWidth'] = product['imageHeight'] = PHOTO_SIZES[1]
                product['imageAlt'] = f'{name} de {brand}, fotografía del catálogo'

                # Fotos de tonos / variantes: imágenes de la tarjeta fuera del círculo.
                extra = [pymupdf.Rect(im['bbox']) & pymupdf.Rect(fb) for im in images
                         if im['xref'] and inside(center(im['bbox']), fb)
                         and (im['width'], im['height']) not in decor_sizes(doc)
                         and not inside(center(im['bbox']), ring)
                         and im['width'] > 100 and im['height'] > 100]
                extra = [r for r in extra if not r.is_empty and r.width > 20 and r.height > 20]
                if extra:
                    union = extra[0]
                    for r in extra[1:]:
                        union |= r
                    union = gallery_bounds(union, fb, fspans, images)
                if extra and union.height > 30:
                    pix = page.get_pixmap(clip=union, dpi=CROP_DPI)
                    g = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
                    gw, gh = save_webp(g, OUT_PRODUCTS / f'{pid}-variantes.webp', GALLERY_WIDTH)
                    product['gallery'] = [dict(src=f'assets/images/productos/{pid}-variantes.webp', width=gw, height=gh,
                                               alt=f'{name}: tonos y presentaciones según el catálogo')]
            product['page'] = pno
            product.update(OVERRIDES.get(pid, {}))
            products.append(product)
            page_ids.append(pid)

        save_page(page, pno, brand, page_ids, pages)
        print(f'p{pno:3d} {brand!s:16} {section!s:18} {len(page_ids)} producto(s)')

    data = json.loads(OUT_DATA.read_text()) if OUT_DATA.exists() else {}
    data['pages'] = pages
    data['products'] = products
    OUT_DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'\n{len(products)} productos, {len(pages)} páginas -> {OUT_DATA.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
