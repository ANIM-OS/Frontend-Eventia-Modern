<script setup>
import { ref } from 'vue'

defineProps({
  busy: { type: Boolean, default: false },
  configured: { type: Boolean, default: false },
  email: { type: String, default: '' },
  error: { type: String, default: '' },
})

const emit = defineEmits(['submit', 'reset-password', 'switch', 'email-change'])
const password = ref('')
const showPassword = ref(false)
</script>

<template>
  <section aria-labelledby="login-title">
    <div class="section-kicker">QUÉ BUENO TENERTE DE VUELTA</div>
    <h2 id="login-title">Bienvenido de nuevo.</h2>
    <p class="auth-card-copy">Ingresa para continuar descubriendo.</p>
    <form class="auth-form" @submit.prevent="emit('submit', { email, password })">
      <label>Usuario (correo electrónico)<input :value="email" type="email" autocomplete="username" required placeholder="tu@correo.com" @input="emit('email-change', $event.target.value)"></label>
      <label>Contraseña<div class="password-field"><input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required minlength="6" placeholder="Tu contraseña"><button type="button" :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword=!showPassword"><svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div></label>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <button class="primary-button auth-submit" :disabled="busy || !configured">Iniciar sesión <span>↗</span></button>
      <button type="button" class="text-button forgot-password" :disabled="busy" @click="emit('reset-password', email)">¿Olvidaste tu contraseña?</button>
    </form>
    <div class="auth-switch">¿Todavía no tienes cuenta? <button type="button" @click="emit('switch')">Regístrate</button></div>
  </section>
</template>
