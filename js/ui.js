// Renderizado de la interfaz. Todo el contenido proveniente de datos se inserta
// con textContent / atributos (nunca innerHTML) para evitar inyección de HTML.

const FALLBACK_IMAGE = 'assets/images/placeholder.svg';
const DEFAULT_IMAGE_SIZE = { width: 600, height: 600 };

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
}

export function formatPrice(product, brand) {
  if (product.priceText) return product.priceText; // texto literal del catálogo
  if (typeof product.price !== 'number') return null;
  const symbol = brand.currencySymbol ?? '$';
  return `${symbol} ${product.price.toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;
}

/** Imagen con lazy loading, dimensiones fijas, srcset y fallback si no carga. */
function productImage(product, { large = false } = {}) {
  const width = product.imageWidth ?? DEFAULT_IMAGE_SIZE.width;
  const height = product.imageHeight ?? DEFAULT_IMAGE_SIZE.height;
  const src = (large ? product.image : product.imageSmall ?? product.image) || FALLBACK_IMAGE;
  const img = el('img', {
    src,
    alt: product.imageAlt ?? `${product.name}${product.presentation ? `, ${product.presentation}` : ''}`,
    width,
    height,
    loading: large ? 'eager' : 'lazy',
    decoding: 'async',
    srcset: !large && product.imageSmall && product.image ? `${product.imageSmall} 400w, ${product.image} 800w` : null,
    sizes: !large && product.imageSmall ? '(min-width: 1100px) 260px, (min-width: 640px) 33vw, 50vw' : null,
  });
  img.addEventListener('error', () => {
    if (img.src.endsWith(FALLBACK_IMAGE)) return;
    img.removeAttribute('srcset');
    img.src = FALLBACK_IMAGE;
    img.classList.add('is-fallback');
  }, { once: true });
  return img;
}

/* ---------- Tarjetas ---------- */

function productCard(product, brand) {
  const price = formatPrice(product, brand);
  const button = el('button', {
    type: 'button',
    class: 'btn btn-primary btn-block',
    dataset: { open: product.id },
    'aria-label': `Ver producto: ${product.name}`,
    text: 'Ver producto',
  });

  return el('li', { class: 'product-card' }, [
    el('div', { class: 'card-media' }, [
      productImage(product),
      product.offer ? el('span', { class: 'badge', text: typeof product.offer === 'string' ? product.offer : 'Oferta' }) : null,
    ]),
    el('div', { class: 'card-body' }, [
      el('h3', { class: 'card-title', text: product.name }),
      product.category ? el('p', { class: 'card-category', text: product.category }) : null,
      product.reference ? el('p', { class: 'card-meta', text: `Ref. ${product.reference}` }) : null,
      product.presentation ? el('p', { class: 'card-meta', text: product.presentation }) : null,
      product.shortDescription ? el('p', { class: 'card-desc', text: product.shortDescription }) : null,
      price ? el('p', { class: 'card-price', text: price }) : null,
      button,
    ]),
  ]);
}

export function renderGrid(grid, products, brand) {
  const fragment = document.createDocumentFragment();
  products.forEach((p) => fragment.append(productCard(p, brand)));
  grid.replaceChildren(fragment);
}

/* ---------- Categorías ---------- */

export function renderCategories(container, categories, counts, total, active) {
  const chip = (slug, label, count) =>
    el('button', {
      type: 'button',
      class: 'chip',
      dataset: { category: slug },
      'aria-pressed': String(active === slug),
    }, [label, el('span', { class: 'chip-count', text: ` (${count})` })]);

  container.replaceChildren(
    chip('', 'Todos', total),
    ...categories.map((c) => chip(c.slug, c.name, counts.get(c.slug) ?? 0)),
  );
}

/* ---------- Detalle ---------- */

function detailRow(label, value) {
  if (!value) return null;
  return el('div', { class: 'detail-row' }, [el('dt', { text: label }), el('dd', { text: value })]);
}

export function buildOrderLink(product, contact) {
  const label = product.reference ? `${product.name} (Ref. ${product.reference})` : product.name;
  if (contact.whatsapp) {
    const phone = String(contact.whatsapp).replace(/\D/g, '');
    const text = encodeURIComponent(`Hola, quiero solicitar el producto: ${label}`);
    return { href: `https://wa.me/${phone}?text=${text}`, channel: 'WhatsApp' };
  }
  if (contact.instagram) {
    return { href: `https://www.instagram.com/${String(contact.instagram).replace(/^@/, '')}/`, channel: 'Instagram' };
  }
  if (contact.email) {
    return { href: `mailto:${contact.email}?subject=${encodeURIComponent(`Solicitud: ${label}`)}`, channel: 'correo' };
  }
  return null;
}

