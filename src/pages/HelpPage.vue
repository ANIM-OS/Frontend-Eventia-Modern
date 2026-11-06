<script setup>
defineEmits(['navigate'])
</script>

<template>
  <section class="page-view help-page">
    <div class="page-title"><div><div class="section-kicker">ESTAMOS PARA AYUDARTE</div><h1 tabindex="-1">Resuelve tus dudas</h1><p>Información para reservar, asistir y organizar.</p></div></div>
    <div class="help-grid">
      <article class="panel-card"><h2>Reservas y entradas</h2><details open><summary>¿Se cobra al reservar?</summary><p>Esta versión es una demostración: registra la reserva y emite entradas, pero no procesa pagos con Yape, Plin ni tarjeta. No envíes dinero desde esta aplicación.</p></details><details><summary>¿Cómo muestro mi entrada?</summary><p>Ingresa a Mis entradas y abre el QR al llegar. Se renueva automáticamente y necesita conexión a internet. Una captura de pantalla puede caducar.</p></details><details><summary>¿Y si no puedo abrir el QR?</summary><p>Reintenta con conexión. También puedes mostrar al organizador el ID de entrada y tu documento para que compruebe tu reserva. La validación del organizador también requiere internet.</p></details></article>
      <article class="panel-card"><h2>Organizar y recibir asistentes</h2><details open><summary>¿Cuándo se habilita el ingreso?</summary><p>El día del evento, según la hora de Perú, mientras siga publicado y no haya terminado. Cada validación registra un solo ingreso.</p></details><details><summary>¿Cómo publico un evento?</summary><p>Activa tu perfil de organizador desde Mi cuenta. Crea un borrador, revisa fechas, dirección, aforo y precio; después publícalo desde Mis eventos.</p></details><details><summary>¿Qué ocurre al cancelar?</summary><p>El evento deja de admitir reservas. Revisa las entradas emitidas y comunica a los asistentes el siguiente paso. Esta aplicación no procesa reembolsos.</p></details></article>
    </div>
    <button class="secondary-button" @click="$emit('navigate', 'explorar')">Explorar eventos</button>
  </section>
</template>
