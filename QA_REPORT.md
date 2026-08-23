# QA Report — 2026-08-23 Témpano

**Project:** Pista de hielo municipal B2C — aforo compartido (Norte) + hielo privado (Sur) + alquiler de tallas EU + ticket QR
**Stack:** Angular 22 (signals, zoneless) + NestJS 11 + TypeORM + SQLite
**Author:** Hermes Daily Builder
**Design lock:** DESIGN_FREE (`check-final-design.sh`)

## 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API `tsc` | PASS | `npm run build` en `apps/api` (rebuild QA para seed local de fotos) |
| Web dist | PASS | `apps/web/dist/web/browser/index.html` + `baseHref: /` |
| Jest | PASS | 24/24 |

## 2. Test Results

24 test cases — ALL PASSED (Jest).

Suites: `booking-rules.spec.ts` (9), `booking-rules.extra.spec.ts` (5), `bookings.int.spec.ts` (10).

Cubre aforo, stock de talla, same-user, sweeper, cobertura de patines y puntos derivados.

## 3. Runtime / Endpoint smoke

API :3072 · Swagger `/api/docs` 200.

| Check | Status |
|-------|--------|
| Health | PASS |
| Login email + username (`identifier`) | PASS 201 |
| Register | PASS 201 |
| `/api/auth/me` + 401 sin token | PASS |
| Rinks + featured `freeSlotsToday` 24=24 | PASS |
| `/api/rinks/:id` + slots del día | PASS |
| Hold 15 min + `expiresAt` server | PASS |
| 409 `ALREADY_HELD` same-user | PASS |
| 409 `SESSION_FULL` (party 39 / 38) | PASS |
| 409 `SIZE_OUT_OF_STOCK` talla 46 | PASS |
| Confirm + QR SVG | PASS |
| Lista ↔ detalle total 1800=1800=SUM lines | PASS |
| Check-in + 409 `ALREADY_CHECKED_IN` | PASS |
| Staff stats 7 días (ejes/fechas/tooltips) | PASS |

Smoke inicial 22/24: los 2 “FAIL” eran payloads inválidos (partySize>capacity → 400; cobertura de patines ≠ partySize → 400). Re-test con DTO válidos: ambos 409.

## 4. Browser QA (producción)

21/21 PASS (Puppeteer 1280 + 390).

- Auth ANTES de `**`: `/login`, `/entrar`, `/registro` 200
- Login panel lateral + creds demo debajo + inputs vacíos
- Sesión JWT `tempano.accessToken` sobrevive reload
- `/pistas/:id` y `/mis-sesiones/:id` no en blanco
- Checkout con total en vivo + picker de tallas
- Staff KPIs + 7 círculos SVG con `<title>` fecha/ocupación/ingresos
- Móvil 390px: `scrollWidth == 390`, sin overflow
- 0 errores de consola

**Fix QA:** dist stale del seed servía URLs Wikimedia rotas. Rebuild API + reseeds con `/assets/norte.jpg` y `/assets/sur.jpg` (fotos de hielo reales, 1200×800).

## 5. Quality / accesibilidad

| Criterion | Verdict |
|-----------|---------|
| Capa de valor de verdad | PASS — ciclo hold/confirm/check-in + inventario de tallas |
| ExpiresAt servidor + sweeper 30s | PASS |
| QR `bypassSecurityTrustHtml` | PASS |
| Puntos derivados 5×partySize (seed=15) | PASS |
| Fotos del vertical | PASS (tras reseeds) |
| contraste-hover | PASS — `a:hover:not(.btn)`; `.btn-primary:hover` fija `on-primary` |
| Contraste AA botones | PASS — on-primary/primary 7.31; hover 9.75; ink/surface-2 13.09 |
| Accent `#B45309` sobre `#EEF3F6` | 4.49 (casi AA; no es CTA) |
| isFinalDesign | N/A — proyecto nuevo |

## 6. Security

| Check | Result |
|-------|--------|
| Interceptor `Bearer` (bytes, no `***`) | PASS |
| JWT `registerAsync` + ConfigService | PASS |
| No APP_GUARD global | PASS |
| StaffGuard después de JwtAuthGuard | PASS |
| Token namespaced | `tempano.accessToken` |

## 7. Deployment

| Target | Result | Details |
|--------|--------|---------|
| Caddy | DONE | `tempano.proyectos.cristiancode.dev` → :3072 |
| manage-apis.sh | DONE | 57/57 alineado, idx tempano port 3072 |
| GitHub | DONE | https://github.com/cristiancode-hermes/2026-08-23-tempano |
| README | DONE | blob 200 |
| Landing | DONE | `tempano` en CATEGORIES |
| Excel | DONE | fila #88 |
| Portfolio es/en/pt | DONE | slug `tempano`, heading-213 |
| Capture config | DONE | tokenField accessToken + `tempano.accessToken` |
| Screenshots | DONE | `public/assets/tempano.png` + `-m.png` |

href / link2 / link3 → HTTP 200.

## Summary

**OVERALL: PASS**

Jest 24/24 · endpoint smoke 24/24 (tras re-test 409) · browser 21/21 · deploy verificado.
