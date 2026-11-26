<script setup>
import { computed, toRefs } from 'vue'
import { statusLabel } from '../uiLogic'
import { modal as vModal } from '../modal'

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
const validationLabel = (value) => value === true ? 'validado' : value === false ? 'no validado' : 'pendiente'
const emit = defineEmits(['update:tab', 'update:search', 'update:status', 'load-tab', 'create-rule', 'export-audit', 'inspect-event', 'moderate', 'close-detail', 'resolve-report', 'change-user', 'verify-user', 'make-admin', 'toggle-rule'])
const modTabInput = computed({ get: () => props.modTab, set: value => emit('update:tab', value) })
const modSearchInput = computed({ get: () => props.modSearch, set: value => emit('update:search', value) })
const modStatusInput = computed({ get: () => props.modStatus, set: value => emit('update:status', value) })
const loadModTab = () => emit('load-tab')
const createRule = () => emit('create-rule')
const inspectModerationEvent = event => emit('inspect-event', event)
const moderate = (event, decision) => emit('moderate', event, decision)
const closeDetail = () => emit('close-detail')
const rowStatus = value => ({ EN_REVISION: 'Pendiente de aprobación', CONFORME: 'Aprobado', DESACTIVADO: 'Rechazado o suspendido' }[value] || statusLabel(value))
const moderationLabel = value => ({ EN_REVISION: 'PENDIENTE DE APROBACIÓN', CONFORME: 'APROBADO', DESACTIVADO: 'RECHAZADO O SUSPENDIDO' }[value] || value)
const formatDate = value => value ? new Date(value).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'full', timeStyle: 'short' }) : ''
const formatTime = value => value ? new Date(value).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }) : ''
const resolveReport = report => emit('resolve-report', report)
const changeUser = user => emit('change-user', user)
const verifyUser = user => emit('verify-user', user)
const makeAdmin = user => emit('make-admin', user)
const toggleRule = rule => emit('toggle-rule', rule)
</script>

