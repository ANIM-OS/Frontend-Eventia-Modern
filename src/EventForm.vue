<script setup>
defineProps({
  eventForm: { type: Object, required: true },
  categories: { type: Array, default: () => [] },
  eventRules: { type: Array, default: () => [] },
  busy: Boolean,
  isOrganizer: Boolean,
})
defineEmits(['submit', 'back'])
</script>

<template>
  <form class="panel-card form-panel" @submit.prevent="$emit('submit')">
    <div class="panel-head"><h2>{{ eventForm.eventoId ? 'Editar evento' : 'Crear evento' }}</h2><button type="button" class="text-button" @click="$emit('back')">Volver a mis eventos</button></div>
    <div class="form-grid">
      <label class="wide">Nombre del evento<input v-model="eventForm.nombre" required maxlength="150"></label>
      <label>Categoría<select v-model="eventForm.categoriaId" required><option value="" disabled>Selecciona</option><option v-for="cat in categories" :key="cat.categoriaId" :value="cat.categoriaId">{{ cat.nombre }}</option></select></label>
      <label>Precio (S/)<input v-model.number="eventForm.precio" type="number" min="0" step="0.01"></label>
      <label>Inicio (hora de Perú)<input v-model="eventForm.fechaInicio" type="datetime-local" required></label>
      <label>Fin (hora de Perú)<input v-model="eventForm.fechaFin" type="datetime-local" required></label>
      <label>Sede<input v-model="eventForm.sede" required maxlength="150"></label>
      <label>Dirección<input v-model="eventForm.direccion" required></label>
      <label>Departamento<input v-model="eventForm.departamento" required maxlength="60"></label>
      <label>Provincia<input v-model="eventForm.provincia" required maxlength="60"></label>
      <label>Distrito<input v-model="eventForm.distrito" required></label>
      <label>Aforo<input v-model.number="eventForm.aforoTotal" type="number" min="1" required></label>
      <label class="wide">URL de imagen<input v-model="eventForm.imagenUrl" type="url"></label>
      <label class="wide">Descripción<textarea v-model="eventForm.descripcion" rows="3" required></textarea></label>
    </div>
    <div v-if="eventRules.length" class="reglas-evento" role="note"><b>Antes de guardar, ten en cuenta:</b><ul><li v-for="rule in eventRules" :key="rule">{{ rule }}</li></ul></div>
    <button class="primary-button" :disabled="busy || !isOrganizer">{{ eventForm.eventoId ? 'Guardar cambios' : 'Crear borrador' }} ↗</button>
  </form>
</template>
