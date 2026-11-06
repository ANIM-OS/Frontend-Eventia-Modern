<script setup>
defineProps({
  pendingReviews: { type: Array, default: () => [] },
  reviews: { type: Array, default: () => [] },
  sectionLoading: Boolean,
  reviewDraft: { type: Function, required: true },
})
defineEmits(['submit-review'])
</script>

<template>
  <section class="page-view">
    <div class="page-title"><div><div class="section-kicker">DESPUÉS DEL EVENTO</div><h1 tabindex="-1">Lo viviste. <em>Cuéntalo.</em></h1><p>Deja una reseña y ayuda a otros a encontrar buenos planes.</p></div></div>
    <div class="panel-card"><div class="panel-head"><h2>Reseñas pendientes</h2><span>{{ pendingReviews.length }} eventos</span></div>
      <div v-if="pendingReviews.length" class="data-table"><div v-for="event in pendingReviews" :key="event.eventoId" class="table-row review-row"><div><b>{{ event.nombre }}</b><small>{{ event.sede }} · {{ new Date(event.fechaFin).toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) }}</small></div><div class="review-form"><select v-model="reviewDraft(event.eventoId).calificacion"><option v-for="score in [5,4,3,2,1]" :key="score" :value="score">{{ score }} estrellas</option></select><input v-model="reviewDraft(event.eventoId).comentario" placeholder="¿Cómo estuvo? (opcional)"><button class="primary-button" @click="$emit('submit-review', event.eventoId)">Enviar ↗</button></div></div></div>
      <div v-else-if="!sectionLoading" class="empty-inline">No tienes reseñas pendientes.</div>
    </div>
    <div class="panel-card"><div class="panel-head"><h2>Lo que has escrito</h2><span>{{ reviews.length }} reseñas</span></div><div v-if="reviews.length" class="review-history"><article v-for="review in reviews" :key="review.resenaId"><div><b>{{ review.eventoNombre }}</b><span class="stars">{{ '★'.repeat(review.calificacion) }}{{ '☆'.repeat(5-review.calificacion) }}</span></div><p>{{ review.comentario || 'Sin comentario' }}</p><small>{{ new Date(review.fechaCreacion).toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) }}</small></article></div><div v-else-if="!sectionLoading" class="empty-inline">Tus reseñas publicadas aparecerán aquí.</div></div>
  </section>
</template>