<template>
<section  class="page-view"><div v-if="!isAdmin" class="empty-state access-denied"><span>⌘</span><h3>Panel de administración</h3><p>Inicia sesión con una cuenta que tenga el rol ADMINISTRADOR.</p></div><template v-else><div class="page-title"><div><div class="section-kicker">CENTRO DE CONFIANZA</div><h1 tabindex="-1">Panel de <em>moderación.</em></h1><p>Eventos, reportes, cuentas y auditoría.</p></div></div><div v-if="modPanel" class="stats-grid mod-stats"><div><small>Usuarios activos</small><strong>{{ modPanel.usuariosActivos }}</strong></div><div><small>Eventos publicados</small><strong>{{ modPanel.eventosPublicados }}</strong></div><div><small>Revisiones pendientes</small><strong>{{ modPanel.revisionesPendientes }}</strong></div><div><small>Reportes pendientes</small><strong>{{ modPanel.reportesPendientes }}</strong></div><div><small>Cuentas suspendidas</small><strong>{{ modPanel.cuentasSuspendidas }}</strong></div><div><small>Auditoría</small><strong>{{ modPanel.auditoriaEstado }}</strong></div></div><div class="mod-tabs"><button v-for="tab in ['eventos','reportes','usuarios','auditoria','reglas']" :key="tab" :class="{ active: modTab === tab }" @click="modTabInput=tab">{{ tab }}</button></div><div class="panel-card"><div class="panel-head"><h2>{{ modTab[0].toUpperCase()+modTab.slice(1) }}</h2><div class="mod-controls"><input v-if="['eventos','usuarios'].includes(modTab)" v-model="modSearchInput" placeholder="Buscar" @keyup.enter="loadModTab"><select v-if="modTab==='eventos'" v-model="modStatusInput" @change="loadModTab"><option value="EN_REVISION">Pendientes de aprobación</option><option value="CONFORME">Aprobados</option><option value="DESACTIVADO">Suspendidos</option></select><button v-if="modTab==='eventos' || modTab==='usuarios'" class="secondary-button" @click="loadModTab">Aplicar</button><button v-if="modTab==='reglas'" class="secondary-button" @click="createRule">＋ Nueva regla</button><button v-if="modTab==='auditoria'" class="secondary-button" @click="$emit('export-audit')">Exportar CSV ↓</button></div></div><div v-if="modTab==='eventos'" class="data-table"><div v-for="event in modEvents" :key="event.eventoId" class="table-row"><div><b>{{ event.nombre }}</b><small>{{ event.organizadorNombre }} · {{ rowStatus(event.estadoModeracion) }}</small></div><span>{{ event.reportesPendientes }} reportes</span><div class="row-actions"><button @click="inspectModerationEvent(event)">Revisar</button><template v-if="event.estadoModeracion==='EN_REVISION'"><button class="approve-button" @click="moderate(event,'CONFORME')">Aprobar</button><button class="reject-button" @click="moderate(event,'DESACTIVADO')">Rechazar</button></template><button v-else-if="event.estadoModeracion==='CONFORME'" class="reject-button" @click="moderate(event,'DESACTIVADO')">Suspender</button><button v-else class="approve-button" @click="moderate(event,'CONFORME')">Reactivar</button></div></div><div v-if="!modEvents.length" class="empty-inline">No hay eventos para revisar.</div></div><div v-else-if="modTab==='reportes'" class="data-table"><div v-for="report in reports" :key="report.reporteId" class="table-row"><div><b>{{ report.eventoNombre }} · {{ report.origen }}</b><small>{{ report.motivo }} · {{ statusLabel(report.estado) }}</small></div><span>{{ new Date(report.fechaReporte).toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) }}</span><button v-if="report.estado==='PENDIENTE'" class="secondary-button" @click="resolveReport(report)">Resolver</button></div><div v-if="!reports.length" class="empty-inline">No hay reportes.</div></div><div v-else-if="modTab==='usuarios'" class="data-table"><div v-for="user in users" :key="user.usuarioId" class="table-row"><div><b>{{ user.nombre }}</b><small>{{ user.email }} · {{ statusLabel(user.estado) }}</small></div><span>{{ (user.roles || []).join(', ') }}</span><div class="row-actions"><button @click="changeUser(user)">Cambiar estado</button><button v-if="!user.verificado" @click="verifyUser(user)">Verificar</button><button v-if="user.estado === 'ACTIVO' && !(user.roles || []).includes('ADMINISTRADOR')" @click="makeAdmin(user)">Hacer admin</button></div></div><div v-if="!users.length" class="empty-inline">Sin resultados.</div></div><div v-else-if="modTab==='auditoria'" class="data-table"><div v-for="entry in audit" :key="entry.auditoriaId" class="table-row"><div><b>{{ entry.accion }}</b><small>{{ entry.actor }} · {{ entry.detalle }}</small></div><span>{{ new Date(entry.fecha).toLocaleString('es-PE', { timeZone: 'America/Lima' }) }}</span></div><div v-if="!audit.length" class="empty-inline">Sin registros.</div></div><div v-else class="data-table"><div v-for="rule in rules" :key="rule.reglaId" class="table-row"><div><b>{{ rule.nombre }} <small>({{ rule.tipo }})</small></b><small>{{ rule.criterio }} · Acción: {{ rule.accion }}</small></div><span>{{ rule.activa ? 'Activa' : 'Inactiva' }}</span><button class="secondary-button" @click="toggleRule(rule)">{{ rule.activa ? 'Desactivar' : 'Activar' }}</button></div><div v-if="!rules.length" class="empty-inline">No hay reglas creadas.</div></div></div></template><div v-if="modEventDetail" class="modal-backdrop" @click.self="closeDetail"><article v-modal="closeDetail" class="event-modal mod-modal" aria-labelledby="mod-modal-title">
  <button type="button" class="modal-close" aria-label="Cerrar" @click="closeDetail">×</button>
  <img v-if="modEventDetail.imagenUrl" class="mod-modal-image" :src="modEventDetail.imagenUrl" alt="" @error="$event.target.style.display='none'">
  <div class="mod-modal-body">
    <div class="section-kicker">{{ modEventDetail.categoriaNombre || 'EVENTO' }} · {{ moderationLabel(modEventDetail.estadoModeracion) }}</div>
    <h2 id="mod-modal-title">{{ modEventDetail.nombre }}</h2>
    <p class="mod-modal-org">Organiza <b>{{ modEventDetail.organizadorNombre }}</b></p>
    <dl class="mod-modal-facts">
      <div><dt>Fecha</dt><dd>{{ formatDate(modEventDetail.fechaInicio) }} – {{ formatTime(modEventDetail.fechaFin) }}</dd></div>
      <div><dt>Lugar</dt><dd>{{ [modEventDetail.sede, modEventDetail.direccion, modEventDetail.distrito || modEventDetail.provincia].filter(Boolean).join(' · ') }}</dd></div>
      <div><dt>Precio</dt><dd>{{ Number(modEventDetail.precio) === 0 ? 'Gratis' : 'S/ ' + Number(modEventDetail.precio).toFixed(2) }}</dd></div>
      <div><dt>Aforo</dt><dd>{{ modEventDetail.aforoTotal }} personas</dd></div>
      <div><dt>SUNAT</dt><dd>{{ validationLabel(modEventDetail.validacionSunat) }}</dd></div>
      <div><dt>Licencia municipal</dt><dd>{{ validationLabel(modEventDetail.validacionMunicipal) }}</dd></div>
    </dl>
    <p v-if="modEventDetail.descripcion" class="mod-modal-description">{{ modEventDetail.descripcion }}</p>
    <p v-if="modEventDetail.motivoModeracion" class="info-callout"><b>Última decisión:</b> {{ modEventDetail.motivoModeracion }}</p>
    <div v-if="modEventDetail.reportes?.length" class="mod-modal-reports"><h3>Reportes ({{ modEventDetail.reportesActivos }} pendientes)</h3><div v-for="report in modEventDetail.reportes" :key="report.reporteId" class="mod-report"><b>{{ report.origen === 'IA' ? 'IA' : report.origen === 'SISTEMA' ? 'Regla automática' : 'Usuario' }}</b> · {{ report.motivo }} <small>{{ statusLabel(report.estado) }}</small></div></div>
    <p v-else class="mod-modal-ok">Sin reportes: las reglas automáticas no encontraron problemas.</p>
  </div>
  <div class="dialog-actions mod-modal-actions">
    <button type="button" class="secondary-button" @click="closeDetail">Cerrar</button>
    <template v-if="modEventDetail.estadoModeracion === 'EN_REVISION'"><button type="button" class="secondary-button reject-button" @click="moderate(modEventDetail,'DESACTIVADO')">Rechazar</button><button type="button" class="primary-button" @click="moderate(modEventDetail,'CONFORME')">Aprobar y publicar</button></template>
    <button v-else-if="modEventDetail.estadoModeracion === 'CONFORME'" type="button" class="secondary-button reject-button" @click="moderate(modEventDetail,'DESACTIVADO')">Suspender</button>
    <button v-else type="button" class="primary-button" @click="moderate(modEventDetail,'CONFORME')">Reactivar</button>
  </div>
</article></div>
</section>
</template>
