// Estado de la interfaz sincronizado con la URL.
// Permite volver atrás sin perder búsqueda/categoría y compartir enlaces a un producto.
//   ?q=labial&cat=maquillaje&orden=name-asc&vista=catalogo&ofertas=1&producto=producto-001

const PARAMS = {
  query: 'q',
  category: 'cat',
  sort: 'orden',
  view: 'vista',
  offers: 'ofertas',
  product: 'producto',
};

export const DEFAULT_STATE = Object.freeze({
  query: '',
  category: '',
  sort: '',
  view: 'productos',
  offers: false,
  product: '',
});

export function readState(location = window.location) {
  const params = new URLSearchParams(location.search);
  return {
    query: params.get(PARAMS.query) ?? '',
    category: params.get(PARAMS.category) ?? '',
    sort: params.get(PARAMS.sort) ?? '',
    view: params.get(PARAMS.view) === 'catalogo' ? 'catalogo' : 'productos',
    offers: params.get(PARAMS.offers) === '1',
    product: params.get(PARAMS.product) ?? '',
  };
}

function toUrl(state) {
  const params = new URLSearchParams();
  if (state.query) params.set(PARAMS.query, state.query);
  if (state.category) params.set(PARAMS.category, state.category);
  if (state.sort) params.set(PARAMS.sort, state.sort);
  if (state.view !== 'productos') params.set(PARAMS.view, state.view);
  if (state.offers) params.set(PARAMS.offers, '1');
  if (state.product) params.set(PARAMS.product, state.product);
  const search = params.toString();
  return `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
}

/**
 * Guarda el estado en la URL.
 * push=true crea una entrada en el historial (abrir producto, cambiar de vista);
 * push=false la reemplaza (escribir en el buscador no debe llenar el historial).
 */
export function writeState(state, { push = false } = {}) {
  const url = toUrl(state);
  if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  history[push ? 'pushState' : 'replaceState']({ agatha: true }, '', url);
}
