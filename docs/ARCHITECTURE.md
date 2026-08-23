# Architecture — Témpano

Monorepo `apps/api` (NestJS) + `apps/web` (Angular 22).

- Hold transaccional con mutex in-process (better-sqlite3) y `SELECT FOR UPDATE` en Postgres.
- `remainingSpots` baja con `partySize` (público) o 1 (privado).
- `SkateSize.stockReserved` sube en el hold y baja en expire/cancel.
- Sweeper 30 s `expireStale()`.
- Puntos: 5 × partySize al pasar a `completed`.
- TZ Europe/Madrid.
