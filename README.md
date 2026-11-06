# TaskBoard

API REST para gestionar un tablero Kanban de tickets de desarrollo. Está construida con Node.js, TypeScript, Express, Sequelize y PostgreSQL.

## Estado

El MVP de la API está implementado: salud, registro/login, usuarios y roles, CRUD de tickets, permisos, búsqueda/filtros, migraciones y pruebas con PostgreSQL aislado. La API está cubierta por pruebas automatizadas. La colección **TaskBoard API** también existe en Thunder Client para probar solicitudes desde VS Code.

Quedan fuera del alcance actual los tableros múltiples, proyectos, comentarios, adjuntos, notificaciones y la integración real con GitHub.

## Requisitos e instalación

- Node.js 20 o superior y npm.
- PostgreSQL disponible localmente.
- Dos bases de datos: `taskboard` para desarrollo y `taskboard_test` para pruebas. Pueden tener otros nombres, pero la URL de pruebas debe terminar en `_test` y no puede apuntar a la base de desarrollo.

1. Cloná el repositorio e instalá las dependencias:

   ```bash
   npm install
   ```

2. Creá las dos bases PostgreSQL desde pgAdmin o `psql`. Asegurate de que el usuario de la conexión pueda crear y modificar tablas.
3. Copiá `.env.example` a `.env` (`Copy-Item .env.example .env` en PowerShell o `cp .env.example .env` en Bash) y completá las variables de entorno de la tabla siguiente. Reemplazá todos los ejemplos por valores locales; no subas ni compartas `.env`.
4. Verificá la conexión y aplicá las migraciones:

   ```bash
   npm run db:check
   npm run db:migrate
   ```

5. Opcionalmente, creá la cuenta de administrador y arrancá el servidor:

   ```bash
   npm run db:seed:admin
   npm run dev
   ```

El servidor escucha en `http://localhost:3000` por defecto, espera que PostgreSQL esté disponible antes de iniciar y cierra Sequelize al recibir `SIGINT` o `SIGTERM`.

## Variables de entorno

| Variable            | Requerida                               | Descripción                                                                                                                                                                     |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`              | No                                      | Puerto HTTP; por defecto `3000`.                                                                                                                                                |
| `DATABASE_URL`      | Sí para servidor y migraciones normales | URL PostgreSQL de desarrollo, por ejemplo `postgres://USUARIO:CONTRASENA@localhost:5432/taskboard`. Codificá caracteres especiales de usuario/contraseña como parte de una URL. |
| `DATABASE_URL_TEST` | Para pruebas y migraciones de test      | URL PostgreSQL exclusiva de pruebas. El nombre de la base debe terminar en `_test`, por ejemplo `taskboard_test`, y diferir de `DATABASE_URL`.                                  |
| `JWT_SECRET`        | Sí para iniciar el servidor             | Clave privada para firmar JWT. Usá una cadena aleatoria y larga; no la incluyas en el repositorio.                                                                              |
| `JWT_EXPIRES_IN`    | Sí para iniciar el servidor             | Duración del token aceptada por `jsonwebtoken`, por ejemplo `1h`.                                                                                                               |
| `ADMIN_EMAIL`       | Solo para crear/revertir el seed        | Email de la cuenta administradora inicial.                                                                                                                                      |
| `ADMIN_PASSWORD`    | Solo para crear el seed                 | Contraseña inicial; el seed guarda únicamente su hash bcrypt.                                                                                                                   |
| `NODE_ENV`          | No                                      | Está en `.env.example`; el código actual no cambia su comportamiento según esta variable.                                                                                       |

`npm run db:check` valida solo `DATABASE_URL`; el servidor también necesita `JWT_SECRET` y `JWT_EXPIRES_IN`. Las pruebas requieren `DATABASE_URL_TEST`. Antes de ejecutar `npm test` o `npm run test:coverage`, el proyecto comprueba que la URL de pruebas es independiente y que el nombre termina en `_test`; luego migra esa base y ejecuta la suite. La integración limpia las tablas de prueba entre casos. **Nunca configures `DATABASE_URL_TEST` con la base de desarrollo.**

