// Búsqueda instantánea, sin distinguir mayúsculas ni tildes.
// "labial rojo" devuelve los productos que contienen TODAS las palabras.

export function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const SEARCH_FIELDS = ['name', 'brand', 'category', 'type', 'reference', 'presentation', 'description', 'shortDescription'];

/** Precalcula el texto buscable de cada producto (una sola vez al cargar). */
export function buildIndex(products) {
  const index = new Map();
  for (const product of products) {
    const parts = SEARCH_FIELDS.map((field) => product[field])
      .concat(product.tags, product.variants.map((v) => v.label), Object.values(product.details ?? {}));
    index.set(product.id, normalizeText(parts.filter(Boolean).join(' ')));
  }
  return index;
}

export function searchProducts(products, index, query) {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return products;
  return products.filter((product) => {
    const haystack = index.get(product.id) ?? '';
    return terms.every((term) => haystack.includes(term));
  });
}
