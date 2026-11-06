<script setup>
import { computed, toRefs } from 'vue'
import { statusLabel } from '../uiLogic'

const props = defineProps({
  isAdmin: Boolean,
  modPanel: { type: Object, default: null },
  modTab: { type: String, default: 'eventos' },
  modSearch: { type: String, default: '' },
  modStatus: { type: String, default: 'EN_REVISION' },
  modEvents: { type: Array, default: () => [] },
  reports: { type: Array, default: () => [] },
  users: { type: Array, default: () => [] },
  audit: { type: Array, default: () => [] },
  rules: { type: Array, default: () => [] },
  modEventDetail: { type: Object, default: null },
})
const { isAdmin, modPanel, modTab, modSearch, modStatus, modEvents, reports, users, audit, rules, modEventDetail } = toRefs(props)
const emit = defineEmits(['update:tab', 'update:search', 'update:status', 'load-tab', 'create-rule', 'export-audit', 'inspect-event', 'moderate', 'resolve-report', 'change-user', 'verify-user', 'toggle-rule'])
const modTabInput = computed({ get: () => props.modTab, set: value => emit('update:tab', value) })
const modSearchInput = computed({ get: () => props.modSearch, set: value => emit('update:search', value) })
const modStatusInput = computed({ get: () => props.modStatus, set: value => emit('update:status', value) })
const loadModTab = () => emit('load-tab')
const createRule = () => emit('create-rule')
const inspectModerationEvent = event => emit('inspect-event', event)
const moderate = event => emit('moderate', event)
const resolveReport = report => emit('resolve-report', report)
const changeUser = user => emit('change-user', user)
const verifyUser = user => emit('verify-user', user)
const toggleRule = rule => emit('toggle-rule', rule)
</script>

<template>
<section  class="page-view"><div v-if="!isAdmin" class="empty-state access-denied"><span>⌘</span><h3>Panel de administración</h3><p>Inicia sesión con una cuenta que tenga el rol ADMINISTRADOR.</p></div><template v-else><div class="page-title"><div><div class="section-kicker">CENTRO DE CONFIANZA</div><h1 tabindex="-1">Panel de <em>moderación.</em></h1><p>Eventos, reportes, cuentas y auditoría.</p></div></div><div v-if="modPanel" class="stats-grid mod-stats"><div><small>Usuarios activos</small><strong>{{ modPanel.usuariosActivos }}</strong></div><div><small>Eventos publicados</small><strong>{{ modPanel.eventosPublicados }}</strong></div><div><small>Revisiones pendientes</small><strong>{{ modPanel.revisionesPendientes }}</strong></div><div><small>Reportes pendientes</small><strong>{{ modPanel.reportesPendientes }}</strong></div><div><small>Cuentas suspendidas</small><strong>{{ modPanel.cuentasSuspendidas }}</strong></div><div><small>Auditoría</small><strong>{{ modPanel.auditoriaEstado }}</strong></div></div><div class="mod-tabs"><button v-for="tab in ['eventos','reportes','usuarios','auditoria','reglas']" :key="tab" :class="{ active: modTab === tab }" @click="modTab=tab">{{ tab }}</button></div><div class="panel-card"><div class="panel-head"><h2>{{ modTab[0].toUpperCase()+modTab.slice(1) }}</h2><div class="mod-controls"><input v-if="['eventos','usuarios'].includes(modTab)" v-model="modSearchInput" placeholder="Buscar" @keyup.enter="loadModTab"><select v-if="modTab==='eventos'" v-model="modStatusInput" @change="loadModTab"><option value="EN_REVISION">En revisión</option><option value="CONFORME">Aprobados</option><option value="DESACTIVADO">Suspendidos</option></select><button v-if="modTab==='eventos' || modTab==='usuarios'" class="secondary-button" @click="loadModTab">Aplicar</button><button v-if="modTab==='reglas'" class="secondary-button" @click="createRule">＋ Nueva regla</button><button v-if="modTab==='auditoria'" class="secondary-button" @click="$emit('export-audit')">Exportar CSV ↓</button></div></div><div v-if="modTab==='eventos'" class="data-table"><div v-for="event in modEvents" :key="event.eventoId" class="table-row"><div><b>{{ event.nombre }}</b><small>{{ event.organizadorNombre }} · {{ statusLabel(event.estadoModeracion) }}</small></div><span>{{ event.reportesPendientes }} reportes</span><div class="row-actions"><button @click="inspectModerationEvent(event)">Detalle</button><button @click="moderate(event)">{{ event.estadoModeracion==='CONFORME' ? 'Suspender' : 'Aprobar' }}</button></div></div><div v-if="!modEvents.length" class="empty-inline">No hay eventos para revisar.</div><div v-if="modEventDetail" class="mod-detail"><h3>{{ modEventDetail.nombre }}</h3><p>Organiza {{ modEventDetail.organizadorNombre }} · {{ modEventDetail.estadoModeracion }} · Aforo {{ modEventDetail.aforoTotal }} · Reportes activos {{ modEventDetail.reportesActivos }}</p><div v-for="report in modEventDetail.reportes" :key="report.reporteId" class="mod-report">{{ report.origen }} · {{ report.motivo }} <small>{{ statusLabel(report.estado) }}</small></div></div></div><div v-else-if="modTab==='reportes'" class="data-table"><div v-for="report in reports" :key="report.reporteId" class="table-row"><div><b>{{ report.eventoNombre }} · {{ report.origen }}</b><small>{{ report.motivo }} · {{ statusLabel(report.estado) }}</small></div><span>{{ new Date(report.fechaReporte).toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) }}</span><button v-if="report.estado==='PENDIENTE'" class="secondary-button" @click="resolveReport(report)">Resolver</button></div><div v-if="!reports.length" class="empty-inline">No hay reportes.</div></div><div v-else-if="modTab==='usuarios'" class="data-table"><div v-for="user in users" :key="user.usuarioId" class="table-row"><div><b>{{ user.nombre }}</b><small>{{ user.email }} · {{ statusLabel(user.estado) }}</small></div><span>{{ (user.roles || []).join(', ') }}</span><div class="row-actions"><button @click="changeUser(user)">Cambiar estado</button><button v-if="!user.verificado" @click="verifyUser(user)">Verificar</button></div></div><div v-if="!users.length" class="empty-inline">Sin resultados.</div></div><div v-else-if="modTab==='auditoria'" class="data-table"><div v-for="entry in audit" :key="entry.auditoriaId" class="table-row"><div><b>{{ entry.accion }}</b><small>{{ entry.actor }} · {{ entry.detalle }}</small></div><span>{{ new Date(entry.fecha).toLocaleString('es-PE', { timeZone: 'America/Lima' }) }}</span></div><div v-if="!audit.length" class="empty-inline">Sin registros.</div></div><div v-else class="data-table"><div v-for="rule in rules" :key="rule.reglaId" class="table-row"><div><b>{{ rule.nombre }} <small>({{ rule.tipo }})</small></b><small>{{ rule.criterio }} · Acción: {{ rule.accion }}</small></div><span>{{ rule.activa ? 'Activa' : 'Inactiva' }}</span><button class="secondary-button" @click="toggleRule(rule)">{{ rule.activa ? 'Desactivar' : 'Activar' }}</button></div><div v-if="!rules.length" class="empty-inline">No hay reglas creadas.</div></div></div></template></section>
</template>
