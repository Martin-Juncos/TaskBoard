# TaskBoard — API REST para un tablero de tareas

TaskBoard es el proyecto del Trabajo Práctico Integrador del módulo Node.js del **Bootcamp 5.0 de Devlights, edición 2026**. La consigna propone elegir un dominio y menciona como opción una lista de tareas con título, prioridad, fecha límite y estado de completitud.

Para este proyecto, esa idea se adapta al trabajo cotidiano de desarrollo de software: una tarea se representa como un **ticket** que permite describir un trabajo, priorizarlo, ponerle una fecha límite, seguir su estado y saber quién lo creó o tiene asignado. El objetivo es ayudar a equipos y, especialmente, a desarrolladores que recién empiezan a trabajar con tickets a organizar qué hay que hacer, qué es urgente y cuál es el próximo paso, en vez de dejar el trabajo en una lista informal.

TaskBoard es una **API REST**, no una interfaz gráfica ni una integración con GitHub. Expone operaciones que se pueden probar con Thunder Client o consumir desde una futura aplicación web. Además de los campos básicos de la consigna, incorpora descripción, tipo, estados de flujo Kanban, autor y responsable; también ofrece sugerencias de nombres de rama y commits para reducir el trabajo inicial al preparar un cambio de código.

Está construida con Node.js, TypeScript, Express, Sequelize y PostgreSQL.

## Estado

El MVP implementa el CRUD de tickets, registro y login, autenticación JWT, permisos, filtros y migraciones. El campo `completed` de la consigna se representa mediante el estado `completed` y se devuelve como un dato derivado. También incluye endpoints complementarios para usuarios y para el flujo de tickets. La colección **TaskBoard API** está configurada en Thunder Client para probar solicitudes desde VS Code.

Quedan fuera del alcance actual los tableros múltiples, proyectos, comentarios, adjuntos, notificaciones y la integración real con GitHub.

### Relación con la consigna

La entidad elegida es la tarea, adaptada al concepto de ticket de desarrollo: los campos sugeridos de título, prioridad y fecha límite se conservan; la completitud se refleja en el estado. Los campos de descripción, tipo, asignación y sugerencias Git amplían el ejemplo para hacerlo más útil en un flujo de trabajo de software.

| Requisito del TP                    | Implementación en TaskBoard                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| Node.js, Express y TypeScript       | TypeScript estricto; Express configura la API y Node.js ejecuta el servidor.      |
| Base de datos y dos modelos         | PostgreSQL con Sequelize; modelos `User` y `Ticket`.                              |
| CRUD de la entidad principal        | `GET` colección, `GET` por ID, `POST`, `PUT` y `DELETE` para tickets.             |
| Arquitectura en capas               | Rutas → controladores → servicios → repositorios → modelos.                       |
| Validaciones y reglas de negocio    | Validación de entradas, email único, reglas de autorización y estados permitidos. |
| Registro/login con bcrypt y JWT     | La contraseña se guarda como hash; el login emite un JWT.                         |
| Protección de escrituras            | El middleware verifica JWT en operaciones protegidas.                             |
| Códigos HTTP y manejo de errores    | Respuestas JSON con `200`, `201`, `400`, `401`, `403`, `404` y `500`.             |
| Controladores con manejo de errores | Los controladores responden ante errores y los pasan al middleware global.        |
| Variables de entorno                | `.env` local ignorado por Git; `.env.example` documenta los nombres esperados.    |

La consigna considera filtros, roles y relaciones entre modelos como extras opcionales. TaskBoard también incorpora asignación de tickets, estados adicionales, sugerencias de rama/commit y una colección Thunder Client.

## Arquitectura y flujo de una solicitud

La API separa HTTP, reglas de negocio y persistencia. Así se puede entender y probar cada responsabilidad sin concentrar todo en una sola ruta.

```text
Cliente (Thunder Client / otra aplicación)
  → Express: src/app.ts registra JSON, rutas y middlewares globales
  → Router: src/routes/ selecciona endpoint y autenticación
  → Controller: src/controllers/ adapta HTTP a la operación
  → Service: src/services/ valida reglas del caso de uso y permisos
  → Repository: src/repositories/ consulta o modifica datos
  → Sequelize Model: src/models/ representa User o Ticket
  → PostgreSQL
```

El middleware de autenticación verifica el Bearer JWT antes de las rutas protegidas y carga el usuario autenticado. Los errores previsibles usan `HttpError`; el middleware global los convierte al formato JSON documentado más abajo, sin revelar stack traces. Si el método o la ruta no existen, el middleware `not-found-handler` responde `404`.

`src/app.ts` configura Express y conecta repositorios, servicios y controladores. `src/server.ts` lee la configuración, espera la conexión a PostgreSQL antes de escuchar y cierra el servidor y Sequelize al recibir `SIGINT` o `SIGTERM`.

## Requisitos e instalación

- Node.js 20 o superior y npm.
- PostgreSQL disponible localmente.
- Una base de datos PostgreSQL, por ejemplo `taskboard`.

