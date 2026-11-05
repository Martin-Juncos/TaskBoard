# TaskBoard

API REST para gestionar un tablero Kanban de desarrollo de software. Los tickets representan trabajo técnico y avanzan por estados hasta completarse. El proyecto se realiza como trabajo práctico integrador.

> **Estado:** implementación en progreso. Ya existe la base Express/TypeScript, la ruta `GET /health`, configuración centralizada, manejo JSON de errores y pruebas iniciales. La conexión a PostgreSQL, autenticación, usuarios y operaciones de tickets todavía están pendientes; los endpoints y reglas descritos abajo siguen siendo el alcance acordado para el MVP.

## Objetivo

Construir primero una API sencilla que cumpla la consigna académica y sirva como base para una aplicación de tablero. La primera versión tendrá un único tablero compartido. Cada tarjeta será un ticket y cada columna representará su estado.

## Tecnologías previstas

- Node.js y TypeScript
- Express
- PostgreSQL
- Sequelize
- bcrypt para el hash de contraseñas
- JWT para autenticación
- dotenv para configuración local
- Thunder Client para probar y documentar solicitudes

## Alcance del MVP

### Tablero y tickets

Estados iniciales: `pending` (pendiente), `in_progress` (en progreso), `in_review` (en revisión), `completed` (completado) y `blocked` (bloqueado). Las transiciones podrán avanzar o volver a un estado anterior; no habrá columnas personalizadas en esta primera versión.

Cada ticket incluirá:

| Campo | Descripción |
| --- | --- |
| `title` | Título breve y obligatorio. |
| `description` | Descripción del trabajo. |
| `type` | Tipo de ticket, por ejemplo `feature`, `bug` o `task`. |
| `priority` | `low`, `medium`, `high` o `urgent`. |
| `status` | Estado actual del ticket; define la columna del tablero. |
| `dueDate` | Fecha límite obligatoria. |
| `createdById` | Usuario que creó el ticket. |
| `assigneeId` | Desarrollador responsable; puede estar sin asignar. |
| `branchType`, `branchName` | Tipo de rama y nombre sugerido/editable. |
| `commitType`, `commitScope`, `commitDescription` | Datos para construir un mensaje de commit editable. |

La propiedad `completed` se deriva de `status === "completed"`; no se guardará por separado para evitar estados contradictorios.

### Fecha límite y alerta

`dueDate` será obligatoria. La API devolverá `alert: true` si la fecha límite ya pasó y el ticket no está completado; en los demás casos devolverá `false`. `alert` será calculado al consultar, no almacenado en PostgreSQL ni modificable por el usuario. Así también se actualiza si el ticket se completa, se reabre o cambia su fecha límite.

### Ramas y commits

TaskBoard sugerirá textos a partir de los datos del ticket y permitirá editarlos antes de guardarlos. No creará ramas o commits reales ni se conectará a GitHub en el MVP.

Tipos de rama previstos: `feature`, `bugfix`, `hotfix`, `release` y `chore`. Ejemplos:

```text
feature/logging-middleware
bugfix/login-validation
release/1.0.0
```

El commit seguirá el formato Conventional Commits:

```text
<type>[optional scope]: <description>
```

Tipos sugeridos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `perf` y `chore`. Ejemplos: `feat(logging): add request logger` y `fix(auth): reject expired tokens`.

Las sugerencias son editables. Cambiar el título no reemplazará silenciosamente una rama o un commit ya guardados; se podrán regenerar mediante una acción explícita.

### Usuarios y permisos previstos

Habrá dos roles: `admin` y `developer` (desarrollador). El registro público asignará siempre el rol `developer`; el cliente no podrá registrarse como administrador.

| Acción | Administrador | Desarrollador |
| --- | --- | --- |
| Ver el tablero y buscar/filtrar tickets | Sí | Sí |
| Crear tickets | Sí | Sí |
| Editar cualquier ticket | Sí | Solo tickets propios o asignados |
| Cambiar estado | Sí | Tickets asignados; puede tomar uno sin asignar |
| Asignar responsables | Sí | Puede tomar un ticket sin asignar |
| Eliminar tickets | Sí | No |
| Administrar roles | Sí | No |

Estos permisos son decisiones de producto acordadas para el tablero compartido; se validarán en la capa de servicios y se protegerán con autenticación/autorización.

### Búsqueda y filtros

