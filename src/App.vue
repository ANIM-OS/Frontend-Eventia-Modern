<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { api } from './api'
import { auth, firebaseConfigured } from './firebase'
import { authenticationErrorMessage, loginWithEmail, registerWithEmail, requestPasswordReset } from './authentication'
import QrDinamico from './QrDinamico.vue'
import AppIcon from './AppIcon.vue'
import ActionDialog from './ActionDialog.vue'
import { modal as vModal } from './modal'
import { statusLabel, purchaseLimit, attendeeError, documentError, peruInputISO, peruInputValue } from './uiLogic'
import EventCard from './EventCard.vue'
import EventAssistant from './EventAssistant.vue'
import AccessControl from './AccessControl.vue'
import Login from './Login.vue'
import Register from './Register.vue'
import HelpPage from './pages/HelpPage.vue'
import AccessPage from './pages/AccessPage.vue'
import AccountPage from './pages/AccountPage.vue'
import ReviewsPage from './pages/ReviewsPage.vue'
import NotificationsPage from './pages/NotificationsPage.vue'
import TicketsPage from './pages/TicketsPage.vue'
import DiscoveryPage from './pages/DiscoveryPage.vue'
import EventDetailPage from './pages/EventDetailPage.vue'
import ModerationPage from './pages/ModerationPage.vue'
import EventForm from './EventForm.vue'
import BarraAforo from './BarraAforo.vue'
import { onCuposActualizados, aplicarCupos } from './aforo'
import { canEditEvent, canPublishEvent, canShowTicketQr, enrichTickets, isPublished } from './eventLogic'

