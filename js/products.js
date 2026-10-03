// Carga y normalización de data/products.json.
// Los campos son opcionales: solo se muestran los que existen en el catálogo original.

const DATA_URL = 'data/products.json';

export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const isPresent = (value) => value !== undefined && value !== null && value !== '';

function normalizeProduct(raw, index) {
  if (!isPresent(raw.id) || !isPresent(raw.name)) {
    console.warn('[Agatha] Producto ignorado: falta "id" o "name".', raw);
    return null;
  }
  const product = { ...raw, order: index };
  if (isPresent(raw.category)) product.categorySlug = slugify(raw.category);
  if (isPresent(raw.price)) {
    const price = Number(raw.price);
    if (Number.isFinite(price)) product.price = price;
    else delete product.price;
  }
  product.tags = Array.isArray(raw.tags) ? raw.tags : [];
  return product;
}

export async function loadCatalog(url = DATA_URL) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`No se pudo cargar ${url} (${response.status})`);
  const data = await response.json();

  const seen = new Set();
  const products = (data.products ?? [])
    .map(normalizeProduct)
    .filter((p) => {
      if (!p) return false;
      if (seen.has(p.id)) {
        console.warn(`[Agatha] ID duplicado ignorado: ${p.id}`);
        return false;
      }
      seen.add(p.id);
      return true;
    });

  return {
    brand: data.brand ?? {},
    pages: Array.isArray(data.pages) ? data.pages : [],
    products,
  };
}
