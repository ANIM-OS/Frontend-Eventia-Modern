# Eventia Modern

Frontend independiente de Eventia creado con Vue 3, Quasar y Vite. Conserva la integración con la API, autenticación Firebase opcional y SignalR para actualizar aforos en tiempo real.

## Desarrollo

1. Copia `.env.example` a `.env.local` y configura `VITE_API_PROXY_TARGET` y las variables de Firebase.
2. Instala dependencias con `pnpm install`.
3. Inicia el servidor con `pnpm dev`.
4. Genera el bundle de producción con `pnpm build`.

## Publicación

Este proyecto genera un frontend estático en `dist/`. Configura las mismas variables `VITE_*` en el entorno de compilación de tu proveedor y publica el contenido de esa carpeta. `VITE_API_BASE_URL` debe apuntar a la API accesible desde el navegador en producción; `VITE_API_PROXY_TARGET` solo se usa como destino del proxy de desarrollo de Vite.

Para habilitar el inicio de sesión y el registro, configura `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` y `VITE_FIREBASE_APP_ID`. En Firebase Console, habilita el proveedor Email/Password y agrega el dominio publicado a los dominios autorizados de Authentication. Estas variables identifican el proyecto cliente de Firebase; las reglas y permisos de la API deben seguir validando cada sesión mediante el token de Firebase.

El sitio usa rutas hash (por ejemplo `#/acceso`), que funcionan al servir `index.html` desde la raíz. Si se publica bajo un subdirectorio, ajusta la base de Vite y la configuración del servidor para servir los assets desde ese prefijo.

## Organización de autenticación

- `src/Login.vue` presenta el formulario de inicio de sesión y recuperación de contraseña.
- `src/Register.vue` presenta los datos de registro y valida visualmente los requisitos de contraseña.
- `src/authentication.js` concentra las operaciones Firebase y la traducción de errores de autenticación.
- `src/firebase.js` inicializa Firebase Authentication solo cuando están configuradas todas las variables necesarias.
- `src/App.vue` conserva la ruta `#/acceso`, la sesión y la coordinación con la creación del perfil de Eventia.

## Organización de vistas

Las pantallas principales viven en `src/pages/`: cartelera, detalle del evento, ayuda, entradas, control de acceso, cuenta, reseñas, notificaciones y moderación. Cada vista recibe sus datos por propiedades y comunica acciones al componente principal mediante eventos. `src/EventForm.vue` mantiene separado el formulario de creación y edición de eventos. `src/App.vue` conserva la coordinación de rutas, sesión y carga de datos. Los controles compartidos (tarjetas, QR, aforo y diálogos) permanecen en componentes independientes en `src/`.

## Funciones

- Búsqueda de eventos con filtros, categorías, páginas, recomendaciones y asistente conversacional.
- Detalle de evento, reseñas, reportes y reservas con una o varias entradas.
- Inicio y registro de sesión, perfil, intereses y cambio de rol.
- Entradas con código QR dinámico y compartir evento.
- Panel de organizador, creación y edición de eventos, publicación, cancelación, ventas y exportaciones.
- Control de acceso por cámara, foto, imagen o validación manual.
- Notificaciones, reseñas pendientes y publicadas.
- Moderación de eventos y reportes, gestión de usuarios, auditoría y reglas.

El logo de Eventia se conserva en `public/brand`. El proyecto no copia credenciales locales; usa el `.env.example` como plantilla.