1. Cloná el repositorio e instalá las dependencias:

   ```bash
   npm install
   ```

2. Creá la base PostgreSQL desde pgAdmin o `psql`. Asegurate de que el usuario de la conexión pueda crear y modificar tablas.
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

| Variable         | Requerida                        | Descripción                                                                                                                                                                     |
| ---------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`           | No                               | Puerto HTTP; por defecto `3000`.                                                                                                                                                |
| `DATABASE_URL`   | Sí                               | URL PostgreSQL, por ejemplo `postgres://USUARIO:CONTRASENA@localhost:5432/taskboard`. Codificá caracteres especiales de usuario/contraseña como parte de una URL.                |
| `JWT_SECRET`     | Sí                               | Clave privada para firmar JWT. Usá una cadena aleatoria y larga; no la incluyas en el repositorio.                                                                              |
| `JWT_EXPIRES_IN` | Sí                               | Duración del token aceptada por `jsonwebtoken`, por ejemplo `1h`.                                                                                                               |
| `ADMIN_EMAIL`    | Para crear o revertir el seed    | Email de la cuenta administradora inicial.                                                                                                                                      |
| `ADMIN_PASSWORD` | Para crear el administrador      | Contraseña inicial; el seed guarda únicamente su hash bcrypt.                                                                                                                   |

`npm run db:check` valida únicamente `DATABASE_URL`; para iniciar el servidor también son necesarias `JWT_SECRET` y `JWT_EXPIRES_IN`.

## Migraciones y administrador inicial

Las migraciones crean `users` y `tickets`, sus relaciones, índices y los campos requeridos. Aplican únicamente cambios pendientes; no hace falta editar una migración ya aplicada para cambiar el esquema: agregá una migración nueva.

| Comando                   | Efecto                                                   |
| ------------------------- | -------------------------------------------------------- |
| `npm run db:migrate`      | Aplica migraciones pendientes en `DATABASE_URL`.         |
| `npm run db:migrate:undo` | Revierte la última migración aplicada en PostgreSQL.     |

El seed de administrador es explícito y no se ejecuta al iniciar la API. Para usarlo, completá `ADMIN_EMAIL` y `ADMIN_PASSWORD`, aplicá primero las migraciones y ejecutá:

```bash
npm run db:seed:admin
```

El seed normaliza el email a minúsculas, valida su formato, hashea la contraseña con bcrypt y crea el usuario solo si el email todavía no existe. Si ya existe, se detiene sin modificar la cuenta. Para eliminar esa cuenta mediante la reversión, definí `ADMIN_EMAIL` y ejecutá `npm run db:seed:admin:undo`. Protegé las credenciales y verificá que las variables apunten a la base correcta antes de ejecutar cualquiera de estos comandos.

## Comandos del proyecto

| Comando                      | Uso                                                    |
| ---------------------------- | ------------------------------------------------------ |
| `npm run dev`                | Inicia el servidor con recarga automática.             |
| `npm run build`              | Compila `src/` en `dist/`.                             |
| `npm start`                  | Ejecuta la compilación de producción.                  |
| `npm run db:check`           | Comprueba la conexión con PostgreSQL.                  |
| `npm run db:migrate`         | Aplica las migraciones pendientes.                     |
| `npm run db:migrate:undo`    | Revierte la última migración.                          |
| `npm run db:seed:admin`      | Crea la cuenta administradora inicial.                 |
| `npm run db:seed:admin:undo` | Elimina la cuenta creada por el seeder.                |

## API

Los cuerpos de solicitud deben enviarse como JSON; las respuestas, incluidos los errores, también son JSON. Las rutas bajo `/api/users` y `/api/tickets` requieren:

```http
Authorization: Bearer <token>
```

El token se obtiene en `POST /api/auth/login`. El registro público siempre asigna el rol `developer`; el cliente no puede elegir el rol. Los únicos roles son `admin` y `developer`.

### Flujo básico de uso

1. Configurá `.env`, creá la base, aplicá migraciones y arrancá la API.
2. Creá un usuario con `POST /api/auth/register` o prepará el administrador con el seed.
3. Iniciá sesión con `POST /api/auth/login` y copiá el JWT de la respuesta.
4. En Thunder Client, enviá `Authorization: Bearer <token>` para consultar o modificar usuarios y tickets.
5. Creá, listá, consultá por ID y actualizá tickets. Solo los administradores pueden eliminarlos o cambiar roles; los developers pueden operar tickets según su autoría o asignación.

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

La colección **TaskBoard API** está exportada en [`thunder-collection_TaskBoard-API.json`](./thunder-collection_TaskBoard-API.json). Incluye 24 solicitudes de éxito y error agrupadas en **Salud**, **Autenticación**, **Usuarios**, **Tickets** y **Errores**, con ejemplos de respuestas `400`, `401`, `403` y `404`.

