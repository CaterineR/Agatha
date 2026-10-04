// Punto de entrada: carga los datos, conecta eventos y sincroniza la interfaz con la URL.

import { loadCatalog } from './products.js';
import { buildIndex, searchProducts } from './search.js';
import {
  getCategories, getBrands, countByCategory, countByBrand,
  filterProducts, sortProducts, hasPrices, hasOffers, isValidSort,
} from './filters.js';
import { readState, writeState } from './state.js';
import {
  $, $$, renderGrid, renderCategories, renderBrandOptions, renderDetail,
  renderCatalogPages, renderPageIndex, renderProcess, renderContact,
} from './ui.js';

const DEFAULT_TITLE = document.title;

const dom = {
  searchForm: $('[data-search-form]'),
  searchInput: $('[data-search-input]'),
  brandSelect: $('[data-brand-select]'),
  sortSelect: $('[data-sort-select]'),
  categories: $('[data-categories]'),
  count: $('[data-result-count]'),
  grid: $('[data-product-grid]'),
  empty: $('[data-empty]'),
  pending: $('[data-pending]'),
  pages: $('[data-catalog-pages]'),
  pagesPending: $('[data-pages-pending]'),
  dialog: $('[data-dialog]'),
  detail: $('[data-detail]'),
  menuToggle: $('.menu-toggle'),
  nav: $('#main-nav'),
};

let catalog = { brand: {}, pages: [], products: [] };
let index = new Map();
let productsById = new Map();
let categories = [];
let brands = [];
let pricesAvailable = false;
let state = readState();
let openedFromApp = false; // true si el detalle se abrió con pushState (Volver = history.back)
let lastOpenedId = ''; // producto abierto, para devolver el foco a su botón al cerrar

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Render ---------- */

function setText(selector, value) {
  const node = $(selector);
  if (node && value) node.textContent = value;
}

function renderBrand() {
  const { brand } = catalog;
  if (brand.name) $$('[data-brand-name]').forEach((n) => { n.textContent = brand.name; });
  setText('[data-brand-claim]', brand.claim);
  setText('[data-brand-edition]', brand.edition);
  setText('[data-brand-tagline]', brand.tagline);
  setText('[data-footer-tagline]', brand.tagline);
  $('[data-year]').textContent = new Date().getFullYear();

  const hasContact = renderContact([$('[data-contact-list]'), $('[data-hero-contact]')], brand.contact);
  $('#contacto').hidden = !hasContact;
  $('[data-nav-contact]').hidden = !hasContact;
  $('#como-comprar').hidden = !renderProcess($('#como-comprar'), brand.purchaseProcess);
  $('[data-nav-offers]').hidden = !hasOffers(catalog.products);

  // Ordenar por precio solo si el catálogo trae precios.
  if (!pricesAvailable) $$('[data-needs-price]', dom.sortSelect).forEach((o) => o.remove());
  renderPageIndex($('[data-page-index]'), catalog.pages);
}

function renderProducts() {
  const total = catalog.products.length;
  dom.pending.hidden = total > 0;
  $('.toolbar').hidden = total === 0;
  dom.categories.parentElement.hidden = total === 0;

  if (total === 0) {
    dom.grid.replaceChildren();
    dom.count.textContent = '';
    dom.empty.hidden = true;
    return;
  }

  const searched = searchProducts(catalog.products, index, state.query);
  // Cada filtro cuenta con los demás filtros aplicados, para que los números sean reales.
  const forCategories = filterProducts(searched, { brand: state.brand, offers: state.offers });
  const forBrands = filterProducts(searched, { category: state.category, offers: state.offers });
  const visible = sortProducts(filterProducts(searched, state), state.sort);

  renderCategories(dom.categories, categories, countByCategory(forCategories), forCategories.length, state.category);
  renderBrandOptions(dom.brandSelect, brands, countByBrand(forBrands), forBrands.length, state.brand);
  renderGrid(dom.grid, visible, catalog.brand);

  dom.count.textContent = `Mostrando ${visible.length} de ${total} producto${total === 1 ? '' : 's'}`;
  dom.empty.hidden = visible.length > 0;
}

function renderView() {
  $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
  $$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== state.view; });
  if (state.view === 'catalogo') {
    dom.pagesPending.hidden = catalog.pages.length > 0;
    if (!dom.pages.childElementCount) renderCatalogPages(dom.pages, catalog.pages, productsById);
  }
}

function renderDialog() {
  const product = productsById.get(state.product);
  if (product) {
    lastOpenedId = product.id;
    renderDetail(dom.detail, product, catalog.brand);
    document.title = `${product.name}${product.brand ? ` – ${product.brand}` : ''} | ${catalog.brand.name ?? 'Ágata Beauty'}`;
    if (!dom.dialog.open) dom.dialog.showModal();
    dom.dialog.scrollTop = 0;
  } else {
    document.title = DEFAULT_TITLE;
    if (dom.dialog.open) dom.dialog.close();
  }
}

