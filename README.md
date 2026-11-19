# Eventia Modern

Frontend de Eventia (EventosPeruIA – Ticket Inteligente) creado con Vue 3, Quasar y Vite. Se conecta a la API en ASP.NET Core, usa Firebase Authentication para el inicio de sesión y SignalR para actualizar los aforos en tiempo real.

## Puesta en marcha

No hay que crear ni copiar ningún archivo de configuración:

1. Levanta la API (`dotnet run --project EventosIAPeruAPI` en el repositorio del backend). Queda en `http://localhost:5295`.
2. Instala dependencias con `pnpm install`.
3. Inicia el frontend con `pnpm dev` y abre la dirección que muestra la consola.

El archivo `.env` del repositorio ya trae la dirección de la API y la configuración web de Firebase.

### ¿Por qué `.env` está en el repositorio?

Los valores `VITE_FIREBASE_*` son la configuración **pública** del cliente web de Firebase: viajan en el JavaScript que descarga cualquier navegador y no dan acceso a nada por sí solos. Lo que protege la plataforma es que la API valida el token de cada sesión y decide los permisos en el servidor.

Aquí **nunca** deben ir secretos (contraseñas de base de datos, API keys de IA): todo lo que empieza con `VITE_` termina visible en el navegador.

Si necesitas otros valores solo en tu máquina (por ejemplo, otra dirección de la API), crea un archivo `.env.local`; tiene prioridad sobre `.env` y no se sube.

| Variable | Para qué sirve |
|---|---|
| `VITE_API_BASE_URL` | Prefijo de la API que usa el navegador (`/api` en desarrollo). |
| `VITE_API_PROXY_TARGET` | Dónde corre la API en desarrollo; Vite reenvía `/api` y `/hubs` a esa dirección. |
| `VITE_FIREBASE_*` | Proyecto de Firebase Authentication (correo y contraseña). |

## Cuentas y verificación de correo

- Al registrarse, Firebase envía un correo de verificación.
- La API identifica cada cuenta por su UID de Firebase. Un correo que **ya tenía un perfil** en la plataforma (por ejemplo, un usuario creado por script) solo se vincula cuando ese correo está verificado; en ese caso la pantalla muestra el aviso con los botones **Reintentar** y **Reenviar correo de verificación**.
- Las cuentas nuevas no necesitan verificar el correo para empezar a usar la plataforma.

## Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo. |
| `pnpm build` | Genera el sitio estático en `dist/`. |
| `pnpm test` | Pruebas de la lógica (acceso el día del evento, edición, QR, cupos). |

## Publicación

`pnpm build` genera un frontend estático en `dist/`. En producción, `VITE_API_BASE_URL` debe apuntar a la API accesible desde el navegador y hay que agregar el dominio publicado en dos lugares: en `Cors:Origenes` de la API y en los dominios autorizados de Firebase Authentication.

El sitio usa rutas hash (por ejemplo `#/acceso`), que funcionan al servir `index.html` desde la raíz.

## Organización

- `src/App.vue`: estado de la aplicación, navegación y llamadas a la API.
- `src/pages/`: una vista por sección (explorar, detalle, entradas, reseñas, notificaciones, moderación, cuenta).
- `src/api.js` y `src/http.js`: cliente de la API; agrega el token de Firebase a cada petición.
- `src/authentication.js` y `src/firebase.js`: registro, inicio de sesión, recuperación de contraseña y verificación de correo.
- `src/EventAssistant.vue`: asistente con RAG; muestra las fuentes con su relevancia y los cupos en vivo.
- `src/aforo.js`: cupos en tiempo real con SignalR.
- `src/AccessControl.vue` y `src/QrDinamico.vue`: check-in con cámara y QR dinámico.