export function renderDetail(container, product, brand) {
  const price = formatPrice(product, brand);
  const order = buildOrderLink(product, brand.contact ?? {});
  const extra = product.details && typeof product.details === 'object' ? Object.entries(product.details) : [];

  container.replaceChildren(
    el('div', { class: 'detail-media' }, [productImage(product, { large: true })]),
    el('div', { class: 'detail-info' }, [
      product.category ? el('p', { class: 'card-category', text: product.category }) : null,
      el('h2', { id: 'detail-name', class: 'detail-title', text: product.name }),
      price ? el('p', { class: 'detail-price', text: price }) : null,
      product.offer && typeof product.offer === 'string' ? el('p', { class: 'badge badge-inline', text: product.offer }) : null,
      product.description ? el('p', { class: 'detail-desc', text: product.description }) : null,
      el('dl', { class: 'detail-list' }, [
        detailRow('Presentación', product.presentation),
        detailRow('Referencia', product.reference),
        detailRow('Tipo', product.type),
        ...extra.map(([k, v]) => detailRow(k, String(v))),
        detailRow('Página del catálogo', product.page ? String(product.page) : null),
      ]),
      order
        ? el('a', {
            class: 'btn btn-primary btn-block',
            href: order.href,
            target: '_blank',
            rel: 'noopener',
            text: 'Comprar / Solicitar producto',
            'aria-label': `Solicitar ${product.name} por ${order.channel} (se abre en una pestaña nueva)`,
          })
        : null,
    ]),
  );
}

/* ---------- Vista catálogo (páginas originales) ---------- */

export function renderCatalogPages(container, pages, productsById) {
  const fragment = document.createDocumentFragment();
  for (const page of pages) {
    const linked = (page.products ?? []).map((id) => productsById.get(id)).filter(Boolean);
    fragment.append(
      el('li', { class: 'catalog-page', id: `pagina-${page.number}` }, [
        el('img', {
          src: page.image,
          alt: page.alt ?? `Página ${page.number} del catálogo Agatha Beauty`,
          width: page.width ?? 1080,
          height: page.height ?? 1350,
          loading: page.number <= 1 ? 'eager' : 'lazy',
          decoding: 'async',
        }),
        linked.length
          ? el('div', { class: 'page-products' }, [
              el('p', { class: 'page-products-label', text: `Productos en esta página (${page.number}):` }),
              el('div', { class: 'chip-row' }, linked.map((p) =>
                el('button', { type: 'button', class: 'chip', dataset: { open: p.id }, text: p.name }))),
            ])
          : null,
      ]),
    );
  }
  container.replaceChildren(fragment);
}

/* ---------- Contacto ---------- */

const CONTACT_LABELS = {
  whatsapp: ['WhatsApp', (v) => `https://wa.me/${String(v).replace(/\D/g, '')}`],
  instagram: ['Instagram', (v) => `https://www.instagram.com/${String(v).replace(/^@/, '')}/`],
  phone: ['Teléfono', (v) => `tel:${String(v).replace(/[^\d+]/g, '')}`],
  email: ['Correo', (v) => `mailto:${v}`],
  website: ['Sitio web', (v) => v],
};

/** Devuelve true si hay al menos un canal de contacto real. */
export function renderContact(list, contact = {}) {
  const items = Object.entries(CONTACT_LABELS)
    .filter(([key]) => contact[key])
    .map(([key, [label, toHref]]) =>
      el('li', {}, [
        el('span', { class: 'contact-label', text: `${label}: ` }),
        el('a', { href: toHref(contact[key]), target: key === 'phone' || key === 'email' ? null : '_blank', rel: 'noopener', text: contact[key] }),
      ]));
  list.replaceChildren(...items);
  return items.length > 0;
}
