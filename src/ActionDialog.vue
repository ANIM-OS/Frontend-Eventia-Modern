<script setup>
import { ref } from 'vue'
import { modal as vModal } from './modal'
const props = defineProps({ request: { type: Object, required: true } })
const emit = defineEmits(['answer'])
const values = ref(Object.fromEntries((props.request.fields || []).map(field => [field.key, field.value || ''])))
</script>
<template>
  <div class="modal-backdrop" @click.self="emit('answer', null)">
    <form v-modal="() => emit('answer', null)" class="action-dialog" aria-labelledby="action-dialog-title" @submit.prevent="emit('answer', request.fields ? values : true)">
      <h2 id="action-dialog-title">{{ request.title }}</h2>
      <p>{{ request.description }}</p>
      <label v-for="field in request.fields || []" :key="field.key">{{ field.label }}
        <select v-if="field.options" v-model="values[field.key]" :required="field.required"><option v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</option></select>
        <textarea v-else v-model="values[field.key]" :required="field.required" :minlength="field.required ? 3 : undefined" :maxlength="field.maxlength || 500" rows="3" />
      </label>
      <div class="dialog-actions"><button type="button" class="secondary-button" @click="emit('answer', null)">Volver</button><button class="primary-button" :class="{ 'danger-button': request.danger }">{{ request.confirm || 'Confirmar' }}</button></div>
    </form>
  </div>
</template>