## Migraciones y administrador inicial

Las migraciones crean `users` y `tickets`, sus relaciones, índices y los campos requeridos. Aplican únicamente cambios pendientes; no hace falta editar una migración ya aplicada para cambiar el esquema: agregá una migración nueva.

| Comando                        | Efecto                                                          |
| ------------------------------ | --------------------------------------------------------------- |
| `npm run db:migrate`           | Aplica migraciones pendientes en `DATABASE_URL`.                |
| `npm run db:migrate:undo`      | Revierte la última migración aplicada en la base de desarrollo. |
| `npm run db:test:migrate`      | Aplica migraciones en `DATABASE_URL_TEST`.                      |
| `npm run db:test:migrate:undo` | Revierte la última migración de la base de pruebas.             |

El seed de administrador es explícito y no se ejecuta al iniciar la API. Para usarlo, completá `ADMIN_EMAIL` y `ADMIN_PASSWORD`, aplicá primero las migraciones y ejecutá:

```bash
npm run db:seed:admin
```

El seed normaliza el email a minúsculas, valida su formato, hashea la contraseña con bcrypt y crea el usuario solo si el email todavía no existe. Si ya existe, se detiene sin modificar la cuenta. Para eliminar esa cuenta mediante la reversión, definí `ADMIN_EMAIL` y ejecutá `npm run db:seed:admin:undo`. Protegé las credenciales y verificá que las variables apunten a la base correcta antes de ejecutar cualquiera de estos comandos.

## Comandos del proyecto

| Comando                                   | Uso                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                             | Servidor de desarrollo con recarga.                                   |
| `npm run build`                           | Compila `src/` en `dist/`.                                            |
| `npm start`                               | Ejecuta la compilación de producción.                                 |
| `npm run db:check`                        | Comprueba la conexión de desarrollo.                                  |
| `npm test`                                | Protege la base de pruebas, aplica migraciones y ejecuta las pruebas. |
| `npm run test:coverage`                   | Ejecuta las pruebas con cobertura en la base aislada.                 |
| `npm run lint`                            | Analiza TypeScript y JavaScript con ESLint.                           |
| `npm run format` / `npm run format:check` | Aplica o verifica el formato con Prettier.                            |
| `npm run typecheck`                       | Comprueba tipos de código y pruebas sin emitir archivos.              |
| `npm run check`                           | Ejecuta lint, formato, tipos, build y pruebas.                        |

## API

Los cuerpos de solicitud deben enviarse como JSON; las respuestas, incluidos los errores, también son JSON. Las rutas bajo `/api/users` y `/api/tickets` requieren:

```http
Authorization: Bearer <token>
```

El token se obtiene en `POST /api/auth/login`. El registro público siempre asigna el rol `developer`; el cliente no puede elegir el rol. Los únicos roles son `admin` y `developer`.

### Errores comunes

Todos los errores usan esta estructura, sin stack trace ni detalles internos:

```json
{
  "error": {
    "code": "CODIGO",
    "message": "Descripción del error"
  }
}
```

| HTTP  | Código habitual                                                                                                                                         | Cuándo ocurre                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `400` | `JSON_INVALIDO`                                                                                                                                         | El cuerpo no contiene JSON válido.                            |
| `400` | `VALIDACION_REGISTRO`, `VALIDACION_LOGIN`, `EMAIL_INVALIDO`, `VALIDACION_TICKET`, `BUSQUEDA_INVALIDA`, `FILTRO_INVALIDO`, `ID_INVALIDO`, `ROL_INVALIDO` | Campos, query params, ID o rol con formato/valor inválido.    |
| `401` | `TOKEN_REQUERIDO`                                                                                                                                       | Falta el token Bearer en una ruta protegida.                  |
| `401` | `TOKEN_INVALIDO`                                                                                                                                        | Token inválido, vencido o usuario del token inexistente.      |
| `401` | `CREDENCIALES_INVALIDAS`                                                                                                                                | Email o contraseña de login incorrectos.                      |
| `403` | `PERMISO_DENEGADO`                                                                                                                                      | El usuario autenticado no puede realizar la operación.        |
| `404` | `USUARIO_NO_ENCONTRADO`, `TICKET_NO_ENCONTRADO`                                                                                                         | El recurso solicitado no existe.                              |
| `404` | `RUTA_NO_ENCONTRADA`                                                                                                                                    | No existe el método/ruta solicitado.                          |
| `500` | `ERROR_INTERNO`                                                                                                                                         | Ocurrió un error inesperado; no se exponen detalles internos. |

