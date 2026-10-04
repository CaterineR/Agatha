// Marcas, categorías, ofertas y ordenamiento derivados de los datos reales.
// Marcas y categorías NO se definen a mano: salen de products.json.

/** Valores distintos de un campo, en el orden en que aparecen en el catálogo original. */
function getFacet(products, field) {
  const values = new Map();
  for (const product of products) {
    const slug = product[`${field}Slug`];
    if (slug && !values.has(slug)) values.set(slug, { slug, name: product[field] });
  }
  return [...values.values()];
}

export const getCategories = (products) => getFacet(products, 'category');
export const getBrands = (products) => getFacet(products, 'brand');

function countBy(products, key) {
  const counts = new Map();
  for (const product of products) {
    if (product[key]) counts.set(product[key], (counts.get(product[key]) ?? 0) + 1);
  }
  return counts;
}

export const countByCategory = (products) => countBy(products, 'categorySlug');
export const countByBrand = (products) => countBy(products, 'brandSlug');

export const hasPrices = (products) => products.some((p) => typeof p.price === 'number');
export const hasOffers = (products) => products.some((p) => p.offer);

export function filterProducts(products, { brand, category, offers }) {
  return products.filter(
    (p) => (!brand || p.brandSlug === brand) && (!category || p.categorySlug === category) && (!offers || p.offer),
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
