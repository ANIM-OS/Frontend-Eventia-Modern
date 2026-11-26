<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '../AppIcon.vue'
import EventCard from '../EventCard.vue'
import { api } from '../api'

const props = defineProps({
  events: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  popularCategories: { type: Array, default: () => [] },
  recommendations: { type: Array, default: () => [] },
  recentReviews: { type: Array, default: () => [] },
  recommendationCaption: { type: String, default: '' },
  eventTotal: { type: Number, default: 0 },
  totalPages: { type: Number, default: 1 },
  query: { type: Object, required: true },
  catalogLoading: Boolean,
  catalogError: { type: String, default: '' },
  busy: Boolean,
})
const emit = defineEmits(['load-events', 'filter-category', 'open-event', 'change-page'])
const loadEvents = reset => emit('load-events', reset)
const openEvent = event => emit('open-event', event)
const changePage = delta => emit('change-page', delta)

// ---- Búsqueda aplicada: cuando hay filtros, los resultados van primero y los recomendados al final ----
const applied = ref({})
const catalogRef = ref(null)
function snapshot() {
  const q = props.query
  applied.value = { texto: q.texto?.trim(), ubicacion: q.ubicacion?.trim(), categoriaId: q.categoriaId, fechaDesde: q.fechaDesde, fechaHasta: q.fechaHasta }
}
const isSearching = computed(() => Object.values(applied.value).some(Boolean))
const resultsTitle = computed(() => {
  if (!isSearching.value) return 'Explorar todos los eventos'
  return applied.value.texto ? `Resultados para “${applied.value.texto}”` : 'Resultados de tu búsqueda'
})
function scrollToResults() { requestAnimationFrame(() => catalogRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }
function submitSearch() {
  closeSuggestions()
  snapshot()
  loadEvents(true)
  if (isSearching.value) scrollToResults()
}
function filterByCategory(categoryId) { emit('filter-category', categoryId); props.query.categoriaId = categoryId || ''; snapshot() }
function applyDates() { snapshot(); loadEvents(true) }
function clearSearch() {
  Object.assign(props.query, { texto: '', ubicacion: '', categoriaId: '', fechaDesde: '', fechaHasta: '' })
  closeSuggestions(); snapshot(); loadEvents(true)
}

// ---- Sugerencias mientras se escribe (autocompletado) ----
const suggestions = ref([])
const suggestionsOpen = ref(false)
const suggestionsLoading = ref(false)
const highlighted = ref(-1)
let timer = null
let requestId = 0
function closeSuggestions() { clearTimeout(timer); requestId++; suggestionsOpen.value = false; suggestionsLoading.value = false; highlighted.value = -1 }
async function fetchSuggestions(texto) {
  const id = ++requestId
  suggestionsLoading.value = true; suggestionsOpen.value = true
  try {
    const result = await api.eventos({ texto, pagina: 1, tamanoPagina: 5, soloDisponibles: false })
    if (id !== requestId) return
    suggestions.value = Array.isArray(result) ? result : result?.eventos || []
    highlighted.value = -1
  } catch { if (id === requestId) suggestions.value = [] }
  finally { if (id === requestId) suggestionsLoading.value = false }
}
watch(() => props.query.texto, value => {
  clearTimeout(timer)
  const texto = (value || '').trim()
  if (texto.length < 2 || texto === applied.value.texto) { closeSuggestions(); suggestions.value = []; return }
  timer = setTimeout(() => fetchSuggestions(texto), 250)
})
onBeforeUnmount(() => clearTimeout(timer))
function chooseSuggestion(event) { closeSuggestions(); openEvent(event.eventoId) }
function onSearchKeydown(e) {
  if (!suggestionsOpen.value) return
  const total = suggestions.value.length
  if (e.key === 'ArrowDown' && total) { e.preventDefault(); highlighted.value = (highlighted.value + 1) % total }
  else if (e.key === 'ArrowUp' && total) { e.preventDefault(); highlighted.value = (highlighted.value - 1 + total) % total }
  else if (e.key === 'Enter' && highlighted.value >= 0) { e.preventDefault(); chooseSuggestion(suggestions.value[highlighted.value]) }
  else if (e.key === 'Escape') closeSuggestions()
}
function suggestionMeta(event) {
  const fecha = new Date(event.fechaInicio).toLocaleString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short' })
  return [fecha, event.distrito || event.provincia || event.sede, event.categoriaNombre].filter(Boolean).join(' · ')
}
// Resalta en negrita la parte del nombre que coincide con lo escrito
function highlightParts(nombre) {
  const texto = (props.query.texto || '').trim()
  const i = texto ? nombre.toLowerCase().indexOf(texto.toLowerCase()) : -1
  return i < 0 ? [{ t: nombre }] : [{ t: nombre.slice(0, i) }, { t: nombre.slice(i, i + texto.length), b: true }, { t: nombre.slice(i + texto.length) }]
}
</script>

<template>
<section class="page-view discovery-page">
          <section class="modern-hero">
            <div class="hero-copy">
              <span class="hero-badge"><q-icon name="auto_awesome" /> AGENDA ABIERTA · PERÚ</span>
              <h1 tabindex="-1">Encuentra eventos<br>que mueven <span>tu mundo.</span></h1>
              <p>Tecnología, cultura y negocios en un solo lugar. Encuentra tu próximo plan y guarda cada entrada en tu celular.</p>
              <div class="hero-proof"><span><q-icon name="verified_user" /> Entradas con QR seguro</span><span><q-icon name="location_on" /> Eventos cerca de ti</span></div>
            </div>
            <div class="hero-art" aria-hidden="true">
              <div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div>
              <div v-if="events[0]?.imagenUrl" class="hero-photo hero-photo-main" :style="{ backgroundImage: `url('${events[0].imagenUrl}')` }"><span>{{ events[0].categoriaNombre || 'DESTACADO' }}</span></div>
              <div v-else class="hero-photo hero-photo-main hero-photo-main-fallback"><q-icon name="music_note" /><span>VIVE ALGO NUEVO</span></div>
              <div v-if="events[1]?.imagenUrl" class="hero-photo hero-photo-small" :style="{ backgroundImage: `url('${events[1].imagenUrl}')` }"><span>{{ events[1].categoriaNombre || 'PRÓXIMO' }}</span></div>
              <div v-else class="hero-photo hero-photo-small hero-photo-small-fallback"><q-icon name="flare" /></div>
              <div class="hero-sticker"><q-icon name="north_east" /><span>Tu próxima<br>historia empieza aquí</span></div>
            </div>
          </section>
          <div class="discovery-tools">
            <div class="search-heading"><div><span class="section-kicker">BUSCA TU PRÓXIMO PLAN</span><h2>¿Qué te gustaría vivir?</h2></div><q-icon name="tune" /></div>
            <form class="discovery-search" @submit.prevent="submitSearch">
              <q-input v-model="query.texto" class="search-field" outlined dense rounded clearable placeholder="Buscar conferencias, conciertos, talleres…" aria-label="Buscar eventos" autocomplete="off" @keydown="onSearchKeydown" @clear="clearSearch"><template #prepend><q-icon name="search" /></template>
                <q-menu v-model="suggestionsOpen" no-parent-event no-focus no-refocus fit :offset="[0, 6]" class="search-suggestions" @hide="highlighted = -1">
                  <div v-if="suggestionsLoading && !suggestions.length" class="suggestion-empty">Buscando…</div>
                  <div v-else-if="!suggestions.length" class="suggestion-empty">No hay eventos que coincidan con “{{ query.texto }}”.</div>
                  <template v-else>
                    <div class="suggestion-title">Eventos</div>
                    <button v-for="(event, index) in suggestions" :key="event.eventoId" type="button" class="suggestion-item" :class="{ active: index === highlighted }" @mouseenter="highlighted = index" @click="chooseSuggestion(event)">
                      <img v-if="event.imagenUrl" :src="event.imagenUrl" alt="" loading="lazy"><span v-else class="suggestion-thumb"><q-icon name="event" /></span>
                      <span class="suggestion-text"><strong><template v-for="(part, i) in highlightParts(event.nombre)" :key="i"><mark v-if="part.b">{{ part.t }}</mark><template v-else>{{ part.t }}</template></template></strong><small>{{ suggestionMeta(event) }}</small></span>
                      <q-icon name="north_east" class="suggestion-go" />
                    </button>
                    <button type="button" class="suggestion-all" @click="submitSearch"><q-icon name="search" />Ver todos los resultados para “{{ query.texto?.trim() }}”</button>
                  </template>
                </q-menu>
              </q-input>
              <q-input v-model="query.ubicacion" class="location-field" outlined dense rounded placeholder="Todo el Perú" aria-label="Ciudad o departamento"><template #prepend><q-icon name="place" /></template></q-input>
              <q-select v-model="query.categoriaId" class="category-field" outlined dense rounded emit-value map-options :options="categories.map(cat => ({ label: cat.nombre, value: cat.categoriaId }))" aria-label="Categoría" :display-value="query.categoriaId ? categories.find(cat => String(cat.categoriaId) === String(query.categoriaId))?.nombre : 'Todas las categorías'"><template #prepend><q-icon name="grid_view" /></template><template #option="scope"><q-item v-bind="scope.itemProps"><q-item-section>{{ scope.opt.label }}</q-item-section></q-item></template></q-select>
              <q-btn type="submit" unelevated no-caps color="accent" class="search-submit" icon="search" :loading="catalogLoading">{{ catalogLoading ? 'Buscando…' : 'Buscar' }}</q-btn>
            </form>
            <details class="advanced-filters"><summary><AppIcon name="calendar" />Fechas y disponibilidad<AppIcon name="chevron" /></summary><div class="dates"><label>Desde <input v-model="query.fechaDesde" type="date" @change="applyDates"></label><label>Hasta <input v-model="query.fechaHasta" type="date" @change="applyDates"></label><label class="available"><input v-model="query.soloDisponibles" type="checkbox" @change="applyDates">Solo eventos con cupos</label></div></details>
          </div>
          <div class="discovery-layout">
            <div class="event-feed">
              <section v-if="recommendations.length" class="recommendations-section" :style="{ order: isSearching ? 2 : 1 }"><div class="feed-heading"><h2><AppIcon name="sparkles" />{{ isSearching ? 'También te puede interesar' : 'Recomendados para ti' }}</h2><p>{{ recommendationCaption }}</p></div><div class="recommendation-grid"><EventCard v-for="event in recommendations" :key="event.eventoId" :event="event" compact @select="openEvent" /></div></section>
              <section ref="catalogRef" class="catalog-section" :style="{ order: isSearching ? 1 : 2 }">
                <div class="feed-heading"><h2>{{ resultsTitle }}</h2><span>{{ eventTotal }} {{ eventTotal === 1 ? 'evento encontrado' : 'eventos encontrados' }}<button v-if="isSearching" type="button" class="text-button clear-search" @click="clearSearch">Limpiar búsqueda ✕</button></span></div>
                <div class="filter-chips"><button :class="{ selected: !query.categoriaId }" @click="filterByCategory(null)">Todos</button><button v-for="cat in popularCategories" :key="cat.categoriaId" :class="{ selected: Number(query.categoriaId) === cat.categoriaId }" @click="filterByCategory(cat.categoriaId)">{{ cat.nombre }}</button></div>
                <div v-if="catalogError" class="feedback-banner error-banner" role="alert"><div><b>No pudimos cargar los eventos</b><p>{{ catalogError }}</p></div><button class="secondary-button" @click="loadEvents()">Reintentar</button></div><div v-else-if="events.length" class="event-grid" :aria-busy="catalogLoading"><EventCard v-for="event in events" :key="event.eventoId" :event="event" @select="openEvent" /></div>
                <div v-else-if="catalogLoading" class="event-grid" aria-label="Cargando eventos" role="status"><div v-for="number in 3" :key="number" class="event-skeleton"><div></div><span></span><span></span></div></div>
                <div v-else class="empty-state"><AppIcon name="search" /><h3>No encontramos eventos con esos filtros</h3><p>Prueba con otra palabra, ciudad o fecha.</p><button class="secondary-button" @click="clearSearch">Limpiar filtros</button></div>
                <div class="pagination"><span>Página {{ query.pagina }} de {{ totalPages }}</span><div><button :disabled="query.pagina <= 1 || busy" @click="changePage(-1)">Anterior</button><button v-for="page in Array.from({ length: Math.min(totalPages, 5) }, (_, i) => Math.min(Math.max(1, query.pagina - 2), Math.max(1, totalPages - 4)) + i)" :key="page" :class="{ current: page === query.pagina }" :disabled="busy" @click="changePage(page-query.pagina)">{{ page }}</button><button :disabled="query.pagina >= totalPages || busy" @click="changePage(1)">Siguiente</button></div></div>
              </section>
              <section v-if="recentReviews.length && !isSearching" class="home-reviews" style="order: 3" aria-labelledby="home-reviews-title">
                <div class="feed-heading"><h2 id="home-reviews-title"><AppIcon name="sparkles" />Lo que dicen los asistentes</h2><p>Reseñas de eventos ya realizados, escritas por personas que asistieron.</p></div>
                <div class="home-review-grid">
                  <article v-for="review in recentReviews" :key="review.resenaId" class="home-review-card">
                    <div class="home-review-stars" :aria-label="review.calificacion + ' de 5 estrellas'"><span v-for="n in 5" :key="n" :class="{ on: n <= review.calificacion }">★</span></div>
                    <p class="home-review-text">“{{ review.comentario }}”</p>
                    <footer><b>{{ review.usuarioNombre }}</b><button type="button" class="text-button" @click="openEvent(review.eventoId)">{{ review.eventoNombre }} ↗</button></footer>
                  </article>
                </div>
              </section>
            </div>
          </div>
        </section>
</template>

<style>
.search-suggestions { border-radius: 12px; box-shadow: 0 12px 32px #1c1b1b24; padding: 6px; background: #fff; max-height: 420px; }
.search-suggestions .suggestion-title { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #777570; padding: 8px 10px 4px; }
.search-suggestions .suggestion-item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 8px 10px; border: 0; border-radius: 8px; background: transparent; text-align: left; cursor: pointer; color: #1c1b1b; font: inherit; }
.search-suggestions .suggestion-item.active, .search-suggestions .suggestion-item:hover { background: #f3f2ef; }
.search-suggestions .suggestion-item img, .search-suggestions .suggestion-thumb { width: 44px; height: 44px; flex: none; border-radius: 6px; object-fit: cover; background: #ebe9e4; display: grid; place-items: center; color: #777570; }
.search-suggestions .suggestion-text { display: grid; gap: 2px; min-width: 0; flex: 1; }
.search-suggestions .suggestion-text strong { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.search-suggestions .suggestion-text mark { background: #ffe58a; color: inherit; border-radius: 2px; padding: 0 1px; }
.search-suggestions .suggestion-text small { font-size: 11.5px; color: #777570; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.search-suggestions .suggestion-go { color: #9a978f; font-size: 16px; }
.search-suggestions .suggestion-all { display: flex; align-items: center; gap: 8px; width: 100%; margin-top: 4px; padding: 10px; border: 0; border-top: 1px solid #ebe9e4; background: transparent; font: inherit; font-size: 12.5px; font-weight: 600; color: #1c1b1b; cursor: pointer; border-radius: 0 0 8px 8px; text-align: left; }
.search-suggestions .suggestion-all:hover { background: #f3f2ef; }
.search-suggestions .suggestion-empty { padding: 14px 12px; font-size: 12.5px; color: #777570; }
.catalog-section { scroll-margin-top: 80px; }
.catalog-section .feed-heading .clear-search { margin-left: 12px; font-size: 12px; }
</style>
