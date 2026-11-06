export const statusLabel = value => ({ AGOTADO: 'Agotado', FINALIZADO: 'Finalizado', EN_VENTA: 'Disponible', BORRADOR: 'Borrador', PUBLICADO: 'Publicado', ACTIVO: 'Activo', CANCELADO: 'Cancelado', EN_REVISION: 'En revisión', CONFORME: 'Aprobado', DESACTIVADO: 'Suspendido', VALIDA: 'Lista para ingresar', UTILIZADA: 'Ingreso registrado', ANULADA: 'Anulada', CONFIRMADA: 'Confirmada', ASISTENTE: 'Asistente', ORGANIZADOR: 'Organizador', ADMINISTRADOR: 'Administrador', GENERAL: 'General', BLOQUEADO: 'Bloqueado', INACTIVO: 'Inactivo', PENDIENTE: 'Pendiente' }[value] || value || 'Sin información')
export const purchaseLimit = event => Math.min(4, Math.max(0, Math.floor(Number(event?.cuposDisponibles) || 0)))
export function documentError(document, type = 'DNI') {
  const value = (document || '').trim().toUpperCase()
  if (type === 'DNI') return /^[0-9]{8}$/.test(value) ? '' : 'El DNI debe tener exactamente 8 dígitos.'
  return /^[A-Z0-9-]{6,20}$/.test(value) ? '' : 'Escribe entre 6 y 20 letras o números, sin espacios.'
}
export function attendeeError(people) {
  const documents = new Set()
  for (const [i, person] of people.entries()) {
    if (person.titularNombre.trim().length < 2) return `Asistente ${i + 1}: escribe su nombre completo.`
    const document = person.titularDocumento.trim().toUpperCase()
    const invalid = documentError(document, person.tipoDocumento)
    if (invalid) return `Asistente ${i + 1}: ${invalid}`
    if (documents.has(document)) return `El documento del asistente ${i + 1} ya está en esta reserva.`
    documents.add(document)
  }
  return ''
}

// Peru uses UTC-05 throughout the year. A datetime-local must not inherit the visitor's timezone.
export function peruInputISO(value) { return new Date(`${value}-05:00`).toISOString() }
export function peruInputValue(value) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value)).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
