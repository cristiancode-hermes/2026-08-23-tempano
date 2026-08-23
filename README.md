# Témpano

Pista de hielo municipal B2C: sesiones de 60 min (Pista Norte pública con aforo compartido / Pista Sur privada), alquiler de patines por talla EU, hold de 15 min, ticket QR y check-in de staff.

**Demo:** `demo@tempano.dev` / `demo1234`  
**Staff:** `staff@tempano.dev` / `demo1234`  
**Web:** https://tempano.proyectos.cristiancode.dev  
**API:** puerto 3072 · JWT namespaced `tempano.accessToken`

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Angular 22 (signals, zoneless) + CSS propio |
| Backend | NestJS 11 + TypeORM + JWT |
| Database | SQLite (better-sqlite3) / Neon-ready |

## Run

```bash
# API
cd apps/api
PORT=3072 node dist/main.js

# Web (dev)
cd apps/web
npx ng serve
```

## Tests

```bash
cd apps/api && npm test
```

Jest cubre aforo compartido, stock de tallas, 409 same-user, sweeper, cobertura de patines y puntos derivados.

## Ciclo transaccional

1. Hold 15 min con `expiresAt` en servidor.
2. Sweeper ~30 s libera plazas y tallas.
3. 409 `SESSION_FULL` / `SIZE_OUT_OF_STOCK` / `ALREADY_HELD`.
4. Confirmación con código + QR SVG.
5. Check-in staff: segundo scan → 409 `ALREADY_CHECKED_IN`.
6. Puntos: 5 × partySize al completar.
