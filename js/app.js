// Punto de entrada: carga los datos, conecta eventos y sincroniza la interfaz con la URL.

import { loadCatalog } from './products.js';
import { buildIndex, searchProducts } from './search.js';
import { getCategories, countByCategory, filterProducts, sortProducts, hasPrices, hasOffers, isValidSort } from './filters.js';
import { readState, writeState } from './state.js';
import { $, $$, renderGrid, renderCategories, renderDetail, renderCatalogPages, renderContact } from './ui.js';

const dom = {
  searchForm: $('[data-search-form]'),
  searchInput: $('[data-search-input]'),
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
let pricesAvailable = false;
let state = readState();
let openedFromApp = false; // true si el detalle se abrió con pushState (Volver = history.back)
let lastOpenedId = ''; // producto abierto, para devolver el foco a su botón al cerrar

/* ---------- Render ---------- */

function renderBrand() {
  const { brand } = catalog;
  if (brand.name) $$('[data-brand-name]').forEach((n) => { n.textContent = brand.name; });
  if (brand.tagline) {
    const tagline = $('[data-brand-tagline]');
    tagline.textContent = brand.tagline;
    tagline.hidden = false;
  }
  if (brand.logo) {
    const logo = $('[data-brand-logo]');
    logo.src = brand.logo;
    logo.hidden = false;
    $('.brand-text').classList.add('visually-hidden');
  }
  $('[data-year]').textContent = new Date().getFullYear();

  const hasContact = renderContact($('[data-contact-list]'), brand.contact);
  $('#contacto').hidden = !hasContact;
  $('[data-nav-contact]').hidden = !hasContact;
  $('[data-nav-offers]').hidden = !hasOffers(catalog.products);

  // Ordenar por precio solo si el catálogo trae precios.
  if (!pricesAvailable) $$('[data-needs-price]', dom.sortSelect).forEach((o) => o.remove());
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
  // Los contadores de categoría reflejan la búsqueda actual.
  const counts = countByCategory(filterProducts(searched, { offers: state.offers }));
  const visible = sortProducts(filterProducts(searched, state), state.sort);

  renderCategories(dom.categories, categories, counts, filterProducts(searched, { offers: state.offers }).length, state.category);
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
    document.title = `${product.name} | ${catalog.brand.name ?? 'Agatha Beauty'}`;
    if (!dom.dialog.open) dom.dialog.showModal();
    dom.dialog.scrollTop = 0;
  } else {
    document.title = 'Agatha Beauty | Catálogo digital de productos';
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
    history.back(); // popstate restaura búsqueda y categoría
  } else {
    update({ product: '' }); // llegó por enlace directo
  }
}

function clearSearch() {
  update({ query: '', category: '', offers: false });
  dom.searchInput.focus();
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

  dom.categories.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-category]');
    if (chip) update({ category: chip.dataset.category }, { push: true });
  });

  $$('[data-view]').forEach((btn) =>
    btn.addEventListener('click', () => update({ view: btn.dataset.view }, { push: true })));

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) openProduct(opener.dataset.open);
  });

  $('[data-clear]').addEventListener('click', clearSearch);
  $('[data-close]').addEventListener('click', closeProduct);

  // Esc o clic en el fondo: el <dialog> se cerraría solo; lo encaminamos por el historial.
  dom.dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeProduct(); });
  dom.dialog.addEventListener('click', (e) => { if (e.target === dom.dialog) closeProduct(); });
  // La cuadrícula puede haberse redibujado: se busca de nuevo el botón del producto.
  dom.dialog.addEventListener('close', () => {
    $(`[data-panel]:not([hidden]) [data-open="${CSS.escape(lastOpenedId)}"]`)?.focus();
  });

  $('[data-offers-link]').addEventListener('click', () => update({ offers: true, category: '', view: 'productos' }, { push: true }));

  $('[data-focus-search]').addEventListener('click', () => {
    if (state.view !== 'productos') update({ view: 'productos' });
    document.getElementById('catalogo').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    dom.searchInput.focus({ preventScroll: true });
  });

  // Menú hamburguesa
  dom.menuToggle.addEventListener('click', () => {
    const open = dom.menuToggle.getAttribute('aria-expanded') !== 'true';
    dom.menuToggle.setAttribute('aria-expanded', String(open));
    dom.menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    dom.nav.classList.toggle('is-open', open);
  });
  dom.nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      dom.menuToggle.setAttribute('aria-expanded', 'false');
      dom.menuToggle.setAttribute('aria-label', 'Abrir menú');
      dom.nav.classList.remove('is-open');
    }
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
  pricesAvailable = hasPrices(catalog.products);

  // Limpia parámetros inválidos que pudieran venir en un enlace.
  if (state.category && !categories.some((c) => c.slug === state.category)) state.category = '';
  if (!isValidSort(state.sort, pricesAvailable)) state.sort = '';
  if (state.product && !productsById.has(state.product)) state.product = '';
  writeState(state);

  renderBrand();
  renderAll();
}

init();
