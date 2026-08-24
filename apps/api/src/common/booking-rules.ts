import type { BookingStatus, RinkMode } from '../entities/entities';

export const HOLD_MINUTES = 15;
export const POINTS_PER_PLAYER = 5;
export const CANCEL_HOURS = 24;
export const RENTAL_CENTS = 350;

export const LIVE_BOOKING: BookingStatus[] = ['pending', 'confirmed', 'checked_in'];

export const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  expired: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return (TRANSITIONS[from] || []).includes(to);
}

export function isLivePending(
  status: BookingStatus,
  expiresAt: Date | string | null,
  now = new Date(),
): boolean {
  if (status !== 'pending') return false;
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > now.getTime();
}

export function hasDuplicateUserSlot(
  existing: { userId: number; slotId: number; status: BookingStatus; expiresAt?: Date | string | null }[],
  userId: number,
  slotId: number,
  now = new Date(),
): boolean {
  return existing.some((b) => {
    if (b.userId !== userId || b.slotId !== slotId) return false;
    if (b.status === 'confirmed' || b.status === 'checked_in') return true;
    if (b.status === 'pending') return isLivePending(b.status, b.expiresAt ?? null, now);
    return false;
  });
}

export function holdConflict(
  existing: { userId: number; slotId: number; status: BookingStatus; expiresAt?: Date | string | null }[],
  userId: number,
  slotId: number,
  now = new Date(),
): 'ALREADY_HELD' | null {
  return hasDuplicateUserSlot(existing, userId, slotId, now) ? 'ALREADY_HELD' : null;
}

export function spotsNeeded(mode: RinkMode, partySize: number): number {
  return mode === 'private' ? 1 : partySize;
}

export function canFitParty(remainingSpots: number, mode: RinkMode, partySize: number): boolean {
  if (!Number.isFinite(partySize) || partySize < 1) return false;
  return remainingSpots >= spotsNeeded(mode, partySize);
}

export function availableStock(stockTotal: number, stockReserved: number): number {
  return Math.max(0, stockTotal - stockReserved);
}

export function canReserveSize(stockTotal: number, stockReserved: number, qty: number): boolean {
  if (!Number.isFinite(qty) || qty < 1) return false;
  return availableStock(stockTotal, stockReserved) >= qty;
}

export function pointsForCompleted(partySize: number): number {
  return partySize * POINTS_PER_PLAYER;
}

export function sumLines(lines: { qty: number; unitCents?: number; unitPriceCents?: number }[]): number {
  return lines.reduce((a, l) => a + l.qty * (l.unitCents ?? l.unitPriceCents ?? 0), 0);
}

export function canCancelByPolicy(hoursUntilStart: number, cancelHours = CANCEL_HOURS): boolean {
  return hoursUntilStart >= cancelHours;
}

export function hoursUntil(startsAt: Date | string, now = new Date()): number {
  return (new Date(startsAt).getTime() - now.getTime()) / 3_600_000;
}

export function validatePartySize(
  partySize: number,
  capacity: number,
  mode: RinkMode,
): { ok: boolean; code?: string } {
  const max = mode === 'private' ? capacity : capacity;
  if (!Number.isFinite(partySize) || partySize < 1 || partySize > max) {
    return { ok: false, code: 'INVALID_PARTY_SIZE' };
  }
  return { ok: true };
}

export function validateSkateCoverage(
  partySize: number,
  ownSkatesCount: number,
  rentalQty: number,
): { ok: boolean; code?: string } {
  const own = Math.max(0, ownSkatesCount || 0);
  const rent = Math.max(0, rentalQty || 0);
  if (own + rent !== partySize) return { ok: false, code: 'SKATE_COVERAGE' };
  return { ok: true };
}

export { buildSessionQrSvg, extractTicketCode, sessionTicketUrl, webOrigin } from './qr';

export function madridDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function parseMadridLocal(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+02:00`);
}

export function SLOT_HOURS(): string[] {
  const hours: string[] = [];
  for (let h = 10; h <= 21; h++) hours.push(`${String(h).padStart(2, '0')}:00`);
  return hours;
}

export function endTimeOf(start: string): string {
  const h = Number(start.slice(0, 2));
  return `${String((h + 1) % 24).padStart(2, '0')}:00`;
}
