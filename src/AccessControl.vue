<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { api } from './api'
import { accessStatus, isPublished } from './eventLogic'

const props = defineProps({ events: { type: Array, default: () => [] }, eventId: { type: [Number, String], default: '' } })
const selectedId = ref(props.eventId), code = ref(''), scanning = ref(false), submitting = ref(false), result = ref(null), error = ref('')
const liveVideo = ref(null), cameraOpen = ref(false), online = ref(navigator.onLine)
let stream, frame, decodeLive, lastScan = 0
function updateOnline() { online.value = navigator.onLine }
window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline)
function stopCamera() { cameraOpen.value = false; cancelAnimationFrame(frame); stream?.getTracks().forEach(track => track.stop()); stream = null }
async function startCamera() {
  error.value = ''; result.value = null; code.value = ''
  if (!navigator.mediaDevices?.getUserMedia) { error.value = 'La cámara continua necesita HTTPS y un navegador compatible. Puedes elegir una foto o ingresar los datos manualmente.'; return }
  try {
    decodeLive = (await import('jsqr')).default
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    if (disposed) { stopCamera(); return }
    cameraOpen.value = true
    await new Promise(resolve => requestAnimationFrame(resolve))
    liveVideo.value.srcObject = stream; await liveVideo.value.play()
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true })
    function scan(time) {
      if (!cameraOpen.value || disposed) return
      const video = liveVideo.value
      if (video?.readyState >= 2 && time - lastScan > 200) {
        lastScan = time
        const scale = Math.min(1, 900 / video.videoWidth); canvas.width = video.videoWidth * scale; canvas.height = video.videoHeight * scale
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const decoded = decodeLive(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' })
        if (decoded?.data?.trim()) { code.value = decoded.data.trim(); stopCamera(); validate(); return }
      }
      frame = requestAnimationFrame(scan)
    }
    frame = requestAnimationFrame(scan)
  } catch { stopCamera(); error.value = 'No pudimos abrir la cámara. Revisa el permiso del navegador o usa una foto o los datos de la entrada.' }
}
const cameraInput = ref(null), photoInput = ref(null), now = ref(new Date())
const clock = setInterval(() => { now.value = new Date() }, 30000)
let disposed = false
onUnmounted(() => { disposed = true; clearInterval(clock); stopCamera(); window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline) })
const events = computed(() => props.events.filter(event => isPublished(event) && !event.finalizado && new Date(event.fechaFin) > now.value))
const event = computed(() => events.value.find(item => item.eventoId === Number(selectedId.value)))
const status = computed(() => accessStatus(event.value, now.value))
const locked = computed(() => scanning.value || submitting.value)
watch(() => props.eventId, value => { selectedId.value = value })
watch(selectedId, () => { stopCamera(); code.value = ''; result.value = null; error.value = '' })
watch(status, value => { if (!value.allowed) stopCamera() })
watch(code, () => { result.value = null; error.value = '' })

async function readPhoto(change) {
  const file = change.target.files?.[0]
  if (!file || locked.value) return
  scanning.value = true; code.value = ''; result.value = null; error.value = ''
  let cleanup = () => {}
  try {
    let image
    if (typeof createImageBitmap === 'function') {
      image = await createImageBitmap(file); cleanup = () => image.close?.()
    } else {
      const url = URL.createObjectURL(file); cleanup = () => URL.revokeObjectURL(url)
      image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('No se pudo abrir la foto.')); img.src = url })
    }
    const scale = Math.min(1, 1800 / Math.max(image.width, image.height)), canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('No se pudo procesar la foto.')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const { default: decodeQr } = await import('jsqr')
    const decoded = decodeQr(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' })
    if (!decoded?.data?.trim()) throw new Error('No encontramos un QR. Acerca el código y toma una foto nítida, sin reflejos.')
    if (!disposed) code.value = decoded.data.trim()
  } catch (failure) { if (!disposed) error.value = failure.message }
  finally { cleanup(); scanning.value = false; change.target.value = '' }
}
// US-08: ingreso manual (si la cámara falla) con el ID de la entrada y el DNI del titular
const manual = reactive({ entradaId: '', documento: '' })
const manualReady = computed(() => Number.isInteger(Number(manual.entradaId)) && Number(manual.entradaId) > 0 && /^[A-Za-z0-9-]{6,20}$/.test(manual.documento.trim()))
const canValidate = computed(() => Boolean(code.value.trim()) || manualReady.value)
watch(manual, () => { result.value = null; error.value = '' })
async function validate() {
  if (!online.value) { error.value = 'No hay conexión. Reconecta el dispositivo y reintenta. No se ha confirmado ningún ingreso.'; return }
  if (locked.value || !canValidate.value || !status.value.allowed || result.value) return
  submitting.value = true; error.value = ''
  // El QR trae un token firmado que vence en segundos: se valida apenas se lee
  const body = code.value.trim()
    ? { eventoId: event.value.eventoId, codigoQr: code.value.trim() }
    : { eventoId: event.value.eventoId, entradaId: Number(manual.entradaId), titularDocumento: manual.documento.trim().toUpperCase() }
  try { result.value = await api.validarEntrada(body) }
  catch (failure) { error.value = failure.message || 'No pudimos confirmar el ingreso. Revisa la conexión y vuelve a validar la entrada.' }
  finally { submitting.value = false }
}
function nextAttendee() { code.value = ''; manual.entradaId = ''; manual.documento = ''; result.value = null; error.value = '' }
</script>

