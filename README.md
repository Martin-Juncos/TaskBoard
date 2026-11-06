# TaskBoard

API REST para administrar un tablero Kanban de tickets de desarrollo. Está construida con Node.js, TypeScript, Express, Sequelize y PostgreSQL.

## Funcionalidades

- Registro e inicio de sesión con bcrypt y JWT; el registro público siempre crea usuarios `developer`.
- Gestión de usuarios y roles; solo administradores pueden cambiar roles.
- CRUD de tickets, con permisos por rol y asignación.
- Búsqueda por título y descripción; filtros por estado, prioridad, tipo y responsable.
- Tickets propios, sin asignar y agrupación por estado.
- `completed` y `alert` calculados al responder; sugerencias editables de rama y commit.
- Migraciones Sequelize y una base de datos PostgreSQL separada para pruebas.

## Requisitos

- Node.js 20 o superior y npm.
- PostgreSQL disponible localmente.
- Bases de datos `taskboard` y `taskboard_test` (o nombres equivalentes; la URL de pruebas debe terminar en `_test`).

## Instalación y configuración

1. Instalá las dependencias con `npm install`.
2. Copiá `.env.example` a `.env` y completá las conexiones a PostgreSQL y los valores JWT.
3. Aplicá las migraciones y, si corresponde, cargá el administrador inicial.

```bash
npm run db:check
npm run db:migrate
npm run db:seed:admin
npm run dev
```

`PORT` es opcional y usa `3000` por defecto. `ADMIN_EMAIL` y `ADMIN_PASSWORD` solo se necesitan para ejecutar el seeder. No compartas ni subas `.env`.

El servidor verifica la conexión a PostgreSQL antes de escuchar y cierra Sequelize al recibir `SIGINT` o `SIGTERM`.

## Comandos

| Comando                                                | Uso                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `npm run dev`                                          | Inicia el servidor en modo de desarrollo.                              |
| `npm run build`                                        | Compila `src/` en `dist/`.                                             |
| `npm start`                                            | Ejecuta la compilación.                                                |
| `npm run db:check`                                     | Comprueba la conexión configurada en `DATABASE_URL`.                   |
| `npm run db:migrate` / `npm run db:migrate:undo`       | Aplica o revierte una migración en desarrollo.                         |
| `npm test`                                             | Protege `DATABASE_URL_TEST`, aplica migraciones y ejecuta las pruebas. |
| `npm run test:coverage`                                | Ejecuta la suite con cobertura usando la base aislada.                 |
| `npm run lint`                                         | Analiza TypeScript y JavaScript con ESLint.                            |
| `npm run format` / `npm run format:check`              | Aplica o comprueba el formato con Prettier.                            |
| `npm run typecheck`                                    | Comprueba tipos de `src/` y `tests/` sin emitir archivos.              |
| `npm run check`                                        | Ejecuta lint, formato, tipos, build y pruebas.                         |
| `npm run db:seed:admin` / `npm run db:seed:admin:undo` | Crea o elimina el administrador inicial.                               |

Para migrar o revertir la base de pruebas existen `npm run db:test:migrate` y `npm run db:test:migrate:undo`. Las pruebas de integración limpian sus tablas entre casos y no deben apuntar a una base de desarrollo.

## Auditoría de dependencias

Al 6 de noviembre de 2026, `npm audit` informa 13 vulnerabilidades moderadas y ninguna alta o crítica; 2 son de producción (Sequelize y su dependencia `uuid`) y las demás pertenecen a herramientas de desarrollo. Las correcciones automáticas sugeridas requieren downgrades o cambios incompatibles. No ejecutes `npm audit fix --force` sin revisar primero las opciones compatibles.

## Endpoints

Las rutas de usuarios y tickets requieren `Authorization: Bearer <token>`, salvo que se indique lo contrario.

| Método   | Ruta                                      | Descripción                                               |
| -------- | ----------------------------------------- | --------------------------------------------------------- |
| `GET`    | `/health`                                 | Comprueba que la API responde.                            |
| `POST`   | `/api/auth/register`                      | Registra un desarrollador.                                |
| `POST`   | `/api/auth/login`                         | Inicia sesión y devuelve un JWT.                          |
| `GET`    | `/api/users`                              | Lista usuarios.                                           |
| `PATCH`  | `/api/users/:id/role`                     | Cambia el rol; solo administrador.                        |
| `GET`    | `/api/tickets`                            | Lista, busca y filtra tickets.                            |
| `GET`    | `/api/tickets/:id`                        | Consulta un ticket.                                       |
| `POST`   | `/api/tickets`                            | Crea un ticket.                                           |
| `PUT`    | `/api/tickets/:id`                        | Edita un ticket sin regenerar sugerencias implícitamente. |
| `POST`   | `/api/tickets/:id/regenerate-suggestions` | Regenera rama y commit sugeridos.                         |
| `PATCH`  | `/api/tickets/:id/status`                 | Cambia el estado.                                         |
| `DELETE` | `/api/tickets/:id`                        | Elimina un ticket; solo administrador.                    |

Los filtros combinables incluyen `search`, `status`, `priority`, `type`, `assigneeId`, `mine`, `unassigned` y `groupBy=status`.

## Pruebas con Thunder Client

En VS Code está disponible la colección **TaskBoard API**, con solicitudes agrupadas en **Salud**, **Autenticación**, **Usuarios**, **Tickets** y **Errores**. Configurá en Thunder Client una URL base y un entorno local con los datos de prueba; no guardes claves reales en la colección. La colección se administra desde Thunder Client y no está exportada como archivo de este repositorio.

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

## Estado del proyecto

La API y sus pruebas cubren autenticación, autorización, usuarios y CRUD de tickets. Las funciones futuras del producto (por ejemplo, tableros múltiples, comentarios, adjuntos y conexión real con GitHub) quedan fuera del alcance actual.
