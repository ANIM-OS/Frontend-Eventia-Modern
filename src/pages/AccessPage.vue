<script setup>
import AccessControl from '../AccessControl.vue'

defineProps({ isOrganizer: Boolean, events: { type: Array, default: () => [] }, eventId: { type: [String, Number], default: '' } })
</script>

<template>
  <section class="page-view">
    <div class="page-title"><div><div class="section-kicker">DÍA DEL EVENTO</div><h1 tabindex="-1">Control de <em>acceso.</em></h1><p>Verifica entradas y confirma la llegada de cada asistente.</p></div></div>
    <AccessControl v-if="isOrganizer" :events="events" :event-id="eventId" />
  </section>
</template>
