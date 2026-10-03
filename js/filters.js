// Categorías, ofertas y ordenamiento derivados de los datos reales.
// Las categorías NO se definen a mano: salen de products.json.

export function getCategories(products) {
  const categories = new Map();
  for (const product of products) {
    if (!product.categorySlug) continue;
    if (!categories.has(product.categorySlug)) {
      categories.set(product.categorySlug, { slug: product.categorySlug, name: product.category, firstOrder: product.order });
    }
  }
  // Se conserva el orden de aparición en el catálogo original.
  return [...categories.values()].sort((a, b) => a.firstOrder - b.firstOrder);
}

export function countByCategory(products) {
  const counts = new Map();
  for (const product of products) {
    if (product.categorySlug) counts.set(product.categorySlug, (counts.get(product.categorySlug) ?? 0) + 1);
  }
  return counts;
}

export const hasPrices = (products) => products.some((p) => typeof p.price === 'number');
export const hasOffers = (products) => products.some((p) => p.offer);

export function filterProducts(products, { category, offers }) {
  return products.filter(
    (p) => (!category || p.categorySlug === category) && (!offers || p.offer),
  );
}

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

const SORTERS = {
  'name-asc': (a, b) => collator.compare(a.name, b.name),
  'name-desc': (a, b) => collator.compare(b.name, a.name),
  // Los productos sin precio quedan al final en ambos sentidos.
  'price-asc': (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
  'price-desc': (a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity),
};

export function sortProducts(products, sort) {
  const sorter = SORTERS[sort];
  const byCatalogOrder = (a, b) => a.order - b.order;
  return [...products].sort((a, b) => (sorter ? sorter(a, b) || byCatalogOrder(a, b) : byCatalogOrder(a, b)));
}

export const isValidSort = (sort, pricesAvailable) =>
  sort === '' || (sort in SORTERS && (pricesAvailable || !sort.startsWith('price')));
