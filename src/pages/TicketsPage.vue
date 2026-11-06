<script setup>
import { canShowTicketQr } from '../eventLogic'
import { statusLabel } from '../uiLogic'

defineProps({
  ticketList: { type: Array, default: () => [] },
  purchases: { type: Array, default: () => [] },
  selectedPurchaseId: { type: [Number, String], default: null },
  sectionLoading: Boolean,
  purchaseSuccess: { type: String, default: '' },
})
defineEmits(['clear-purchase', 'show-ticket', 'show-purchase', 'refresh', 'clear-success'])
</script>

<template>
  <section class="page-view">
    <div class="page-title"><div><div class="section-kicker">LISTO PARA ASISTIR</div><h1 tabindex="-1">Mis <em>entradas.</em></h1><p>Abre tu QR con conexión a internet al llegar. Las capturas de pantalla caducan.</p><div v-if="purchaseSuccess" class="feedback-banner success-banner" role="status"><div><b>Entradas listas</b><p>{{ purchaseSuccess }}</p></div><button class="text-button" @click="$emit('clear-success')">Cerrar aviso</button></div></div></div>
    <div class="panel-card">
      <div class="panel-head"><h2>{{ selectedPurchaseId ? `Entradas de la compra #${selectedPurchaseId}` : 'Tus entradas' }}</h2><button v-if="selectedPurchaseId" class="text-button" @click="$emit('clear-purchase')">Ver todas</button><span v-else>{{ ticketList.length }} entradas</span></div>
      <div v-if="ticketList.length" class="ticket-list"><article v-for="ticket in ticketList" :key="ticket.entradaId" class="ticket-row">
        <div class="ticket-main"><b>{{ ticket.eventoNombre || ticket.eventoTitulo || 'Entrada #' + ticket.entradaId }}</b><small>{{ ticket.titularNombre }} · {{ statusLabel(ticket.tipoAcceso) }}</small><small v-if="ticket.fechaInicio">{{ new Date(ticket.fechaInicio).toLocaleString('es-PE', { timeZone: 'America/Lima' }) }}<template v-if="ticket.sede"> · {{ ticket.sede }}</template></small><span class="ticket-state">{{ ticket.estado === 'UTILIZADA' ? 'Ingreso registrado' : canShowTicketQr(ticket) ? 'Pendiente de ingreso' : 'Entrada anulada o no disponible' }}</span></div>
        <button v-if="canShowTicketQr(ticket)" class="ticket-qr-button" @click="$emit('show-ticket', ticket)" :aria-label="'Mostrar QR de ' + ticket.titularNombre"><span class="ticket-qr-icon" aria-hidden="true">▦</span> Mostrar QR</button>
      </article></div>
      <div v-else-if="!sectionLoading" class="empty-inline">{{ selectedPurchaseId ? 'No se encontraron entradas para esta compra. Actualiza la lista o consulta todas tus entradas.' : 'Todavía no tienes entradas. Encuentra un evento y reserva tu lugar.' }}</div>
    </div>
    <div class="panel-card"><div class="panel-head"><h2>Historial de reservas</h2><span>{{ purchases.length }} reservas</span></div><div v-if="purchases.length" class="data-table"><div v-for="buy in purchases" :key="buy.compraId" class="table-row"><div><b>{{ buy.eventoTitulo }}</b><small>Reserva #{{ buy.compraId }} · {{ statusLabel(buy.estado) }} · {{ buy.cantidad }} entradas</small></div><span>S/ {{ Number(buy.total).toFixed(2) }}</span><button class="text-button" @click="$emit('show-purchase', buy)">Ver entradas</button></div></div><div v-else-if="!sectionLoading" class="empty-inline">Tus reservas aparecerán aquí.</div></div>
  </section>
</template>