const sections = [
  { id: 'explorar', label: 'Explorar', icon: '⌕' }, { id: 'entradas', label: 'Mis entradas', icon: '▤' },
  { id: 'organizar', label: 'Mis eventos', icon: '＋' }, { id: 'accesos', label: 'Control de acceso', icon: '▦' }, { id: 'cuenta', label: 'Mi cuenta', icon: '◉' },
  { id: 'resenas', label: 'Reseñas', icon: '☆' }, { id: 'avisos', label: 'Notificaciones', icon: '♧' },
  { id: 'moderacion', label: 'Moderación', icon: '⌘' },
]
const active = ref('explorar')
const showAuth = ref(false), authTarget = ref('explorar'), pendingCheckout = ref(null)
const errorMessage = ref(''), catalogError = ref(''), catalogLoading = ref(false), buying = ref(false)
const checkoutError = ref(''), purchaseSuccess = ref(''), actionRequest = ref(null)
const eventBaseline = ref(''), detailLoading = ref(false), sectionLoading = ref(false)
let sectionRequest = 0
let dialogResolve, authUnsubscribe, catalogScroll = 0
function ask(request) { if (actionRequest.value) return Promise.resolve(null); actionRequest.value = request; return new Promise(resolve => { dialogResolve = resolve }) }
function answerDialog(value) { actionRequest.value = null; dialogResolve?.(value); dialogResolve = null }
function leaveAccess() { pendingCheckout.value = null; authTarget.value = 'explorar'; showAuth.value = false; selectSection('explorar') }
function requireAccount(target = 'explorar') { authTarget.value = target; showAuth.value = true; routeTo('acceso') }
function routeTo(path) { if (location.hash !== '#/' + path) history.pushState(null, '', '#/' + path) }
async function restoreRoute() {
  const path = location.hash.replace(/^#\//, '') || 'explorar'
  if (path.startsWith('eventos/')) { const id = Number(path.split('/')[1]); if (id > 0) return openEvent(id) }
  if (['organizar','accesos'].includes(path) && isOrganizer.value) activeRole.value = 'ORGANIZADOR'
  if (path === 'acceso') { if (profile.value) await selectSection('explorar'); else requireAccount(); return }
  await selectSection(sections.some(item => item.id === path) || path === 'ayuda' ? path : 'explorar')
}
function focusPage() { requestAnimationFrame(() => document.querySelector('main h1')?.focus({ preventScroll: true })) }
async function finishAccess() {
  if (!showAuth.value && !pendingCheckout.value) return
  const target = authTarget.value; authTarget.value = 'explorar'
  showAuth.value = false
  if (pendingCheckout.value) {
    const pending = pendingCheckout.value; pendingCheckout.value = null
    await openEvent(pending.id)
    if (eventDetail.value) openCheckout(eventDetail.value, pending.quantity)
  } else if (target !== 'explorar') await selectSection(['organizar','accesos'].includes(target) && !isOrganizer.value ? 'cuenta' : target)
  else routeTo(active.value === 'detalle' && eventDetail.value ? 'eventos/' + eventDetail.value.eventoId : 'explorar')
}
function beforeLeaving(event) { if (active.value === 'organizar' && organizerView.value === 'formulario' && eventBaseline.value && JSON.stringify(eventForm) !== eventBaseline.value) { event.preventDefault(); event.returnValue = '' } }
async function canLeaveForm() {
  if (active.value !== 'organizar' || organizerView.value !== 'formulario' || !eventBaseline.value || JSON.stringify(eventForm) === eventBaseline.value) return true
  const leave = Boolean(await ask({ title: '¿Salir sin guardar?', description: 'Los cambios de este formulario se perderán. Puedes volver y guardar el borrador.', confirm: 'Salir sin guardar', danger: true }))
  if (leave) { resetEventForm(); organizerView.value = 'eventos' }
  return leave
}
async function closeCheckout() { if (buying.value) return; if (await ask({ title: '¿Salir de la reserva?', description: 'Todavía no se han emitido entradas. Los datos de los asistentes de este formulario se perderán.', confirm: 'Salir de la reserva' })) checkoutOpen.value = false }

const authMode = ref('login'); const firebaseUser = ref(auth?.currentUser || null); const appDataLoaded = ref(false)
const events = ref([]); const categories = ref([]); const popularCategories = ref([])
const profile = ref(null); const activeRole = ref('ASISTENTE'); const interests = ref([])
const tickets = ref([]); const purchases = ref([]); const pendingReviews = ref([]); const reviews = ref([])
const recommendations = ref([]); const recommendationCaption = ref(''); const profileMenuOpen = ref(false); const assistantOpen = ref(false)
const accessEventId = ref(''); const organizerView = ref('eventos'); const selectedTicket = ref(null); const selectedPurchaseId = ref(null)
const profileLoading = ref(true); const profileLoadError = ref(''); const needsProfile = ref(false)
const selectedCategory = ref(null); const modEventDetail = ref(null)
const notifications = ref([]); const sales = ref(null); const ownEvents = ref([])
const modPanel = ref(null); const modEvents = ref([]); const reports = ref([]); const users = ref([]); const audit = ref([]); const rules = ref([])
const query = reactive({ texto: '', categoriaId: '', ubicacion: '', fechaDesde: '', fechaHasta: '', soloDisponibles: true, pagina: 1, tamanoPagina: 12 })
const eventTotal = ref(0); const eventDetail = ref(null); const reviewSummary = ref(null); const message = ref(''); const pendingActions = ref(0); const busy = computed(() => pendingActions.value > 0)
let eventsRequest = 0; let profileRequest = 0; let detailRequest = 0; let moderationRequest = 0; let recommendationRequest = 0
const authForm = reactive({ email: '', nombre: '', dni: '' }); const reviewDrafts = reactive({})
const dniValido = computed(() => /^\d{8}$/.test(authForm.dni.trim()))
const eventForm = reactive({ eventoId: 0, categoriaId: '', nombre: '', descripcion: '', imagenUrl: '', fechaInicio: '', fechaFin: '', sede: '', direccion: '', departamento: 'Lima', provincia: 'Lima', distrito: '', aforoTotal: 50, precio: 0 })
const checkout = reactive({ eventoId: 0, cantidad: 1, metodoPago: 'YAPE', asistentes: [{ titularNombre: '', titularDocumento: '', tipoDocumento: 'DNI', tipoAcceso: 'GENERAL' }] })
const checkoutOpen = ref(false); const reportReason = ref(''); const showReport = ref(false); const modTab = ref('eventos'); const modStatus = ref('EN_REVISION'); const modSearch = ref('')
const detailQuantity = ref(1)
const salesFilter = reactive({ periodo: 'TODO', fechaDesde: '', fechaHasta: '' })
const isAdmin = computed(() => profile.value?.roles?.includes('ADMINISTRADOR'))
const isOrganizer = computed(() => profile.value?.roles?.includes('ORGANIZADOR'))
const hasFirebaseAccount = computed(() => Boolean(firebaseUser.value))
const organizerMode = computed(() => activeRole.value === 'ORGANIZADOR')
const navSections = computed(() => sections.filter(item => (item.id !== 'moderacion' || isAdmin.value) && (!['organizar','accesos'].includes(item.id) || isOrganizer.value) && (organizerMode.value || !['organizar','accesos'].includes(item.id) || active.value === item.id)))
const ticketList = computed(() => enrichTickets(tickets.value, purchases.value).filter(ticket => !selectedPurchaseId.value || ticket.compraId === selectedPurchaseId.value))
const checkoutLimit = computed(() => purchaseLimit(eventDetail.value))
const freeEvent = computed(() => Number(eventDetail.value?.precio || 0) === 0)
const totalPages = computed(() => Math.max(1, Math.ceil(eventTotal.value / query.tamanoPagina)))

function notify(text) { message.value = text; window.clearTimeout(notify.timer); notify.timer = window.setTimeout(() => { message.value = '' }, 7000) }
async function action(work, success = 'Listo.', sessionSensitive = true) {
  const uid = auth?.currentUser?.uid
  pendingActions.value++
  try {
    const result = await work()
    if (sessionSensitive && uid !== auth?.currentUser?.uid) return false
    if (success) notify(success)
    return result
  } catch (error) {
    if (!sessionSensitive || uid === auth?.currentUser?.uid) errorMessage.value = authenticationErrorMessage(error) || error.message || 'No se pudo completar la solicitud. Inténtalo de nuevo.'
    return false
  } finally { pendingActions.value-- }
}
function items(response, key) { return Array.isArray(response) ? response : response?.[key] || [] }
async function loadEvents(reset = false) {
  if (query.fechaDesde && query.fechaHasta && query.fechaDesde > query.fechaHasta) return catalogError.value = 'La fecha final debe ser posterior a la inicial.'
  if (reset) query.pagina = 1
  const requestId = ++eventsRequest
  catalogLoading.value = true; catalogError.value = ''
  try {
    const result = await api.eventos({ ...query })
    if (requestId === eventsRequest) { events.value = items(result, 'eventos'); eventTotal.value = result.total || 0 }
  } catch (error) { if (requestId === eventsRequest) catalogError.value = error.message || 'No pudimos cargar la cartelera.' }
  finally { if (requestId === eventsRequest) catalogLoading.value = false }
}
async function changePage(delta) {
  const page = query.pagina + delta
  if (page < 1 || page > totalPages.value || busy.value) return
  query.pagina = page; await loadEvents()
}
async function loadRecommendations() {
  const requestId = ++recommendationRequest
  const result = await action(() => api.recomendados(3), '')
  if (result && requestId === recommendationRequest) { recommendations.value = items(result, 'eventos'); recommendationCaption.value = result.criterio || 'Eventos para tu próxima experiencia.' }
}
async function filterByCategory(id) {
  query.categoriaId = id || ''; selectedCategory.value = null
  const requests = [loadEvents(true)]
  if (id) requests.push(action(() => api.categoria(id), '').then(result => { if (Number(query.categoriaId) === id && result) selectedCategory.value = result }))
  await Promise.all(requests)
}
async function loadCategories() {
  const uid = auth?.currentUser?.uid
  const [all, popular] = await Promise.allSettled([api.categorias(), api.populares(5)])
  if (uid !== auth?.currentUser?.uid) return
  if (all.status === 'fulfilled') categories.value = items(all.value, 'categorias')
  if (popular.status === 'fulfilled') popularCategories.value = items(popular.value, 'categorias')
}
async function loadProfile() {
  const uid = auth?.currentUser?.uid, requestId = ++profileRequest
  profileLoading.value = true; profileLoadError.value = ''
  try {
    const result = await api.perfil()
    if (uid !== auth?.currentUser?.uid || requestId !== profileRequest) return
    profile.value = result; needsProfile.value = false
    activeRole.value = result.roles?.includes(activeRole.value) ? activeRole.value : (result.roles?.includes('ASISTENTE') ? 'ASISTENTE' : result.roles?.[0])
    await finishAccess()
    if (!appDataLoaded.value) {
      appDataLoaded.value = true
      await Promise.all([loadCategories(), loadEvents(), loadInterests(), loadNotifications(), loadRecommendations()])
    }
  } catch (error) {
    if (uid !== auth?.currentUser?.uid || requestId !== profileRequest) return
    if (error.status === 404) { profile.value = null; needsProfile.value = true }
    else { profileLoadError.value = error.message || 'No se pudo cargar tu perfil.'; if (profile.value) notify(profileLoadError.value) }
  } finally { if (requestId === profileRequest) profileLoading.value = false }
}
async function loadInterests() { const data = await action(() => api.intereses(), ''); if (data) interests.value = items(data, 'categorias').map(category => Number(category.categoriaId)) }
async function loadTickets() {
  const result = await action(() => api.entradas(), '')
  if (result) tickets.value = items(result, 'entradas')
  const history = await action(() => api.compras(), '')
  if (history) purchases.value = items(history, 'compras')
}
async function loadOrganizer() {
  if (!isOrganizer.value) return
  const [result] = await Promise.all([action(() => api.misEventos(), ''), loadSales()])
  if (result) ownEvents.value = items(result, 'eventos')
}
async function openAccess(event) {
  if (!isOrganizer.value || !isPublished(event)) return
  accessEventId.value = event.eventoId
  await selectSection('accesos')
}
function showTicket(ticket) { if (canShowTicketQr(ticket)) selectedTicket.value = ticket }
// La API dijo que la entrada ya no admite QR (usada o anulada): cerramos y refrescamos la lista
async function onTicketNoDisponible(motivo) { errorMessage.value = motivo; await loadTickets() }
function viewPurchaseTickets(purchase) { selectedPurchaseId.value = purchase.compraId; window.scrollTo({ top: 0, behavior: 'smooth' }) }
async function loadReviews() {
  const uid = auth?.currentUser?.uid
  const [pending, history] = await Promise.allSettled([api.pendientesResena(), api.misResenas()])
  if (uid !== auth?.currentUser?.uid) return
  if (pending.status === 'fulfilled') pendingReviews.value = items(pending.value, 'eventos')
  if (history.status === 'fulfilled') reviews.value = items(history.value, 'resenas')
}
async function loadNotifications() {
  const result = await action(() => api.notificaciones(), '')
  if (result) notifications.value = items(result, 'notificaciones')
}
async function loadModeration() {
  if (!isAdmin.value) return
  const result = await action(() => api.modPanel(), '')
  if (result) modPanel.value = result
  await loadModTab()
}
async function loadModTab() {
  if (!isAdmin.value) return
  const requestId = ++moderationRequest, tab = modTab.value
  const requests = {
    eventos: [() => api.modEventos({ estadoModeracion: modStatus.value, texto: modSearch.value }), modEvents, 'eventos'],
    reportes: [() => api.reportes(), reports, 'reportes'],
    usuarios: [() => api.usuarios({ texto: modSearch.value }), users, 'usuarios'],
    auditoria: [() => api.auditoria(), audit, 'registros'],
    reglas: [() => api.reglas(), rules, 'reglas'],
  }
  const [fetch, state, key] = requests[tab]
  const result = await action(fetch, '')
  if (result && requestId === moderationRequest) state.value = items(result, key)
}
async function inspectModerationEvent(event) { modEventDetail.value = await action(() => api.modEvento(event.eventoId), '') }
async function refreshSection() {
  const request = ++sectionRequest; sectionLoading.value = true
  try {
  if (active.value === 'explorar') await loadEvents()
  if (active.value === 'entradas') await loadTickets()
  if (['organizar', 'accesos'].includes(active.value)) await loadOrganizer()
  if (active.value === 'cuenta' && profile.value) await loadProfile()
  if (active.value === 'resenas') await loadReviews()
  if (active.value === 'avisos') await loadNotifications()
  if (active.value === 'moderacion') await loadModeration()
  } finally { if (request === sectionRequest) sectionLoading.value = false }
}
async function selectSection(id) {
  if (!profile.value && !['explorar', 'ayuda'].includes(id)) { requireAccount(id); return }
  if (id !== 'ayuda' && !navSections.value.some(item => item.id === id)) { errorMessage.value = 'Esta sección no está disponible para tu perfil. Puedes cambiar de vista desde tu cuenta.'; id = 'explorar' }
  if (!await canLeaveForm()) { routeTo(active.value); return }
  const previous = active.value
  showAuth.value = false
  active.value = id
  routeTo(id); focusPage()
  window.scrollTo({ top: 0, behavior: 'instant' })
  profileMenuOpen.value = false
  assistantOpen.value = false
  if (id !== 'accesos') accessEventId.value = ''
  await refreshSection()
  if (id === 'explorar' && previous === 'detalle') requestAnimationFrame(() => window.scrollTo({ top: catalogScroll }))
}
async function openEvent(id) {
  if (!await canLeaveForm()) return
  if (active.value === 'explorar') catalogScroll = window.scrollY
  detailLoading.value = true
  const requestId = ++detailRequest
  showReport.value = false; reviewSummary.value = null; eventDetail.value = null
  const result = await action(() => api.evento(id), '')
  if (requestId !== detailRequest) return
  detailLoading.value = false
  if (!result) { active.value = 'explorar'; return }
  eventDetail.value = result
  detailQuantity.value = 1
  active.value = 'detalle'; showAuth.value = false; routeTo('eventos/' + id); window.scrollTo({ top: 0 }); focusPage()
  assistantOpen.value = false
  const summary = await action(() => api.resenasEvento(id), '')
  if (summary && eventDetail.value?.eventoId === id && requestId === detailRequest) reviewSummary.value = summary
}
function openCheckout(event, quantity = 1) {
  if (!event.disponibleParaCompra || !purchaseLimit(event) || buying.value) return
  if (!profile.value) { pendingCheckout.value = { id: event.eventoId, quantity }; requireAccount(); return }
  checkoutError.value = ''
  checkout.codigoOperacion = crypto.randomUUID()
  checkout.eventoId = event.eventoId; checkout.cantidad = Math.min(purchaseLimit(event), Math.max(1, quantity))
  checkout.asistentes = Array.from({ length: checkout.cantidad }, (_, index) => ({ titularNombre: index === 0 ? profile.value?.nombre || '' : '', titularDocumento: index === 0 ? profile.value?.dni || '' : '', tipoDocumento: 'DNI', tipoAcceso: 'GENERAL' }))
  checkoutOpen.value = true
}
function resizeAttendees() {
  const amount = Math.min(checkoutLimit.value, Math.max(1, Number(checkout.cantidad)))
  checkout.cantidad = amount
  while (checkout.asistentes.length < amount) checkout.asistentes.push({ titularNombre: '', titularDocumento: '', tipoDocumento: 'DNI', tipoAcceso: 'GENERAL' })
  checkout.asistentes.splice(amount)
}
function useMyDetails() { if (checkout.asistentes[0]) Object.assign(checkout.asistentes[0], { titularNombre: profile.value?.nombre || '', titularDocumento: profile.value?.dni || '', tipoDocumento: 'DNI' }) }
async function buyTickets() {
  if (buying.value) return
  checkoutError.value = attendeeError(checkout.asistentes)
  if (checkoutError.value) return
  if (!checkoutLimit.value || checkout.cantidad > checkoutLimit.value) { checkoutError.value = 'La disponibilidad cambió. Ajusta la cantidad antes de confirmar.'; return }
  buying.value = true
  try {
    const result = await api.comprar({ ...checkout, asistentes: checkout.asistentes.map(person => ({ tipoAcceso: person.tipoAcceso, titularNombre: person.titularNombre.trim(), titularDocumento: person.titularDocumento.trim().toUpperCase() })) })
    purchaseSuccess.value = `Reserva #${result.compraId || result.id || ''} confirmada. Tus ${checkout.cantidad} ${checkout.cantidad === 1 ? 'entrada está lista' : 'entradas están listas'}. No se realizó ningún cobro.`
    checkoutOpen.value = false; selectedPurchaseId.value = result.compraId || result.id
    await selectSection('entradas')
  } catch (error) { checkoutError.value = error.message || 'No se pudo registrar la reserva. Puedes reintentar con los mismos datos.' }
  finally { buying.value = false }
}
async function saveEvent() {
  if (!isOrganizer.value || busy.value) return
  if (!eventForm.fechaInicio || !eventForm.fechaFin || new Date(peruInputISO(eventForm.fechaFin)) <= new Date(peruInputISO(eventForm.fechaInicio))) return notify('Revisa el horario: el fin debe ser posterior al inicio.')
  if (!eventForm.eventoId && new Date(peruInputISO(eventForm.fechaInicio)) <= new Date()) return notify('El evento debe comenzar en una fecha futura.')
  const data = { ...eventForm, categoriaId: Number(eventForm.categoriaId), aforoTotal: Number(eventForm.aforoTotal), precio: Number(eventForm.precio), fechaInicio: peruInputISO(eventForm.fechaInicio), fechaFin: peruInputISO(eventForm.fechaFin) }
  const result = eventForm.eventoId ? await action(() => api.actualizarEvento(eventForm.eventoId, data), 'Evento actualizado.') : await action(() => api.crearEvento(data), 'Borrador creado.')
  if (result !== false) { resetEventForm(); organizerView.value = 'eventos'; await loadOrganizer() }
}
async function editEvent(event) { if (!canEditEvent(event) || !await canLeaveForm()) return; organizerView.value = 'formulario'; Object.assign(eventForm, { ...event, fechaInicio: localInputDate(event.fechaInicio), fechaFin: localInputDate(event.fechaFin) }); eventBaseline.value = JSON.stringify(eventForm); window.scrollTo({ top: 0, behavior: 'smooth' }) }
// US-11: acceso directo a editar desde la tabla de ventas
function editableEvent(id) { return ownEvents.value.find(event => event.eventoId === id && canEditEvent(event)) }
function localInputDate(value) { return peruInputValue(value) }
async function goCreateEvent() { if (!await canLeaveForm()) return; if (!isOrganizer.value) { await selectSection('cuenta'); return } activeRole.value = 'ORGANIZADOR'; await selectSection('organizar'); startNewEvent() }
async function startNewEvent() { if (!await canLeaveForm()) return; resetEventForm(); organizerView.value = 'formulario' }
async function switchOrganizerView(view) { if (!await canLeaveForm()) return; organizerView.value = view }
// US-04: la API publica las reglas de validación para mostrarlas antes de guardar
const eventRules = ref([])
watch(organizerView, async (view) => {
  if (view !== 'formulario' || eventRules.value.length) return
  const result = await action(() => api.reglasEvento(), '')
  if (result?.reglas) eventRules.value = result.reglas
})
function resetEventForm() { Object.assign(eventForm, { eventoId: 0, categoriaId: '', nombre: '', descripcion: '', imagenUrl: '', fechaInicio: '', fechaFin: '', sede: '', direccion: '', departamento: 'Lima', provincia: 'Lima', distrito: '', aforoTotal: 50, precio: 0 }); eventBaseline.value = JSON.stringify(eventForm) }
async function submitReview(eventId) {
  const draft = reviewDraft(eventId)
  const result = await action(() => api.crearResena({ eventoId, calificacion: Number(draft.calificacion), comentario: draft.comentario }), 'Gracias por compartir tu reseña.')
  if (result !== false) await loadReviews()
}
function reviewDraft(eventId) { return reviewDrafts[eventId] ||= { calificacion: 5, comentario: '' } }
async function registerProfile() {
  if (firebaseConfigured && auth?.currentUser) {
    if (!dniValido.value) return notify('El DNI debe tener 8 dígitos.')
    // El correo no se envía: la API lo toma del token de Firebase
    const created = await action(() => api.registrar({ nombre: authForm.nombre.trim(), dni: authForm.dni.trim() }), 'Perfil creado.')
    if (created === false) return
    await loadProfile()
  } else notify('Inicia sesión con Firebase antes de registrar el perfil.')
}
async function activateOrganizer() {
  const result = await action(() => api.activarOrganizador(), 'Rol de organizador activado.')
  if (result) { profile.value = result; activeRole.value = 'ORGANIZADOR'; organizerView.value = 'eventos'; await selectSection('organizar') }
}
async function setRole(role) { if (!await canLeaveForm()) return; const result = await action(() => api.cambiarRol(role), 'Rol actualizado.'); if (result) { activeRole.value = result.rolActivo || role; await selectSection(role === 'ORGANIZADOR' ? 'organizar' : role === 'ADMINISTRADOR' ? 'moderacion' : 'explorar') } }
async function createAccount(form) {
  if (!auth) return notify('Configura Firebase en .env.local para crear cuentas reales.')
  // Validamos antes de crear la cuenta en Firebase para no dejar cuentas a medias
  if (!/^\d{8}$/.test(form.dni)) return notify('El DNI debe tener 8 dígitos.')
  if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) return notify('La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.')
  const user = await action(() => registerWithEmail(form), '', false)
  if (user) {
    authForm.email = form.email
    authForm.nombre = form.nombre
    authForm.dni = form.dni
    await registerProfile()
  }
}
async function resetPassword(email) {
  if (!auth) return
  if (!email.trim()) return notify('Escribe tu correo y vuelve a pulsar "¿Olvidaste tu contraseña?".')
  // Mensaje genérico: no revelamos si el correo está registrado
  await action(() => requestPasswordReset(email.trim()), 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.', false)
}
async function login(form) { if (!auth) return notify('Configura Firebase en .env.local para iniciar sesión.'); authForm.email = form.email; await action(() => loginWithEmail(form), '', false) }
async function saveInterests() { await action(() => api.actualizarIntereses(interests.value), 'Preferencias guardadas.') }
async function publishEvent(event) { if (!canPublishEvent(event) || busy.value) return; if (!await ask({ title: `Publicar “${event.nombre}”`, description: `Revisa el horario, la dirección, el aforo de ${event.aforoTotal} personas y el precio antes de publicarlo. El evento será visible y podrá recibir reservas.`, confirm: 'Publicar evento' })) return; await action(() => api.publicarEvento(event.eventoId), 'Evento publicado.'); await loadOrganizer() }
async function cancelEvent(event) { if (!canEditEvent(event) || busy.value) return; if (!await ask({ title: `¿Cancelar “${event.nombre}”?`, description: 'El evento dejará de admitir reservas. Revisa las entradas emitidas y comunica a los asistentes qué ocurrirá con su reserva. No se tramitan reembolsos automáticos desde esta pantalla.', confirm: 'Cancelar evento', danger: true })) return; await action(() => api.cancelarEvento(event.eventoId), 'Evento cancelado.'); await loadOrganizer() }
async function loadSales() { const r = await action(() => api.ventas(salesFilter), ''); if (r) sales.value = r }
async function exportSales(format) { await action(() => api.exportarVentas(format, salesFilter), `Reporte ${format.toUpperCase()} descargado.`) }
async function reportEvent(id) { const motivo = reportReason.value.trim(); if (motivo.length < 5) return notify('Escribe un motivo de al menos 5 caracteres.'); const r = await action(() => api.reportarEvento(id, motivo), 'Reporte enviado.'); if (r !== false) { reportReason.value = ''; showReport.value = false } }
async function markRead(notification) { const result = await action(() => api.leerNotificacion(notification.notificacionId), 'Notificación marcada como leída.'); if (result !== false) notification.leida = true }
async function markAllRead() { const result = await action(() => api.leerTodas(), 'Notificaciones marcadas como leídas.'); if (result !== false) notifications.value.forEach(n => n.leida = true) }
async function moderate(event) {
  if (busy.value) return
  const answer = await ask({ title: event.estadoModeracion === 'CONFORME' ? 'Suspender evento' : 'Aprobar evento', description: 'La decisión cambia la visibilidad y disponibilidad del evento.', fields: [{ key: 'motivo', label: 'Motivo de la decisión', required: true }], confirm: 'Guardar decisión' })
  if (!answer) return
  const { motivo } = answer
  const r = await action(() => api.moderarEvento(event.eventoId, { estadoModeracion: event.estadoModeracion === 'CONFORME' ? 'DESACTIVADO' : 'CONFORME', motivo, confirmado: true }), 'Moderación actualizada.')
  if (r !== false) await loadModTab()
}
async function resolveReport(report) {
  const answer = await ask({ title: 'Resolver reporte', description: 'Deja una explicación para el registro de moderación.', fields: [{ key: 'resolucion', label: 'Resolución', required: true }], confirm: 'Resolver reporte' })
  if (!answer) return
  const { resolucion } = answer
  await action(() => api.resolverReporte(report.reporteId, { estado: 'RESUELTO', resolucion, confirmado: true }), 'Reporte resuelto.')
  await loadModTab()
}
async function changeUser(user) {
  const answer = await ask({ title: `Cambiar estado de ${user.nombre}`, description: 'Bloquear o desactivar la cuenta impedirá su uso. Indica el motivo antes de continuar.', fields: [{ key: 'estado', label: 'Nuevo estado', value: user.estado, required: true, options: ['ACTIVO','BLOQUEADO','INACTIVO'].map(value => ({ value, label: statusLabel(value) })) }, { key: 'motivo', label: 'Motivo', required: true }], confirm: 'Actualizar cuenta' })
  if (!answer) return
  const { estado } = answer
  await action(() => api.cambiarEstadoUsuario(user.usuarioId, { estado: estado.toUpperCase(), motivo: answer.motivo, confirmado: true }), 'Estado de cuenta actualizado.')
  await loadModTab()
}
async function createRule() {
  const answer = await ask({ title: 'Nueva regla de moderación', description: 'Describe qué contenido requiere revisión.', fields: [{ key: 'nombre', label: 'Nombre', required: true, maxlength: 80 }, { key: 'criterio', label: 'Criterio de revisión', required: true }], confirm: 'Crear regla' })
  if (!answer) return
  const { nombre, criterio } = answer
  await action(() => api.crearRegla({ nombre, tipo: 'IA', criterio, accion: 'EN_REVISION' }), 'Regla creada.')
  await loadModTab()
}
async function toggleRule(rule) { const result = await action(() => api.toggleRegla(rule.reglaId, !rule.activa), `Regla ${rule.activa ? 'desactivada' : 'activada'}.`); if (result !== false) rule.activa = !rule.activa }
async function verifyUser(user) { await action(() => api.verificarUsuario(user.usuarioId), 'Cuenta verificada.'); await loadModTab() }

async function logout() { if (await canLeaveForm()) await action(() => signOut(auth), 'Sesión cerrada.') }
function resetSession() {
  ++profileRequest; ++eventsRequest
  profile.value = null; appDataLoaded.value = false; needsProfile.value = false; profileLoadError.value = ''; activeRole.value = 'ASISTENTE'
  for (const state of [tickets, purchases, interests, recommendations, ownEvents, notifications, pendingReviews, reviews, modEvents, reports, users, audit, rules]) state.value = []
    eventDetail.value = null; selectedTicket.value = null; selectedPurchaseId.value = null; modEventDetail.value = null; modPanel.value = null; sales.value = null; checkoutOpen.value = false; showReport.value = false
  assistantOpen.value = false; recommendationCaption.value = ''; accessEventId.value = ''; organizerView.value = 'eventos'; eventTotal.value = 0; message.value = ''; authForm.nombre = ''; authForm.email = ''; authForm.dni = ''; resetEventForm()
  selectedCategory.value = null
  ++detailRequest; ++moderationRequest; ++recommendationRequest
  for (const key of Object.keys(reviewDrafts)) delete reviewDrafts[key]
}
onMounted(async () => {
  window.addEventListener('popstate', restoreRoute)
  window.addEventListener('beforeunload', beforeLeaving)
  await Promise.all([loadCategories(), loadEvents()])
  if (!auth) { profileLoading.value = false; await restoreRoute(); return }
  let first = true
  authUnsubscribe = onAuthStateChanged(auth, async user => {
    if (firebaseUser.value?.uid !== user?.uid) resetSession()
    firebaseUser.value = user
    if (user) { authForm.email = user.email || ''; if (user.displayName) authForm.nombre = user.displayName; await loadProfile() }
    else { profile.value = null; profileLoading.value = false; if (active.value === 'detalle') await restoreRoute(); if (!['explorar','detalle','ayuda'].includes(active.value)) await selectSection('explorar') }
    if (first) { first = false; await restoreRoute() }
  })
})
onUnmounted(() => { authUnsubscribe?.(); window.removeEventListener('popstate', restoreRoute); window.removeEventListener('beforeunload', beforeLeaving); window.clearTimeout(notify.timer) })
try { const saved = JSON.parse(sessionStorage.getItem('eventia.filters') || 'null'); if (saved && typeof saved === 'object') for (const key of Object.keys(query)) if (typeof saved[key] === typeof query[key]) query[key] = saved[key] } catch { /* Storage may be disabled. */ }
watch(query, value => { try { sessionStorage.setItem('eventia.filters', JSON.stringify(value)) } catch { /* Optional preference. */ } }, { deep: true })
watch(modTab, loadModTab)

// US-09: cuando alguien compra o el organizador cambia el aforo, la API avisa por SignalR
// y actualizamos los cupos en pantalla sin recargar (cartelera, recomendados, detalle y mis eventos).
const dejarDeEscucharCupos = onCuposActualizados((aviso) => {
  for (const list of [events.value, recommendations.value, ownEvents.value]) list.forEach(event => aplicarCupos(event, aviso))
  aplicarCupos(eventDetail.value, aviso)
  if (aviso.agotado && checkoutOpen.value && checkout.eventoId === aviso.eventoId) notify('Este evento se acaba de agotar.')
})
onUnmounted(dejarDeEscucharCupos)
</script>

<template>
  <div v-if="showAuth && !profile" class="auth-gate">
    <header class="auth-header"><a class="brand" href="#/explorar" @click.prevent="leaveAccess()"><img class="brand-logo" src="/brand/eventia-logo-compacto.svg" alt="Eventia — Eventos y experiencias" /></a><span>EVENTOS PARA VIVIRLOS</span></header>
    <main class="auth-layout">
      <section class="auth-story"><div class="eyebrow"><span class="sparkle">✳</span> TU PRÓXIMA HISTORIA EMPIEZA AQUÍ</div><h1 tabindex="-1">Tu próximo plan<br><em>empieza aquí.</em></h1><p>Encuentra conciertos, cultura y experiencias para vivir la ciudad de otra manera.</p><div class="auth-photo"><div><span>✳</span><b>Nos vemos<br>ahí afuera.</b></div></div><div class="auth-trust"><span>✳</span> Música · Cultura · Experiencias</div></section>
      <section class="auth-card"><button class="text-button" @click="leaveAccess()">← Seguir explorando</button><p v-if="pendingCheckout" class="info-callout">Accede para completar tu reserva. Conservaremos el evento y la cantidad elegida.</p>
        <template v-if="profileLoading"><h2>Cargando tu cuenta…</h2><p class="auth-card-copy" role="status">Estamos recuperando tu perfil y tus permisos.</p></template>
        <template v-else-if="profileLoadError"><h2>No pudimos abrir tu cuenta.</h2><p class="form-error" role="alert">{{ profileLoadError }}</p><button class="primary-button" @click="loadProfile">Reintentar</button><button class="text-button" @click="logout">Usar otra cuenta</button></template>
        <template v-else-if="!hasFirebaseAccount">
          <div class="auth-tabs" role="tablist" aria-label="Acceso a Eventia"><button role="tab" :aria-selected="authMode==='login'" :class="{ active: authMode==='login' }" @click="authMode='login'">Iniciar sesión</button><button role="tab" :aria-selected="authMode==='register'" :class="{ active: authMode==='register' }" @click="authMode='register'">Crear cuenta</button></div>
          <Login v-if="authMode==='login'" :busy="busy" :configured="firebaseConfigured" :email="authForm.email" @email-change="authForm.email=$event" @submit="login" @reset-password="resetPassword" @switch="authMode='register'" />
          <Register v-else :busy="busy" :configured="firebaseConfigured" @submit="createAccount" @switch="authMode='login'" />
          <div v-if="!firebaseConfigured" class="dev-access"><small>No pudimos conectar con el servicio de acceso.</small><small class="auth-note">El acceso no está disponible en este momento. Puedes seguir consultando eventos.</small></div>
        </template>
        <template v-else-if="needsProfile">
          <div class="section-kicker">UN ÚLTIMO PASO</div><h2>Completa tu perfil.</h2><p class="auth-card-copy">Añade tu nombre y DNI para emitir entradas a tu nombre. Tu correo ya está verificado por el servicio de acceso.</p>
          <form class="auth-form" @submit.prevent="registerProfile"><label>Nombre completo<input v-model="authForm.nombre" autocomplete="name" required minlength="2" maxlength="80" placeholder="¿Cómo te llamas?"></label><label>DNI<input v-model="authForm.dni" inputmode="numeric" required pattern="\d{8}" maxlength="8" title="El DNI debe tener 8 dígitos." placeholder="8 dígitos"></label><label>Correo electrónico<input v-model="authForm.email" type="email" autocomplete="email" readonly required maxlength="254" placeholder="tu@correo.com"></label><button class="primary-button auth-submit" :disabled="busy">Entrar a mi cuenta <span>↗</span></button></form>
          <button class="text-button auth-signout" @click="logout">Usar otra cuenta</button>
        </template>
        <div class="auth-secure"><span>◈</span> {{ firebaseConfigured ? 'Acceso seguro · Tu contraseña está protegida' : 'Autenticación disponible al configurar Firebase' }}</div>
      </section>
    </main>
    <footer class="auth-footer"><span>© 2026 EVENTIA</span><span>Hecho para vivirlo.</span></footer>
    <div v-if="message" class="toast" role="status">{{ message }}</div>
  </div>

  <q-layout v-else view="hHh Lpr fFf" class="app-frame" :class="{ 'viewing-event': active === 'detalle' }">
    <q-header class="site-header">
      <div class="header-inner">
        <a class="brand" href="#" @click.prevent="selectSection('explorar')"><img class="brand-logo" src="/brand/eventia-logo-compacto.svg" alt="Eventia — Eventos y experiencias" /></a>
        <div v-if="profile" class="header-context"><q-icon name="south_america" /> Lima, Perú <span>·</span> Encuentra tu próximo plan</div>
        <div class="header-actions"><button class="text-button help-link" @click="selectSection('ayuda')">Ayuda</button><template v-if="profile">
          <button class="icon-button notification-button" aria-label="Ver notificaciones" @click="selectSection('avisos')"><AppIcon name="bell" /><i v-if="notifications.some(n => !n.leida)"></i></button>
          <div class="profile-menu">
            <q-btn flat no-caps class="profile-trigger" :aria-expanded="profileMenuOpen" @click="profileMenuOpen = true">
              <span class="avatar"><img v-if="firebaseUser?.photoURL" :src="firebaseUser.photoURL" alt=""><template v-else>{{ profile?.nombre?.[0] || 'U' }}</template></span>
              <span class="profile-name"><strong>{{ profile.nombre }}</strong><small>Mi perfil</small></span><q-icon name="expand_more" />
            </q-btn>
            <q-menu v-model="profileMenuOpen" no-parent-event anchor="bottom right" self="top right" :offset="[0,10]" transition-show="none" transition-hide="none" class="account-menu">
              <div class="account-menu-inner">
                <div class="account-menu-heading"><span class="avatar">{{ profile?.nombre?.[0] || 'U' }}</span><div><strong>{{ profile.nombre }}</strong><small>{{ profile.email || 'Tu cuenta Eventia' }}</small></div></div>
                <q-btn unelevated no-caps color="primary" class="account-create-event" icon="add" @click="profileMenuOpen = false; goCreateEvent()">{{ isOrganizer ? 'Crear evento' : 'Quiero organizar' }}</q-btn>
                <q-select :model-value="activeRole" class="account-role-select" outlined dense emit-value map-options label="Vista" :disable="busy" :options="(profile?.roles || []).map(role => ({ label: role === 'ASISTENTE' ? 'Asistir a eventos' : role === 'ORGANIZADOR' ? 'Organizar eventos' : 'Administrar', value: role }))" @update:model-value="setRole" />
                <q-separator class="account-menu-separator" />
                <q-btn flat no-caps align="left" class="account-menu-link" @click="profileMenuOpen = false; selectSection('explorar')"><q-icon name="explore" />Explorar eventos</q-btn>
                <q-btn flat no-caps align="left" class="account-menu-link" @click="profileMenuOpen = false; selectSection('entradas')"><q-icon name="confirmation_number" />Mis entradas</q-btn>
                <q-btn v-for="item in navSections.filter(item => !['explorar','entradas'].includes(item.id))" :key="item.id" flat no-caps align="left" class="account-menu-link" @click="profileMenuOpen = false; selectSection(item.id)"><q-icon :name="({ organizar:'event', accesos:'qr_code_scanner', cuenta:'person', resenas:'star_outline', avisos:'notifications_none', moderacion:'admin_panel_settings' })[item.id] || 'circle'" />{{ item.label }}</q-btn>
                <q-btn flat no-caps align="left" class="account-menu-link" @click="profileMenuOpen = false; selectSection('ayuda')"><q-icon name="help_outline" />Ayuda para usar Eventia</q-btn>
                <q-separator class="account-menu-separator" />
                <q-btn flat no-caps align="left" class="account-menu-link logout-button" @click="profileMenuOpen = false; logout()"><q-icon name="logout" />Cerrar sesión</q-btn>
              </div>
            </q-menu>
          </div>
        </template><button v-else class="primary-button" @click="requireAccount()">Ingresar</button></div>
      </div>
    </q-header>
    <q-page-container>
    <div class="content-area">
      <main class="page-content">
        <div v-if="errorMessage" class="feedback-banner error-banner" role="alert"><div><b>No se pudo completar la acción</b><p>{{ errorMessage }}</p></div><button class="text-button" @click="errorMessage=''">Cerrar aviso</button></div>
        <p v-if="sectionLoading && !['explorar','ayuda'].includes(active)" class="info-callout" role="status">Actualizando esta sección…</p><p v-if="detailLoading" class="info-callout" role="status">Abriendo evento…</p>
        <HelpPage v-if="active === 'ayuda'" @navigate="selectSection" />
        <DiscoveryPage v-if="active === 'explorar'" :events="events" :categories="categories" :popular-categories="popularCategories" :recommendations="recommendations" :recommendation-caption="recommendationCaption" :event-total="eventTotal" :total-pages="totalPages" :query="query" :catalog-loading="catalogLoading" :catalog-error="catalogError" :busy="busy" @load-events="loadEvents" @filter-category="filterByCategory" @open-event="openEvent" @change-page="changePage" />

        <EventDetailPage v-else-if="active === 'detalle' && eventDetail" :event-detail="eventDetail" :review-summary="reviewSummary" :profile="profile" v-model:show-report="showReport" v-model:report-reason="reportReason" v-model:detail-quantity="detailQuantity" :purchase-limit="purchaseLimit" @navigate="selectSection" @report-event="reportEvent" @checkout="openCheckout" />

        <TicketsPage v-else-if="active === 'entradas'" :ticket-list="ticketList" :purchases="purchases" :selected-purchase-id="selectedPurchaseId" :section-loading="sectionLoading" :purchase-success="purchaseSuccess" @clear-success="purchaseSuccess=''" @clear-purchase="selectedPurchaseId=null" @show-ticket="showTicket" @show-purchase="viewPurchaseTickets" />

        <section v-else-if="active === 'organizar'" class="page-view">
          <div class="page-title"><div><div class="section-kicker">ORGANIZACIÓN</div><h1 tabindex="-1">Mis <em>eventos.</em></h1><p>Prepara el evento, publica sus entradas y consulta las ventas.</p></div><button v-if="isOrganizer && organizerView !== 'formulario'" class="primary-button" @click="startNewEvent">＋ Crear evento</button></div>
          <div v-if="!isOrganizer" class="callout"><div><b>Empieza a organizar</b><p>Activa el rol de organizador para crear tus eventos.</p></div><button class="primary-button" :disabled="busy" @click="activateOrganizer">Activar organizador</button></div>
          <template v-else>
            <nav class="workspace-tabs" aria-label="Gestión de eventos"><button :class="{ active: organizerView === 'eventos' }" @click="switchOrganizerView('eventos')">Mis eventos</button><button :class="{ active: organizerView === 'ventas' }" @click="switchOrganizerView('ventas');loadSales()">Ventas</button></nav>
<EventForm v-if="organizerView === 'formulario'" :event-form="eventForm" :categories="categories" :event-rules="eventRules" :busy="busy" :is-organizer="isOrganizer" @submit="saveEvent" @back="organizerView='eventos';resetEventForm()" />
            <div v-if="organizerView === 'eventos'" class="organizer-dashboard"><section class="organizer-welcome panel-card"><div><div class="section-kicker">PANEL DEL ORGANIZADOR</div><h2>Gestiona tus eventos.</h2><p>Publica tus próximos planes y consulta las ventas registradas.</p></div><div class="organizer-head-actions"><button class="secondary-button" @click="switchOrganizerView('ventas');loadSales()">Ver ventas</button><button class="primary-button" @click="selectSection('accesos')">Control de acceso</button></div></section>
              <div v-if="sales" class="stats-grid organizer-stats"><div><small>Total de reservas</small><strong>S/ {{ Number(sales.ingresosTotales).toFixed(2) }}</strong></div><div><small>Entradas emitidas</small><strong>{{ sales.entradasVendidas }}</strong></div><div><small>Ocupación total</small><strong>{{ Number(sales.tasaOcupacion).toFixed(1) }}%</strong></div><div><small>Eventos con aforo</small><strong>{{ sales.eventosConControlAforo }}</strong></div></div>
              <div class="organizer-columns"><div class="panel-card"><div class="panel-head"><h2>Mis eventos</h2><span>{{ ownEvents.length }} en total</span></div>
              <div v-if="ownEvents.length" class="data-table"><div v-for="event in ownEvents" :key="event.eventoId" class="table-row organizer-row"><div><b>{{ event.nombre }}</b><small>{{ new Date(event.fechaInicio).toLocaleString('es-PE', { timeZone: 'America/Lima' }) }} · {{ statusLabel(event.estado) }} · {{ statusLabel(event.estadoModeracion) }}</small></div><BarraAforo :aforo-total="event.aforoTotal" :vendidas="event.entradasVendidas" /><div class="row-actions"><button v-if="canEditEvent(event)" :disabled="busy" @click="editEvent(event)">Editar</button><button v-if="canPublishEvent(event)" :disabled="busy" @click="publishEvent(event)">Publicar</button><button v-if="isPublished(event) && !event.finalizado" :disabled="busy" @click="openAccess(event)">Recibir asistentes</button><button v-if="canEditEvent(event)" :disabled="busy" @click="cancelEvent(event)">Cancelar evento</button></div></div></div>
              <div v-else-if="!sectionLoading" class="empty-inline">Empieza creando un borrador. Después podrás revisarlo y publicarlo.</div>
              </div><div class="organizer-access-column"><div class="section-kicker">DÍA DEL EVENTO</div><h2>Control de acceso</h2><p>Selecciona un evento en curso para validar entradas con cámara continua, una foto o los datos del titular.</p><AccessControl :events="ownEvents" :event-id="accessEventId" /><button class="text-button" @click="selectSection('accesos')">Abrir control de acceso completo ↗</button></div></div>
            </div>
            <div v-if="organizerView === 'ventas'" class="panel-card"><p class="info-callout">Estas cifras corresponden a reservas registradas. Esta versión no procesa pagos ni acredita dinero.</p><div class="panel-head"><h2>Resumen de reservas</h2><select v-model="salesFilter.periodo" @change="loadSales"><option value="TODO">Todo</option><option value="MES">Este mes</option><option value="SEMANA">Últimos 7 días</option></select></div><div v-if="sales" class="stats-grid"><div><small>Total de reservas</small><strong>S/ {{ Number(sales.ingresosTotales).toFixed(2) }}</strong></div><div><small>Entradas emitidas</small><strong>{{ sales.entradasVendidas }}</strong></div><div><small>Vendidas / aforo total</small><strong>{{ sales.entradasVendidasTotal }} / {{ sales.aforoTotal }}</strong></div><div><small>Tasa de ocupación</small><strong>{{ Number(sales.tasaOcupacion).toFixed(1) }}%</strong></div><div><small>Control de aforo activo</small><strong>{{ sales.eventosConControlAforo }} eventos</strong></div></div><div v-else-if="!sectionLoading" class="empty-inline">No hay datos de ventas disponibles.</div><div v-if="sales?.eventos?.length" class="sales-table" role="table" aria-label="Desglose de ventas por evento"><div class="sales-row sales-head" role="row"><span>Evento</span><span>Precio</span><span>Aforo y disponibilidad</span><span>Total registrado</span><span>Estado</span><span></span></div><div v-for="row in sales.eventos" :key="row.eventoId" class="sales-row" role="row"><span><b>{{ row.nombre }}</b><small>{{ new Date(row.fechaInicio).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' }) }} · {{ row.sede }}</small></span><span>{{ Number(row.precio) === 0 ? 'Gratis' : 'S/ ' + Number(row.precio).toFixed(2) }}</span><span><BarraAforo :aforo-total="row.aforoTotal" :vendidas="row.entradasVendidasTotal" /></span><span>S/ {{ Number(row.recaudado).toFixed(2) }}</span><span><span class="estado-venta" :class="row.estadoVenta?.toLowerCase()">{{ statusLabel(row.estadoVenta) }}</span></span><span><button v-if="editableEvent(row.eventoId)" class="text-button" :disabled="busy" @click="editEvent(editableEvent(row.eventoId))">Editar</button></span></div></div><div class="export-actions"><button :disabled="busy || !sales" @click="exportSales('excel')">Descargar Excel ↓</button><button :disabled="busy || !sales" @click="exportSales('pdf')">Descargar PDF ↓</button></div></div>
          </template>
        </section>

        <AccessPage v-else-if="active === 'accesos'" :is-organizer="isOrganizer" :events="ownEvents" :event-id="accessEventId" />

        <AccountPage v-else-if="active === 'cuenta'" :profile="profile" :categories="categories" v-model:interests="interests" :active-role="activeRole" :is-organizer="isOrganizer" @set-role="setRole" @activate-organizer="activateOrganizer" @logout="logout" @save-interests="saveInterests" />

        <ReviewsPage v-else-if="active === 'resenas'" :pending-reviews="pendingReviews" :reviews="reviews" :section-loading="sectionLoading" :review-draft="reviewDraft" @submit-review="submitReview" />

        <NotificationsPage v-else-if="active === 'avisos'" :notifications="notifications" @mark-read="markRead" @mark-all-read="markAllRead" />

        <ModerationPage v-else-if="active === 'moderacion'" :is-admin="isAdmin" :mod-panel="modPanel" :mod-tab="modTab" :mod-search="modSearch" :mod-status="modStatus" :mod-events="modEvents" :reports="reports" :users="users" :audit="audit" :rules="rules" :mod-event-detail="modEventDetail" @update:tab="modTab=$event" @update:search="modSearch=$event" @update:status="modStatus=$event" @load-tab="loadModTab" @create-rule="createRule" @export-audit="action(()=>api.exportarAuditoria(),'Auditoría descargada.')" @inspect-event="inspectModerationEvent" @moderate="moderate" @resolve-report="resolveReport" @change-user="changeUser" @verify-user="verifyUser" @toggle-rule="toggleRule" />
      </main>
      <div v-if="active === 'detalle' && eventDetail" class="mobile-reservation"><div><strong>{{ Number(eventDetail.precio) === 0 ? 'Gratis' : 'S/ ' + (Number(eventDetail.precio)*detailQuantity).toFixed(2) }}</strong><small>Reserva sin cobro · demostración</small></div><button class="primary-button" :disabled="!eventDetail.disponibleParaCompra || !purchaseLimit(eventDetail)" @click="openCheckout(eventDetail,detailQuantity)">{{ eventDetail.disponibleParaCompra ? 'Reservar' : 'No disponible' }}</button></div>
      <footer class="app-footer"><span>EVENTIA · EVENTOS PARA VIVIRLOS</span><span>Hecho para encontrarnos · Perú</span></footer>
    </div>
    </q-page-container>

    <div v-if="assistantOpen" class="assistant-overlay" @click="assistantOpen=false"></div>
    <aside v-if="profile" class="assistant-dock" :class="{ open: assistantOpen }" :aria-hidden="!assistantOpen"><button class="assistant-close icon-button" aria-label="Cerrar asistente" @click="assistantOpen=false"><AppIcon name="close" /></button><EventAssistant :key="profile.usuarioId" :name="profile.nombre" :user-id="profile.usuarioId" :open="assistantOpen" @open-event="openEvent" /></aside>
    <button v-if="profile" class="assistant-mobile-toggle primary-button" :aria-expanded="assistantOpen" @click="assistantOpen=!assistantOpen"><AppIcon name="bot" />{{ assistantOpen ? 'Cerrar asistente' : 'Pregúntale a Eventia' }}</button>
    <div v-if="selectedTicket" class="modal-backdrop" @click.self="selectedTicket=null"><article v-modal="() => selectedTicket=null" class="checkout-modal ticket-modal" role="dialog" aria-modal="true" aria-label="Entrada para asistir al evento"><button type="button" class="modal-close" aria-label="Cerrar entrada" @click="selectedTicket=null">×</button><div class="section-kicker">TU ACCESO AL EVENTO</div><h2>{{ selectedTicket.eventoNombre || selectedTicket.eventoTitulo || 'Entrada #' + selectedTicket.entradaId }}</h2><QrDinamico :entrada-id="selectedTicket.entradaId" :evento-id="selectedTicket.eventoId || 0" :evento="selectedTicket.eventoNombre || selectedTicket.eventoTitulo" @no-disponible="onTicketNoDisponible" /><dl class="ticket-datos"><div><dt>Titular</dt><dd>{{ selectedTicket.titularNombre }}</dd></div><div><dt>Documento</dt><dd>{{ selectedTicket.titularDocumento }}</dd></div><div><dt>ID de entrada</dt><dd>#{{ selectedTicket.entradaId }}</dd></div><div><dt>Tipo de acceso</dt><dd>{{ statusLabel(selectedTicket.tipoAcceso) }}</dd></div><div v-if="selectedTicket.fechaInicio"><dt>Fecha y hora</dt><dd>{{ new Date(selectedTicket.fechaInicio).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'full', timeStyle: 'short' }) }}</dd></div><div v-if="selectedTicket.sede"><dt>Lugar</dt><dd>{{ selectedTicket.sede }}<template v-if="selectedTicket.direccion"> · {{ selectedTicket.direccion }}</template></dd></div><div v-if="selectedTicket.montoPagado !== undefined"><dt>Monto pagado</dt><dd>{{ Number(selectedTicket.montoPagado) === 0 ? 'Gratis' : 'S/ ' + Number(selectedTicket.montoPagado).toFixed(2) }}</dd></div></dl><p>Muestra este QR al equipo de ingreso cuando llegues al evento.</p></article></div>
    <div v-if="checkoutOpen" class="modal-backdrop" @click.self="closeCheckout"><form v-modal="closeCheckout" class="checkout-modal reservation-form" aria-labelledby="reservation-title" @submit.prevent="buyTickets">
      <button type="button" class="modal-close" :disabled="buying" aria-label="Cerrar reserva" @click="closeCheckout">×</button><div class="section-kicker">RESERVA TU LUGAR</div><h2 id="reservation-title">{{ freeEvent ? 'Reservar entradas gratis' : 'Registrar reserva de demostración' }}</h2>
      <p class="reservation-event">{{ eventDetail?.nombre }} · {{ eventDetail?.sede }}</p>
      <div class="info-callout"><b>{{ freeEvent ? 'Evento gratuito' : 'No se realizará ningún cobro' }}</b><p>{{ freeEvent ? 'Recibirás una entrada por asistente, sin elegir un medio de pago.' : 'Esta versión emite entradas de demostración. No solicita tarjeta ni confirma pagos por Yape o Plin.' }}</p></div>
      <label>Cantidad · máximo {{ checkoutLimit }} disponibles para esta reserva<select v-model.number="checkout.cantidad" :disabled="buying || !checkoutLimit" @change="resizeAttendees"><option v-for="n in checkoutLimit" :key="n" :value="n">{{ n }} {{ n === 1 ? 'entrada' : 'entradas' }}</option></select></label>
      <label v-if="!freeEvent">Medio de pago de referencia (sin cobro)<select v-model="checkout.metodoPago" :disabled="buying"><option>YAPE</option><option>PLIN</option><option>TARJETA</option></select></label>
      <button type="button" class="text-button" :disabled="buying" @click="useMyDetails">Yo asistiré: usar mis datos para la primera entrada</button>
      <fieldset v-for="(person,index) in checkout.asistentes" :key="index" class="attendee-fields" :disabled="buying"><legend>Asistente {{ index+1 }}</legend><label :for="'attendee-name-'+index">Nombre completo</label><input :id="'attendee-name-'+index" v-model="person.titularNombre" autocomplete="name" minlength="2" maxlength="80" required><label :for="'attendee-document-'+index">Documento del titular</label><select v-model="person.tipoDocumento" :aria-label="'Tipo de documento del asistente '+(index+1)"><option value="DNI">DNI peruano</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option></select><input :id="'attendee-document-'+index" v-model="person.titularDocumento" autocomplete="off" :inputmode="person.tipoDocumento === 'DNI' ? 'numeric' : 'text'" :minlength="person.tipoDocumento === 'DNI' ? 8 : 6" :maxlength="person.tipoDocumento === 'DNI' ? 8 : 20" :pattern="person.tipoDocumento === 'DNI' ? '[0-9]{8}' : '[A-Za-z0-9-]{6,20}'" :aria-invalid="person.documentTouched && Boolean(documentError(person.titularDocumento,person.tipoDocumento))" @blur="person.documentTouched=true" required><small v-if="person.documentTouched && documentError(person.titularDocumento,person.tipoDocumento)" class="form-error">{{ documentError(person.titularDocumento,person.tipoDocumento) }}</small><small>Usa el documento que presentarás en el ingreso. No repitas titulares.</small></fieldset>
      <div v-if="checkoutError" class="form-error" role="alert">{{ checkoutError }}</div>
      <div v-if="checkout.cantidad > checkoutLimit || !checkoutLimit" class="form-error" role="alert">La disponibilidad cambió. {{ checkoutLimit ? 'Selecciona una cantidad menor.' : 'Ya no quedan entradas para este evento.' }}</div>
      <p class="checkout-total">Total de referencia: {{ freeEvent ? 'Gratis' : 'S/ ' + (Number(eventDetail?.precio || 0) * checkout.cantidad).toFixed(2) }}</p>
      <div class="dialog-actions"><button type="button" class="secondary-button" :disabled="buying" @click="closeCheckout">Volver al evento</button><button class="primary-button" :disabled="buying || !checkoutLimit || checkout.cantidad > checkoutLimit">{{ buying ? 'Registrando reserva…' : 'Confirmar reserva' }}</button></div>
    </form></div>
    <div v-if="message" class="toast" role="status">{{ message }}</div>
  </q-layout>
  <div v-if="showAuth && errorMessage" class="auth-error feedback-banner error-banner" role="alert"><p>{{ errorMessage }}</p><button class="text-button" @click="errorMessage=''">Cerrar aviso</button></div>
  <ActionDialog v-if="actionRequest" :request="actionRequest" @answer="answerDialog" />
</template>