El listado aceptará búsqueda por título y descripción, junto con filtros combinables por estado, prioridad, tipo de ticket y responsable. Se contemplan `assigneeId`, la vista “mis tickets” y la opción “sin asignar”. Por ejemplo:

```http
GET /api/tickets?search=logging&priority=high&assigneeId=7
```

La API podrá devolver tickets agrupados por estado para facilitar la presentación de columnas.

## Arquitectura prevista

El backend se organizará en capas: rutas, controladores, servicios y repositorios. Los servicios concentrarán reglas de negocio y validaciones; los repositorios encapsularán consultas con Sequelize; los controladores manejarán HTTP y sus códigos de respuesta.

Los dos modelos principales serán `User` y `Ticket`, con relaciones para autoría y asignación. Sequelize gestionará el esquema mediante migraciones; las credenciales y claves se configurarán por variables de entorno.

## Endpoints previstos

Los paths son una propuesta inicial y pueden ajustarse durante la implementación.

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Registrar desarrollador. |
| `POST` | `/api/auth/login` | Iniciar sesión y obtener JWT. |
| `GET` | `/api/users` | Listar usuarios para filtros/asignación. |
| `GET` | `/api/tickets` | Listar tickets con búsqueda y filtros. |
| `GET` | `/api/tickets/:id` | Consultar un ticket. |
| `POST` | `/api/tickets` | Crear ticket. |
| `PUT` | `/api/tickets/:id` | Actualizar ticket. |
| `PATCH` | `/api/tickets/:id/status` | Cambiar estado del ticket. |
| `DELETE` | `/api/tickets/:id` | Eliminar ticket (administrador). |

La autenticación y las reglas de autorización se aplicarán de acuerdo con la consigna y la matriz de permisos. Las escrituras requerirán JWT como mínimo.

## Requisitos académicos contemplados

- CRUD completo para la entidad principal (`Ticket`).
- Modelos Sequelize para `User` y `Ticket`.
- Arquitectura en capas: rutas, controladores, servicios y acceso a datos.
- Al menos dos validaciones de negocio implementadas en servicios; se prevén validaciones de campos/valores permitidos y fecha límite.
- Registro e inicio de sesión con contraseñas protegidas con bcrypt y autenticación JWT.
- Protección de las operaciones de escritura.
- Manejo de errores y respuestas HTTP apropiadas, incluyendo casos `200`, `201`, `400`, `401`, `404` y `500`.
- Configuración mediante variables de entorno; `.env` no se subirá al repositorio y `.env.example` no contendrá secretos.
- Documentación de instalación y endpoints, más colección de Thunder Client o capturas de pruebas, incluyendo errores `400`, `401` y `404`.

## Fuera del MVP

Proyectos, tableros múltiples, equipos, comentarios, adjuntos, subtareas, sprints, notificaciones y conexión real con GitHub quedan como posibles etapas futuras. La evolución conceptual sería `Proyecto → Tableros → Tickets`; la primera entrega usa un único tablero implícito para mantener acotado el modelo.

## Plan de implementación

1. Inicializar Node.js/TypeScript, configuración de entorno y base Express; agregar health check, manejo de errores y pruebas iniciales. **Completado.**
2. Conectar PostgreSQL con Sequelize y preparar migraciones.
3. Implementar modelos y relación entre usuarios y tickets.
4. Implementar registro, login, bcrypt, JWT y permisos por rol.
5. Implementar CRUD de tickets, validaciones, alerta calculada, búsqueda y filtros.
6. Probar respuestas exitosas y errores; preparar evidencia con Thunder Client.
7. Completar la documentación de instalación y uso con comandos verificados.

## Instalación y ejecución

El proyecto ya tiene `src/server.ts`, `tsconfig.json` y pruebas en `tests/`. Antes de iniciar, copiá `.env.example` a `.env` y completá `DATABASE_URL`, `JWT_SECRET` y `JWT_EXPIRES_IN`. `PORT` es opcional y, si no se configura, el servidor usa el puerto `3000`. No subas el archivo `.env` al repositorio.

```bash
npm install
npm run dev
```

`npm run dev` inicia el servidor en modo desarrollo. `npm run build` compila TypeScript y `npm start` ejecuta el resultado compilado. `npm test` ejecuta las pruebas TypeScript con el runner integrado de Node.js mediante `tsx`; actualmente cubren la ruta de salud, configuración y respuestas de error. La base de datos, autenticación y operaciones de tickets todavía no están implementadas.