### Respuestas de usuario

Los endpoints de usuarios devuelven datos públicos; nunca incluyen `passwordHash`.

```json
{
  "id": 12,
  "name": "Julia Pérez",
  "email": "julia@example.com",
  "role": "developer"
}
```

El registro también incluye `createdAt` y `updatedAt` en formato ISO 8601.

### Respuestas de ticket

Los endpoints de tickets devuelven el ticket completo. `completed` se deriva del estado y `alert` vale `true` cuando `dueDate` ya pasó y el estado no es `completed`. Las fechas `createdAt` y `updatedAt` son ISO 8601; `dueDate` es `YYYY-MM-DD`.

```json
{
  "id": 31,
  "title": "Implementar búsqueda de tickets",
  "description": "Buscar por título y descripción",
  "type": "feature",
  "priority": "high",
  "status": "pending",
  "dueDate": "2099-01-15",
  "createdById": 12,
  "assigneeId": null,
  "branchType": "feature",
  "branchName": "feature/implementar-busqueda-de-tickets",
  "commitType": "feat",
  "commitScope": null,
  "commitDescription": "Implementar búsqueda de tickets",
  "createdAt": "2026-11-06T12:00:00.000Z",
  "updatedAt": "2026-11-06T12:00:00.000Z",
  "completed": false,
  "alert": false
}
```

Los valores permitidos son:

- `type`: `feature`, `bug`, `task`.
- `priority`: `low`, `medium`, `high`, `urgent`.
- `status`: `pending`, `in_progress`, `in_review`, `completed`, `blocked`.
- `branchType`: `feature`, `bugfix`, `hotfix`, `release`, `chore`.
- `commitType`: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `perf`, `chore`.

Al crear un ticket son obligatorios `title`, `type`, `priority`, `status` y `dueDate`. `description`, `assigneeId`, `branchType`, `branchName`, `commitType`, `commitScope` y `commitDescription` son opcionales; los campos editables que admiten ausencia de valor pueden enviarse como `null`. El título admite hasta 200 caracteres, la descripción 10.000, la rama 255, el scope 100 y la descripción del commit 255. Si se omiten sugerencias al crear, la API las calcula según el tipo y título. Al editar, cambiar el título no las regenera; para eso existe un endpoint explícito.

### Salud

#### `GET /health`

No requiere autenticación ni cuerpo.

- `200 OK`: `{"status":"ok"}`.

### Autenticación

#### `POST /api/auth/register`

Solicitud:

```json
{
  "name": "Julia Pérez",
  "email": "julia@example.com",
  "password": "reemplazar-por-una-clave-de-prueba"
}
```

`name`, `email` y `password` son obligatorios. El email se recorta, valida y normaliza a minúsculas. Cualquier campo `role` enviado por el cliente se ignora: el alta es siempre `developer`.

- `201 Created`: objeto de usuario público, con `id`, `name`, `email`, `role`, `createdAt` y `updatedAt`.
- `400 Bad Request`: `VALIDACION_REGISTRO`, `EMAIL_INVALIDO` o `EMAIL_DUPLICADO`.

#### `POST /api/auth/login`

Solicitud:

```json
{
  "email": "julia@example.com",
  "password": "reemplazar-por-la-clave-de-prueba"
}
```

