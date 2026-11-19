import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth'
import { auth } from './firebase'

/** Crea la identidad en Firebase y guarda el nombre para la sesión. */
export async function registerWithEmail({ email, password, nombre }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(credential.user, { displayName: nombre })
  // La verificación del correo permite vincular un perfil que ya existía en la plataforma.
  // Si el envío falla, la cuenta igual queda creada y se puede reenviar después.
  try { await sendEmailVerification(credential.user) } catch { /* El registro no depende del correo. */ }
  return credential.user
}

/** Inicia una sesión con el proveedor Email/Password de Firebase. */
export function loginWithEmail({ email, password }) {
  return signInWithEmailAndPassword(auth, email, password)
}

/** Reenvía el correo de verificación a la cuenta que tiene la sesión abierta. */
export function resendVerification() {
  return auth?.currentUser ? sendEmailVerification(auth.currentUser) : Promise.resolve()
}

/** Firebase devuelve siempre una respuesta genérica para evitar revelar cuentas existentes. */
export function requestPasswordReset(email) {
  return sendPasswordResetEmail(auth, email)
}

const firebaseErrors = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no tiene un formato válido.',
  'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Inicia sesión.',
  'auth/weak-password': 'La contraseña es muy débil.',
  'auth/password-does-not-meet-requirements': 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/network-request-failed': 'No hay conexión con el servicio de acceso.',
  'auth/missing-email': 'Escribe tu correo electrónico.',
}

/** Traduce errores del SDK a mensajes seguros y legibles en español. */
export function authenticationErrorMessage(error) {
  return error?.code?.startsWith('auth/')
    ? (firebaseErrors[error.code] || 'No se pudo completar el acceso. Inténtalo nuevamente.')
    : ''
}
