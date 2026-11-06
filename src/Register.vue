<script setup>
import { computed, ref } from 'vue'

defineProps({
  busy: { type: Boolean, default: false },
  configured: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['submit', 'switch'])
const email = ref('')
const password = ref('')
const nombre = ref('')
const dni = ref('')
const showPassword = ref(false)
const passwordRules = computed(() => [
  { text: 'Mínimo 8 caracteres', ok: password.value.length >= 8 },
  { text: 'Una letra mayúscula', ok: /[A-Z]/.test(password.value) },
  { text: 'Un número', ok: /\d/.test(password.value) },
])

// Mantiene la política de contraseña exigida por Firebase Authentication.
function submit() {
  emit('submit', {
    email: email.value.trim(),
    password: password.value,
    nombre: nombre.value.trim(),
    dni: dni.value.trim(),
  })
}
</script>

<template>
  <section aria-labelledby="register-title">
    <div class="section-kicker">EMPIEZA POR AQUÍ</div>
    <h2 id="register-title">Crea tu cuenta.</h2>
    <p class="auth-card-copy">Un perfil para todos tus planes.</p>
    <form class="auth-form" @submit.prevent="submit">
      <label>Nombre completo<input v-model="nombre" autocomplete="name" required minlength="2" maxlength="80" placeholder="¿Cómo te llamas?"></label>
      <label>DNI<input v-model="dni" inputmode="numeric" required pattern="\d{8}" maxlength="8" title="El DNI debe tener 8 dígitos." placeholder="8 dígitos"></label>
      <label>Usuario (correo electrónico)<input v-model="email" type="email" autocomplete="username" required placeholder="tu@correo.com"></label>
      <label>Contraseña<div class="password-field"><input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required minlength="8" placeholder="Mínimo 8, una mayúscula y un número"><button type="button" :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword=!showPassword"><svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div></label>
      <ul class="password-rules" aria-label="Requisitos de la contraseña"><li v-for="rule in passwordRules" :key="rule.text" :class="{ ok: rule.ok }">{{ rule.ok ? '✓' : '•' }} {{ rule.text }}</li></ul>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <button class="primary-button auth-submit" :disabled="busy || !configured">Crear cuenta <span>↗</span></button>
    </form>
    <div class="auth-switch">¿Ya tienes una cuenta? <button type="button" @click="emit('switch')">Inicia sesión</button></div>
  </section>
</template>
