<script setup>
import { computed, toRefs } from 'vue'
import AppIcon from '../AppIcon.vue'

const props = defineProps({
  eventDetail: { type: Object, required: true },
  reviewSummary: { type: Object, default: null },
  profile: { type: Object, default: null },
  showReport: Boolean,
  reportReason: { type: String, default: '' },
  detailQuantity: { type: Number, default: 1 },
  purchaseLimit: { type: Function, required: true },
})
const { eventDetail, reviewSummary, profile, showReport, reportReason, detailQuantity, purchaseLimit } = toRefs(props)
const emit = defineEmits(['navigate', 'update:showReport', 'update:reportReason', 'update:detailQuantity', 'report-event', 'checkout'])
const reportOpen = computed({ get: () => props.showReport, set: value => emit('update:showReport', value) })
const reportReasonInput = computed({ get: () => props.reportReason, set: value => emit('update:reportReason', value) })
const ticketQuantity = computed({ get: () => props.detailQuantity, set: value => emit('update:detailQuantity', value) })
function reportEvent(id) { emit('report-event', id) }
function openCheckout(event, quantity) { emit('checkout', event, quantity) }
function selectSection(section) { emit('navigate', section) }
</script>

<template>
<section class="page-view event-detail-page">
          <button class="detail-back" @click="selectSection('explorar')">← Volver a explorar</button>
          <div class="detail-layout">
            <div class="detail-main">
              <div class="detail-hero-image" :style="eventDetail.imagenUrl ? { backgroundImage: `url('${eventDetail.imagenUrl}')` } : {}"><span>{{ eventDetail.categoriaNombre || 'Evento' }}</span></div>
              <section class="detail-title-card"><span class="section-kicker">{{ eventDetail.categoriaNombre || 'EVENTO' }} · {{ eventDetail.distrito || eventDetail.provincia }}</span><h1 tabindex="-1">{{ eventDetail.nombre }}</h1><div class="detail-facts"><div><AppIcon name="calendar"/><span><small>FECHA Y HORA</small><b>{{ new Date(eventDetail.fechaInicio).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle:'full', timeStyle:'short' }) }}</b><small>Hora de Perú · Hasta {{ new Date(eventDetail.fechaFin).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle:'short', timeStyle:'short' }) }}</small></span></div><div><AppIcon name="pin"/><span><small>LUGAR</small><b>{{ eventDetail.sede }}</b><small>{{ [eventDetail.direccion,eventDetail.distrito,eventDetail.provincia].filter(Boolean).join(' · ') }}</small></span></div><div><AppIcon name="grid"/><span><small>DISPONIBILIDAD</small><b>{{ eventDetail.cuposDisponibles }} cupos</b><small>de {{ eventDetail.aforoTotal }} en total</small></span></div></div></section>
              <section class="panel-card detail-description"><h2>Descripción del evento</h2><p>{{ eventDetail.descripcion || 'El organizador aún no agregó una descripción.' }}</p><a v-if="eventDetail.direccion || eventDetail.sede" :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([eventDetail.sede,eventDetail.direccion,eventDetail.distrito].filter(Boolean).join(', '))}`" target="_blank" rel="noopener noreferrer">Ver ubicación en el mapa ↗</a></section>
              <section class="panel-card review-summary detail-reviews"><h2>Reseñas de asistentes <span v-if="reviewSummary?.total">· {{ Number(reviewSummary.promedio).toFixed(1) }} ★ ({{ reviewSummary.total }})</span></h2><article v-for="review in reviewSummary?.resenas || []" :key="review.resenaId"><b>{{ review.usuarioNombre }} · {{ '★'.repeat(review.calificacion) }}{{ '☆'.repeat(5-review.calificacion) }}</b><p>{{ review.comentario || 'Sin comentario' }}</p></article><small v-if="!reviewSummary?.resenas?.length">{{ reviewSummary ? 'Todavía no hay reseñas.' : 'Cargando reseñas…' }}</small></section>
              <button v-if="profile" class="text-button report-link" @click="reportOpen=!reportOpen">Reportar evento</button><form v-if="reportOpen" class="report-form visible" @submit.prevent="reportEvent(eventDetail.eventoId)"><input v-model="reportReasonInput" minlength="5" maxlength="500" placeholder="Motivo del reporte" required><button class="secondary-button">Enviar reporte</button></form>
            </div>
            <aside class="ticket-purchase-card"><div class="capacity-band"><b>Aforo del evento</b><span>{{ eventDetail.cuposDisponibles }} disponibles</span><small>{{ eventDetail.entradasVendidas }} de {{ eventDetail.aforoTotal }} entradas emitidas</small><i><span :style="{width: `${Math.min(100, eventDetail.aforoTotal ? 100*eventDetail.entradasVendidas/eventDetail.aforoTotal : 0)}%`}"></span></i></div><div class="purchase-content"><div class="purchase-heading"><b>Entrada general</b><strong>{{ Number(eventDetail.precio) === 0 ? 'Gratis' : `S/ ${Number(eventDetail.precio).toFixed(2)}` }}</strong></div><p>Acceso al evento para una persona.</p><label>Cantidad<select v-model.number="ticketQuantity"><option v-for="n in purchaseLimit(eventDetail)" :key="n" :value="n">{{ n }}</option></select></label><div class="purchase-total"><span>Total de la reserva</span><b>{{ Number(eventDetail.precio) === 0 ? 'Gratis' : `S/ ${(Number(eventDetail.precio)*ticketQuantity).toFixed(2)}` }}</b></div><button class="primary-button" :disabled="!eventDetail.disponibleParaCompra || !eventDetail.cuposDisponibles" @click="openCheckout(eventDetail,ticketQuantity)">{{ eventDetail.disponibleParaCompra ? (Number(eventDetail.precio) === 0 ? 'Reservar entrada gratis' : 'Continuar con la reserva') : 'Entradas no disponibles' }} ↗</button><small>Modo demostración: emitimos entradas sin procesar cobros. El QR se abre desde Mis entradas.</small></div></aside>
          </div>
        </section>
</template>
