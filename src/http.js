export async function ensureSuccess(response) {
  if (response.ok) return response
  let message = ({ 401: 'Tu sesión venció. Vuelve a ingresar para continuar.', 403: 'Tu cuenta no tiene permiso para esta acción.', 404: 'No encontramos este recurso. Actualiza la página o vuelve a explorar.', 429: 'Hay demasiados intentos. Espera un momento y vuelve a intentar.' })[response.status] || 'El servicio no pudo completar la solicitud. Inténtalo de nuevo.'
  try {
    const body = await response.json()
    message = body.mensaje || body.message || (response.status < 500 && body.title) || message
    if (body.errors) message = Object.values(body.errors).flat().join(' ')
  } catch { /* La API puede responder sin un cuerpo JSON. */ }
  const error = new Error(message)
  error.status = response.status
  throw error
}

export async function jsonBody(response) {
  if (!response || response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}