Para usarla, abrí Thunder Client en VS Code, elegí **Collections → Import** y seleccioná el archivo exportado. Después configurá las variables indicadas por la colección con datos locales de prueba. Los tokens y contraseñas reutilizables se mantienen como variables; el archivo no contiene JWT, secretos de entorno ni credenciales reales.

## Carpetas y archivos

### Raíz del proyecto

| Archivo                               | Propósito                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `package.json`                        | Dependencias, versiones de Node compatibles y comandos npm.               |
| `package-lock.json`                   | Versiones exactas para instalaciones reproducibles con npm.               |
| `tsconfig.json`                       | Configuración de compilación TypeScript para producción.                  |
| `.env.example`                        | Plantilla de variables; no contiene credenciales reales.                  |
| `.gitignore`                          | Excluye `.env`, dependencias, compilación y logs.                         |
| `.sequelizerc`                        | Indica a Sequelize CLI dónde están configuración, migraciones y seeders.  |
| `README.md`                           | Guía de instalación, arquitectura, uso y contrato de la API.              |
| `thunder-collection_TaskBoard-API.json` | Colección importable con la evidencia funcional de Thunder Client.      |

### Código de la aplicación: `src/`

```text
src/
├─ app.ts
├─ server.ts
├─ config/
│  └─ env.ts
├─ controllers/
│  ├─ auth-controller.ts
│  ├─ ticket-controller.ts
│  └─ user-controller.ts
├─ database/
│  ├─ check-connection.ts
│  ├─ sequelize-cli-config.cjs
│  ├─ sequelize.ts
│  ├─ migrations/
│  │  ├─ 20261105000100-create-users.js
│  │  ├─ 20261105000200-create-tickets.js
│  │  └─ 20261105000300-add-name-to-users.js
│  └─ seeders/
│     └─ 20261105000400-seed-admin.js
├─ errors/
│  └─ http-error.ts
├─ middleware/
│  ├─ authentication.ts
│  ├─ error-handler.ts
│  └─ not-found-handler.ts
├─ models/
│  ├─ ticket.ts
│  └─ user.ts
├─ repositories/
│  ├─ ticket-repository.ts
│  └─ user-repository.ts
├─ routes/
│  ├─ auth-routes.ts
│  ├─ ticket-routes.ts
│  └─ user-routes.ts
├─ services/
│  ├─ login-user-service.ts
│  ├─ register-user-service.ts
│  ├─ ticket-authorization.ts
│  ├─ ticket-service.ts
│  └─ user-service.ts
├─ types/
│  ├─ authenticated-user.ts
│  ├─ express.d.ts
│  ├─ ticket-enums.ts
│  ├─ ticket-filters.ts
│  └─ user-role.ts
├─ utils/
│  ├─ jwt.ts
│  ├─ ticket-derived-fields.ts
│  └─ ticket-suggestions.ts
└─ validation/
   ├─ email.ts
   ├─ is-record.ts
   ├─ login-user.ts
   ├─ register-user.ts
   ├─ ticket-search.ts
   └─ ticket.ts
```

| Carpeta/archivo                     | Responsabilidad                                                         |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `app.ts`                            | Crea Express y ensambla rutas, servicios, repositorios y controladores. |
| `server.ts`                         | Punto de entrada; configuración, conexión y cierre ordenado.            |
| `config/env.ts`                     | Lee y valida variables de entorno.                                      |
| `controllers/`                      | Recibe parámetros HTTP, llama servicios y arma respuestas.              |
| `routes/`                           | Declara métodos, paths y middleware por endpoint.                       |
| `services/`                         | Casos de uso, reglas del dominio y permisos.                            |
| `repositories/`                     | Acceso a datos mediante los modelos Sequelize.                          |
| `models/`                           | Esquema y relaciones de `User` y `Ticket`.                              |
| `database/sequelize.ts`             | Instancia compartida de Sequelize para PostgreSQL.                      |
| `database/sequelize-cli-config.cjs` | Configuración de la conexión de desarrollo para Sequelize CLI.         |
| `database/migrations/`              | Historial incremental de tablas, campos, claves foráneas e índices.     |
| `database/seeders/`                 | Alta reversible del administrador inicial.                              |
| `database/check-connection.ts`      | Comando para verificar la conexión local.                               |
| `middleware/` y `errors/`           | Autenticación, errores HTTP y rutas inexistentes.                       |
| `validation/`                       | Comprueba y normaliza cuerpos y query params.                           |
| `types/`                            | Roles, estados, prioridades, tipos de ticket y filtros.                 |
| `utils/`                            | JWT, campos calculados y sugerencias auxiliares.                        |

`node_modules/` y `dist/` son directorios generados localmente: no son código fuente ni se versionan.

## Seguridad de dependencias

Antes de una entrega, ejecutá `npm audit` para revisar las vulnerabilidades conocidas de las versiones instaladas. No uses `npm audit fix --force` sin revisar antes el impacto de las actualizaciones incompatibles en Sequelize y TypeScript.
