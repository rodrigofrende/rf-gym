# GymOS — Management de gimnasios (multi-tenant)

Web app para administrar uno o varios gimnasios / centros de entrenamiento.
Login con email o Google, selección de gimnasio (tenant), y dos roles con vistas
distintas y protegidas: **administrador** y **socio**.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (tokens de marca en `src/index.css`) + lucide-react
- Firebase Auth + Firestore (con Security Rules)
- TanStack Query (cache) + React Context (auth / tenant / toasts)
- react-router-dom (rutas protegidas por rol) + react-hook-form + zod
- PNPM 11+ (forzado vía `preinstall`)

## Puesta en marcha

1. **Instalar deps**: `pnpm install`
2. **Firebase**: creá un proyecto en console.firebase.google.com, habilitá
   **Authentication** (Email/Password + Google) y **Firestore**.
3. **Variables**: copiá `.env.example` a `.env.local` y completá los `VITE_FIREBASE_*`.
4. **Dev**: `pnpm dev` (puerto 3000).
5. **Build**: `pnpm build` · **Lint**: `pnpm lint`

### Desarrollo con emuladores (recomendado)

Para no tocar datos reales:

```bash
firebase emulators:start            # Auth :9099, Firestore :8080
```

Poné `VITE_USE_FIREBASE_EMULATOR=true` en `.env.local` y la app se conecta sola.

## Modelo de datos (Firestore)

```
users/{uid}                                  perfil global mínimo
gyms/{gymId}                                  { name, logoURL, ownerUid, adminUids: [uid] }
gyms/{gymId}/members/{memberId}              membresía: datos personales + negocio + role + uid + email
gyms/{gymId}/members/{memberId}/notes/{id}   ⚠️ notas privadas del admin (el socio NO las ve)
gyms/{gymId}/members/{memberId}/logs/{id}    cargas registradas por el socio
gyms/{gymId}/routines/{routineId}            rutina con lista de ejercicios
gyms/{gymId}/assignments/{id}                rutina ↔ socio
gyms/{gymId}/stats/summary                   métricas agregadas (cache del panel)
```

### Alta de socios (invite + claim)

El admin crea el socio con su **email** (queda con `uid: ''` = invitación pendiente).
Cuando esa persona inicia sesión con el mismo email, la app **reclama**
automáticamente la invitación y enlaza su `uid` (ver `claimPendingMemberships`).

### Privacidad de las notas (doble barrera)

1. **UI**: el lado del socio nunca importa `NotesTab` ni los hooks de notas.
2. **Security Rules**: `members/{id}/notes/**` solo permite lectura/escritura a un
   admin del gym — aunque alguien intente leerlas por la API SDK, falla.

## Bootstrapping del primer gym + admin

Las reglas determinan "soy admin" mirando `gyms/{gymId}.adminUids`. El primer
admin se siembra una vez a mano (consola de Firestore o emulador):

1. Registrate en la app con tu email (crea `users/{tuUid}`). Copiá tu `uid` desde
   Authentication.
2. Creá el doc `gyms/{gymId}` con:
   ```json
   { "name": "Mi Gimnasio", "ownerUid": "<tuUid>", "adminUids": ["<tuUid>"] }
   ```
3. Creá el doc `gyms/{gymId}/members/<tuUid>` con:
   ```json
   { "uid": "<tuUid>", "email": "<tuEmail>", "role": "admin",
     "fullName": "Tu Nombre", "status": "active" }
   ```
4. Volvé a entrar: vas a ver el panel de admin. Desde ahí cargás socios y rutinas.

> Para promover a otro admin, agregá su `uid` a `adminUids` (una vez que reclamó su
> membresía) y poné `role: admin` en su doc de member.

## Deploy de reglas e índices

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

`firestore.indexes.json` ya incluye los índices compuestos necesarios (claim por
email+uid, asignaciones por socio, logs por ejercicio).

## Estructura

```
src/
├── components/ui        UI kit reutilizable (Button, Modal, Table, Card, ...)
├── components/layout    Sidebar, AppLayout, TenantSwitcher (responsive)
├── components/shared    InfoGrid y otros compartidos
├── providers            AuthProvider, TenantProvider, ToastProvider
├── routes               AppRoutes, PrivateRoute (guard por rol), routePaths
├── services             acceso a Firestore (helpers genéricos + por entidad)
├── hooks                data hooks con TanStack Query + queryKeys
├── features
│   ├── auth · tenant-select
│   ├── admin/{dashboard,members,routines}
│   └── member/{profile,routines}
├── types · utils · config · lib/firebase.ts
```
