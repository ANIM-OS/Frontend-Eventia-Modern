<script setup>
defineProps({ notifications: { type: Array, default: () => [] } })
defineEmits(['mark-read', 'mark-all-read'])
</script>

<template>
  <section class="page-view">
    <div class="page-title"><div><div class="section-kicker">AL DÍA CONTIGO</div><h1 tabindex="-1">Tus <em>notificaciones.</em></h1><p>Actualizaciones de los eventos a los que vas.</p></div><button class="secondary-button" :disabled="!notifications.some(n => !n.leida)" @click="$emit('mark-all-read')">Marcar todas como leídas</button></div>
    <div class="panel-card notification-list"><article v-for="notice in notifications" :key="notice.notificacionId" :class="{ unread: !notice.leida, prioritaria: notice.prioridad === 'PRIORITARIO' }"><span class="notice-icon" :style="{ color: notice.color }" :aria-label="notice.prioridad === 'PRIORITARIO' ? 'Prioritario' : 'Informativo'">{{ notice.prioridad === 'PRIORITARIO' ? '!' : 'i' }}</span><div><div class="notice-title"><b>{{ notice.titulo }}</b><span class="prioridad-chip" :class="notice.prioridad === 'PRIORITARIO' ? 'alta' : 'info'">{{ notice.prioridad === 'PRIORITARIO' ? 'Prioritario' : 'Informativo' }}</span><span v-if="!notice.leida" class="new-badge">NUEVA</span></div><p>{{ notice.mensaje }}</p><small>{{ notice.eventoNombre }} · {{ new Date(notice.fechaCreacion).toLocaleString('es-PE', { timeZone: 'America/Lima' }) }}</small></div><button v-if="!notice.leida" class="text-button" @click="$emit('mark-read', notice)">Marcar leída</button></article><div v-if="!notifications.length" class="empty-inline">No tienes notificaciones por ahora.</div></div>
  </section>
</template>
