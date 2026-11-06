# TaskBoard: guía para contribuciones

## Stack y límites

- Node.js 20+, TypeScript estricto, Express 5, Sequelize 6 y PostgreSQL.
- Flujo: rutas → controladores → servicios → repositorios → modelos.
- Las reglas de negocio y autorización se aplican en servicios; no confiar solo en las rutas.
- `src/create-application.ts` compone dependencias. `src/server.ts` administra conexión, escucha y cierre.
- Mantener los cambios pequeños, la API estable y comentarios breves en español que expliquen la intención.
- No usar `DATABASE_URL` para pruebas: `npm test` valida que `DATABASE_URL_TEST` termina en `_test` y no coincide con desarrollo.
- No leer, imprimir ni versionar `.env` o secretos.

## Comandos verificados

- `npm run dev`: servidor con recarga.
- `npm run build`: compilación de producción.
- `npm test`: verifica base aislada, migra y ejecuta todas las pruebas.
- `npm run test:coverage`: pruebas con cobertura, también usando la base aislada.
- `npm run lint`, `npm run format:check`, `npm run typecheck`: análisis estático, formato y tipos.
- `npm run check`: lint, formato, tipos, build y pruebas.
- `npm run db:check`, `npm run db:migrate`, `npm run db:test:migrate`: utilidades de PostgreSQL.
- No publicar cambios hasta que el usuario pida explícitamente subirlos.

Antes de cambiar scripts o estructura, actualizá esta guía y el README si corresponde.
