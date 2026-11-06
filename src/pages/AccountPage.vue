<script setup>
import { computed } from 'vue'
import { statusLabel } from '../uiLogic'

const props = defineProps({
  profile: { type: Object, required: true },
  categories: { type: Array, default: () => [] },
  interests: { type: Array, default: () => [] },
  activeRole: { type: String, default: 'ASISTENTE' },
  isOrganizer: Boolean,
})
const emit = defineEmits(['update:interests', 'set-role', 'activate-organizer', 'logout', 'save-interests'])
const selectedInterests = computed({ get: () => props.interests, set: value => emit('update:interests', value) })
</script>

<template>
  <section class="page-view">
    <div class="page-title"><div><div class="section-kicker">TU PERFIL</div><h1 tabindex="-1">Tu cuenta, <em>a tu manera.</em></h1><p>Gestiona tus datos, roles y preferencias.</p></div></div>
    <div class="two-column">
      <div class="panel-card"><div class="panel-head"><h2>Tu perfil</h2><span class="status-pill">{{ statusLabel(profile.estado) }}</span></div><div class="profile-summary"><span class="large-avatar">{{ profile?.nombre?.[0] || 'U' }}</span><div><h3>{{ profile.nombre }}</h3><p>{{ profile.email }}</p><small>{{ profile.verificado ? 'Cuenta verificada' : 'Perfil activo' }} · {{ (profile.roles || []).map(statusLabel).join(' · ') }}</small></div></div><div class="account-actions"><label>Rol activo<select :value="activeRole" @change="$emit('set-role', $event.target.value)"><option v-for="role in profile?.roles || []" :key="role">{{ statusLabel(role) }}</option></select></label><button v-if="!isOrganizer" class="secondary-button" @click="$emit('activate-organizer')">Activar rol de organizador</button><button class="text-button" @click="$emit('logout')">Cerrar sesión</button></div></div>
      <div class="panel-card"><div class="panel-head"><h2>Tus intereses</h2><span>Máximo 10 categorías</span></div><p class="muted">Personaliza las recomendaciones de eventos.</p><div class="interest-list"><label v-for="cat in categories" :key="cat.categoriaId" class="interest-chip"><input v-model="selectedInterests" type="checkbox" :value="cat.categoriaId" :disabled="selectedInterests.length >= 10 && !selectedInterests.includes(cat.categoriaId)"><span>{{ cat.nombre }}</span></label></div><button class="secondary-button" @click="$emit('save-interests')">Guardar preferencias ↗</button></div>
    </div>
  </section>
</template>
