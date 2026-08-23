# API — Témpano

Prefijo `/api`. Auth: `POST /auth/login` `{ identifier, password }`.

Hold: `POST /bookings/hold` → 409 `ALREADY_HELD` | `SESSION_FULL` | `SIZE_OUT_OF_STOCK` | `SLOT_BLOCKED`.

Confirm: `POST /bookings/:id/confirm` → `{ code, qrSvg, ... }`.

Check-in: `POST /staff/check-in` `{ code }` → 409 `ALREADY_CHECKED_IN`.

Catálogo: `GET /rinks` y `GET /rinks/featured` comparten `freeSlotsToday`.