- `200 OK`: `{"token":"<JWT>"}`.
- `400 Bad Request`: `VALIDACION_LOGIN` o `EMAIL_INVALIDO`.
- `401 Unauthorized`: `CREDENCIALES_INVALIDAS`; el mensaje es el mismo si el email no existe o la contraseña es incorrecta.

### Usuarios

#### `GET /api/users`

No lleva cuerpo. Cualquier usuario autenticado puede listar usuarios.

- `200 OK`: array de objetos públicos de usuario; no incluye contraseñas ni hashes.
- `401 Unauthorized`: token faltante o inválido.

#### `PATCH /api/users/:id/role`

Solo un administrador puede cambiar roles. El ID debe ser entero positivo.

Solicitud:

```json
{
  "role": "developer"
}
```

- `200 OK`: objeto de usuario público actualizado.
- `400 Bad Request`: `ID_INVALIDO` o `ROL_INVALIDO` (`admin` o `developer`).
- `401 Unauthorized`: token faltante o inválido.
- `403 Forbidden`: `PERMISO_DENEGADO` para un developer.
- `404 Not Found`: `USUARIO_NO_ENCONTRADO`.

### Tickets

#### `GET /api/tickets`

No lleva cuerpo. Los parámetros de consulta son opcionales y se combinan con AND:

| Parámetro    | Valores/uso                                                                            |
| ------------ | -------------------------------------------------------------------------------------- |
| `search`     | Busca sin distinguir mayúsculas en título y descripción; hasta 200 caracteres.         |
| `status`     | Uno de los estados permitidos.                                                         |
| `priority`   | `low`, `medium`, `high` o `urgent`.                                                    |
| `type`       | `feature`, `bug` o `task`.                                                             |
| `assigneeId` | ID entero positivo del responsable.                                                    |
| `mine`       | `true` devuelve tickets asignados al usuario del token; `false` desactiva este filtro. |
| `unassigned` | `true` devuelve tickets sin responsable; `false` desactiva este filtro.                |
| `groupBy`    | `status` devuelve un objeto con una lista por cada estado.                             |

Ejemplo:

```http
GET /api/tickets?search=busqueda&priority=high&assigneeId=12
```

- `200 OK`: array de tickets ordenado por ID; si se usa `groupBy=status`, devuelve `{ "pending": [], "in_progress": [], "in_review": [], "completed": [], "blocked": [] }` con los tickets agrupados.
- `400 Bad Request`: `BUSQUEDA_INVALIDA` o `FILTRO_INVALIDO`.
- `401 Unauthorized`: token faltante o inválido.

#### `GET /api/tickets/:id`

No lleva cuerpo; requiere ID entero positivo.

- `200 OK`: objeto de ticket.
- `400 Bad Request`: `ID_INVALIDO`.
- `401 Unauthorized`: token faltante o inválido.
- `404 Not Found`: `TICKET_NO_ENCONTRADO`.

#### `POST /api/tickets`

Requiere usuario autenticado. Cuerpo mínimo:

```json
{
  "title": "Implementar búsqueda de tickets",
  "type": "feature",
  "priority": "high",
  "status": "pending",
  "dueDate": "2099-01-15"
}
```

También acepta los campos opcionales de ticket indicados arriba, incluido `assigneeId` como ID positivo o `null`.

- `201 Created`: objeto de ticket completo, con sugerencias generadas si no se enviaron.
- `400 Bad Request`: `VALIDACION_TICKET`.
- `401 Unauthorized`: token faltante o inválido.

#### `PUT /api/tickets/:id`

Requiere autenticación e ID entero positivo. Acepta uno o más campos editables del ticket como actualización parcial; no se permite modificar `id`, `createdById`, `createdAt`, `updatedAt`, `completed` ni `alert`.

Ejemplo:

```json
{
  "title": "Refinar búsqueda de tickets",
  "priority": "urgent"
}
```

