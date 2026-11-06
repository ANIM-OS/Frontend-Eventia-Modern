<script setup>
import AppIcon from '../AppIcon.vue'
import EventCard from '../EventCard.vue'

defineProps({
  events: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  popularCategories: { type: Array, default: () => [] },
  recommendations: { type: Array, default: () => [] },
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
const filterByCategory = categoryId => emit('filter-category', categoryId)
const openEvent = event => emit('open-event', event)
const changePage = delta => emit('change-page', delta)
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
            <form class="discovery-search" @submit.prevent="loadEvents(true)">
              <q-input v-model="query.texto" class="search-field" outlined dense rounded placeholder="Buscar conferencias, conciertos, talleres…" aria-label="Buscar eventos"><template #prepend><q-icon name="search" /></template></q-input>
              <q-input v-model="query.ubicacion" class="location-field" outlined dense rounded placeholder="Todo el Perú" aria-label="Ciudad o departamento"><template #prepend><q-icon name="place" /></template></q-input>
              <q-select v-model="query.categoriaId" class="category-field" outlined dense rounded emit-value map-options :options="categories.map(cat => ({ label: cat.nombre, value: cat.categoriaId }))" aria-label="Categoría" :display-value="query.categoriaId ? categories.find(cat => String(cat.categoriaId) === String(query.categoriaId))?.nombre : 'Todas las categorías'"><template #prepend><q-icon name="grid_view" /></template><template #option="scope"><q-item v-bind="scope.itemProps"><q-item-section>{{ scope.opt.label }}</q-item-section></q-item></template></q-select>
              <q-btn type="submit" unelevated no-caps color="accent" class="search-submit" icon="search" :loading="catalogLoading">{{ catalogLoading ? 'Buscando…' : 'Buscar' }}</q-btn>
            </form>
            <details class="advanced-filters"><summary><AppIcon name="calendar" />Fechas y disponibilidad<AppIcon name="chevron" /></summary><div class="dates"><label>Desde <input v-model="query.fechaDesde" type="date" @change="loadEvents(true)"></label><label>Hasta <input v-model="query.fechaHasta" type="date" @change="loadEvents(true)"></label><label class="available"><input v-model="query.soloDisponibles" type="checkbox" @change="loadEvents(true)">Solo eventos con cupos</label></div></details>
          </div>
          <div class="discovery-layout">
            <div class="event-feed">
              <section v-if="recommendations.length" class="recommendations-section"><div class="feed-heading"><h2><AppIcon name="sparkles" />Recomendados para ti</h2><p>{{ recommendationCaption }}</p></div><div class="recommendation-grid"><EventCard v-for="event in recommendations" :key="event.eventoId" :event="event" compact @select="openEvent" /></div></section>
              <section class="catalog-section">
                <div class="feed-heading"><h2>Explorar todos los eventos</h2><span>{{ eventTotal }} {{ eventTotal === 1 ? 'evento disponible' : 'eventos disponibles' }}</span></div>
                <div class="filter-chips"><button :class="{ selected: !query.categoriaId }" @click="filterByCategory(null)">Todos</button><button v-for="cat in popularCategories" :key="cat.categoriaId" :class="{ selected: Number(query.categoriaId) === cat.categoriaId }" @click="filterByCategory(cat.categoriaId)">{{ cat.nombre }}</button></div>
                <div v-if="catalogError" class="feedback-banner error-banner" role="alert"><div><b>No pudimos cargar los eventos</b><p>{{ catalogError }}</p></div><button class="secondary-button" @click="loadEvents()">Reintentar</button></div><div v-else-if="events.length" class="event-grid" :aria-busy="catalogLoading"><EventCard v-for="event in events" :key="event.eventoId" :event="event" @select="openEvent" /></div>
                <div v-else-if="catalogLoading" class="event-grid" aria-label="Cargando eventos" role="status"><div v-for="number in 3" :key="number" class="event-skeleton"><div></div><span></span><span></span></div></div>
                <div v-else class="empty-state"><AppIcon name="search" /><h3>No encontramos eventos con esos filtros</h3><p>Prueba con otra palabra, ciudad o fecha.</p><button class="secondary-button" @click="query.texto='';query.ubicacion='';query.categoriaId='';query.fechaDesde='';query.fechaHasta='';loadEvents(true)">Limpiar filtros</button></div>
                <div class="pagination"><span>Página {{ query.pagina }} de {{ totalPages }}</span><div><button :disabled="query.pagina <= 1 || busy" @click="changePage(-1)">Anterior</button><button v-for="page in Array.from({ length: Math.min(totalPages, 5) }, (_, i) => Math.min(Math.max(1, query.pagina - 2), Math.max(1, totalPages - 4)) + i)" :key="page" :class="{ current: page === query.pagina }" :disabled="busy" @click="changePage(page-query.pagina)">{{ page }}</button><button :disabled="query.pagina >= totalPages || busy" @click="changePage(1)">Siguiente</button></div></div>
              </section>
            </div>
          </div>
        </section>
</template>