<template>
  <div class="panel-card access-panel">
    <div class="panel-head"><h2>Recibir asistentes</h2><span>Control en la entrada del evento</span></div>
    <p class="flow-copy">El asistente muestra su entrada QR. Como organizador, lee el código y confirma su ingreso una sola vez.</p>
    <label class="access-label">Evento<select v-model="selectedId" :disabled="locked"><option value="" disabled>Selecciona uno de tus eventos</option><option v-for="item in events" :key="item.eventoId" :value="item.eventoId">{{ item.nombre }} · {{ new Date(item.fechaInicio).toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) }}</option></select></label>
    <p v-if="!events.length" class="empty-inline">No tienes eventos publicados con ingresos pendientes. Publica un evento desde “Mis eventos”.</p>
    <p v-else-if="selectedId && !event" class="access-note" role="status">El evento seleccionado ya no admite ingresos. Selecciona otro evento.</p>
    <template v-if="event">
      <div class="access-event"><strong>{{ event.nombre }}</strong><span>{{ event.sede }} · {{ new Date(event.fechaInicio).toLocaleString('es-PE', { timeZone: 'America/Lima' }) }}</span></div>
      <p class="access-note">{{ status.message }}</p>
      <form v-if="status.allowed" @submit.prevent="validate">
        <input ref="cameraInput" hidden type="file" accept="image/*" capture="environment" @change="readPhoto">
        <input ref="photoInput" hidden type="file" accept="image/*" @change="readPhoto">
        <div v-if="!online" class="form-error" role="alert">Sin conexión: no se pueden confirmar ingresos.</div>
        <div v-if="cameraOpen" class="live-scanner"><video ref="liveVideo" autoplay muted playsinline aria-label="Cámara para leer la entrada" /><p role="status">Acerca una entrada. Al leer el QR se registrará el ingreso automáticamente.</p><button type="button" class="secondary-button" @click="stopCamera">Cerrar cámara</button></div>
        <div v-else-if="!result" class="info-callout"><b>Ingreso rápido</b><p>Al abrir la cámara, cada QR leído se enviará para validar y registrar un ingreso. Muestra una sola entrada a la vez.</p><button type="button" class="primary-button" :disabled="locked || !online" @click="startCamera">Abrir cámara y validar QR</button></div>
        <div v-if="!cameraOpen && !result" class="scan-actions"><button type="button" class="primary-button" :disabled="locked" @click="cameraInput.click()">{{ scanning ? 'Leyendo QR…' : 'Tomar foto del QR' }}</button><button type="button" class="secondary-button" :disabled="locked" @click="photoInput.click()">Elegir imagen</button></div>
        <p v-if="code && !result" class="scan-ready" role="status">QR leído. Confirma el ingreso ahora: el código del asistente vence en pocos segundos.</p>
        <details v-if="!result && !code" class="manual-code"><summary>Ingresar datos manualmente</summary><div class="manual-fields"><label>ID de la entrada<input v-model="manual.entradaId" :disabled="locked" inputmode="numeric" aria-label="ID de la entrada" placeholder="ID de la entrada (ej. 12)" autocomplete="off"></label><label>Documento del titular<input v-model="manual.documento" :disabled="locked" inputmode="numeric" maxlength="20" aria-label="Documento del titular" placeholder="DNI, carné o pasaporte" autocomplete="off"></label></div><small>El ID aparece en la entrada del asistente. Se verifica que el DNI coincida con el titular.</small></details>
        <button v-if="!result" class="primary-button access-confirm" :disabled="locked || !canValidate || !online">{{ submitting ? 'Validando…' : 'Validar y registrar ingreso' }}</button>
      </form>
      <div v-if="result" class="access-result" :class="result.valida ? 'accepted' : 'rejected'" role="status"><strong>{{ result.valida ? 'Ingreso confirmado' : 'Acceso rechazado' }}</strong><p>{{ result.mensaje }}</p><span v-if="result.titularNombre">{{ result.titularNombre }} · {{ result.tipoAcceso }}</span><button type="button" class="secondary-button" @click="nextAttendee">Siguiente asistente</button></div>
    </template>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
  </div>
</template>