- `200 OK`: objeto de ticket actualizado. Cambiar `title` no cambia las sugerencias almacenadas.
- `400 Bad Request`: `ID_INVALIDO` o `VALIDACION_TICKET` (incluye cuerpo vacío o campos inválidos).
- `401 Unauthorized`: token faltante o inválido.
- `403 Forbidden`: `PERMISO_DENEGADO` si el developer no es autor ni responsable, intenta asignar a otra persona o cambia estado sin ser responsable ni tomar el ticket libre.
- `404 Not Found`: `TICKET_NO_ENCONTRADO`.

Un administrador puede editar cualquier ticket. Un developer puede editar tickets propios o asignados y puede autoasignarse un ticket sin responsable; no puede asignar arbitrariamente a otra persona.

#### `POST /api/tickets/:id/regenerate-suggestions`

Requiere autenticación e ID válido. No necesita cuerpo; recalcula rama y commit desde el tipo y título actuales.

- `200 OK`: objeto de ticket actualizado.
- `400 Bad Request`: `ID_INVALIDO`.
- `401 Unauthorized`: token faltante o inválido.
- `403 Forbidden`: `PERMISO_DENEGADO` salvo que el usuario sea admin, autor o responsable.
- `404 Not Found`: `TICKET_NO_ENCONTRADO`.

#### `PATCH /api/tickets/:id/status`

Requiere autenticación e ID válido. Cuerpo:

```json
{
  "status": "in_progress"
}
```

- `200 OK`: objeto de ticket actualizado; `completed` y `alert` se recalculan.
- `400 Bad Request`: `ID_INVALIDO` o `VALIDACION_TICKET`.
- `401 Unauthorized`: token faltante o inválido.
- `403 Forbidden`: `PERMISO_DENEGADO` si el ticket está asignado a otro developer.
- `404 Not Found`: `TICKET_NO_ENCONTRADO`.

Un admin puede cambiar cualquier estado. El responsable puede cambiar el estado de su ticket; un developer puede tomar un ticket sin responsable y queda asignado a sí mismo.

#### `DELETE /api/tickets/:id`

Requiere autenticación, ID válido y rol administrador. No lleva cuerpo.

- `200 OK`: `{"message":"Ticket eliminado correctamente."}`.
- `400 Bad Request`: `ID_INVALIDO`.
- `401 Unauthorized`: token faltante o inválido.
- `403 Forbidden`: `PERMISO_DENEGADO` para un developer.
- `404 Not Found`: `TICKET_NO_ENCONTRADO`.

## Pruebas con Thunder Client

En VS Code está disponible la colección **TaskBoard API**, con solicitudes de éxito y error agrupadas en **Salud**, **Autenticación**, **Usuarios**, **Tickets** y **Errores**. Configurá en Thunder Client una URL base y un entorno local con los datos de prueba. No guardes claves reales en la colección. La colección se administra desde Thunder Client y no está exportada como archivo de este repositorio.

## Estructura

```text
src/
├─ app.ts                 # Configura Express y registra rutas/middlewares
├─ create-application.ts  # Conecta repositorios, servicios y controladores
├─ server.ts              # Configuración, PostgreSQL y ciclo de vida HTTP
├─ config/                # Variables de entorno
├─ controllers/           # Adaptadores HTTP
├─ database/              # Sequelize, migraciones y seeders
├─ middleware/            # Autenticación y errores
├─ models/                # Modelos Sequelize
├─ repositories/          # Consultas y persistencia
├─ routes/                # Definición de endpoints
├─ services/              # Casos de uso y reglas de negocio
├─ types/                 # Tipos y enums compartidos
├─ utils/                 # JWT y funciones puras auxiliares
└─ validation/            # Validación y normalización de entradas
tests/                    # Pruebas unitarias, HTTP e integración PostgreSQL
```

## Auditoría de dependencias

Al 6 de noviembre de 2026, `npm audit` informa 13 vulnerabilidades moderadas y ninguna alta o crítica; 2 son de producción (Sequelize y su dependencia `uuid`) y las demás pertenecen a herramientas de desarrollo. Las correcciones automáticas sugeridas requieren downgrades o cambios incompatibles. No ejecutes `npm audit fix --force` sin revisar primero las opciones compatibles.