function syncControls() {
  if (dom.searchInput.value !== state.query) dom.searchInput.value = state.query;
  dom.sortSelect.value = state.sort;
}

function renderAll() {
  syncControls();
  renderProducts();
  renderView();
  renderDialog();
}

/* ---------- Acciones ---------- */

function update(patch, { push = false } = {}) {
  state = { ...state, ...patch };
  writeState(state, { push });
  renderAll();
}

function openProduct(id) {
  openedFromApp = true;
  update({ product: id }, { push: true });
}

function closeProduct() {
  if (!state.product) return;
  if (openedFromApp) {
    openedFromApp = false;
    history.back(); // popstate restaura búsqueda, marca y categoría
  } else {
    update({ product: '' }); // llegó por enlace directo
  }
}

function clearSearch() {
  update({ query: '', brand: '', category: '', offers: false });
  dom.searchInput.focus();
}

/** Abre la vista catálogo en la página indicada del documento original. */
function goToPage(number) {
  openedFromApp = false;
  update({ view: 'catalogo', product: '' }, { push: true });
  const target = document.getElementById(`pagina-${number}`);
  if (!target) return;
  target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

/* ---------- Eventos ---------- */

function bindEvents() {
  let debounce;
  dom.searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => update({ query: dom.searchInput.value }), 120);
  });
  dom.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounce);
    update({ query: dom.searchInput.value });
    dom.grid.querySelector('[data-open]')?.focus();
  });
  dom.sortSelect.addEventListener('change', () => update({ sort: dom.sortSelect.value }));
  dom.brandSelect.addEventListener('change', () => update({ brand: dom.brandSelect.value }, { push: true }));

  dom.categories.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-category]');
    if (chip) update({ category: chip.dataset.category }, { push: true });
  });

  $$('[data-view]').forEach((btn) =>
    btn.addEventListener('click', () => update({ view: btn.dataset.view }, { push: true })));

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) openProduct(opener.dataset.open);
    const pageLink = e.target.closest('[data-goto-page]');
    if (pageLink) goToPage(pageLink.dataset.gotoPage);
  });

  $('[data-clear]').addEventListener('click', clearSearch);
  $('[data-close]').addEventListener('click', closeProduct);

  // Esc o clic en el fondo: el <dialog> se cerraría solo; lo encaminamos por el historial.
  dom.dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeProduct(); });
  dom.dialog.addEventListener('click', (e) => { if (e.target === dom.dialog) closeProduct(); });
  // La cuadrícula puede haberse redibujado: se busca de nuevo el botón del producto.
  dom.dialog.addEventListener('close', () => {
    if (state.view === 'catalogo' && !state.product && document.activeElement?.id?.startsWith('pagina-')) return;
    $(`[data-panel]:not([hidden]) [data-open="${CSS.escape(lastOpenedId)}"]`)?.focus();
  });

  $('[data-offers-link]').addEventListener('click', () => update({ offers: true, category: '', view: 'productos' }, { push: true }));

  $('[data-focus-search]').addEventListener('click', () => {
    if (state.view !== 'productos') update({ view: 'productos' });
    document.getElementById('catalogo').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
    dom.searchInput.focus({ preventScroll: true });
  });

  // Menú hamburguesa
  const setMenu = (open) => {
    dom.menuToggle.setAttribute('aria-expanded', String(open));
    dom.menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    dom.nav.classList.toggle('is-open', open);
  };
  dom.menuToggle.addEventListener('click', () => setMenu(dom.menuToggle.getAttribute('aria-expanded') !== 'true'));
  dom.nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.nav.classList.contains('is-open')) { setMenu(false); dom.menuToggle.focus(); }
  });

  window.addEventListener('popstate', () => {
    state = readState();
    openedFromApp = Boolean(state.product && history.state?.agatha);
    renderAll();
  });
}

/* ---------- Inicio ---------- */

async function init() {
  bindEvents();
  try {
    catalog = await loadCatalog();
  } catch (error) {
    console.error(error);
    dom.pending.hidden = false;
    dom.pending.querySelector('p').textContent = 'No se pudo cargar el catálogo. Si abriste el archivo directamente, ejecuta un servidor local (ver README).';
    return;
  }
  index = buildIndex(catalog.products);
  productsById = new Map(catalog.products.map((p) => [p.id, p]));
  categories = getCategories(catalog.products);
  brands = getBrands(catalog.products);
  pricesAvailable = hasPrices(catalog.products);

  // Limpia parámetros inválidos que pudieran venir en un enlace.
  if (state.category && !categories.some((c) => c.slug === state.category)) state.category = '';
  if (state.brand && !brands.some((b) => b.slug === state.brand)) state.brand = '';
  if (!isValidSort(state.sort, pricesAvailable)) state.sort = '';
  if (state.product && !productsById.has(state.product)) state.product = '';
  writeState(state);

  renderBrand();
  renderAll();
}

init();
