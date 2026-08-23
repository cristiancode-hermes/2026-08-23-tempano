import {
  availableStock,
  canFitParty,
  canReserveSize,
  canTransition,
  hasDuplicateUserSlot,
  holdConflict,
  pointsForCompleted,
  spotsNeeded,
  sumLines,
  validatePartySize,
  validateSkateCoverage,
} from './booking-rules';

describe('booking-rules', () => {
  it('same user pending or confirmed blocks a second hold', () => {
    const now = new Date('2026-08-23T12:00:00Z');
    const existing = [
      {
        userId: 1,
        slotId: 9,
        status: 'pending' as const,
        expiresAt: new Date('2026-08-23T12:10:00Z'),
      },
    ];
    expect(hasDuplicateUserSlot(existing, 1, 9, now)).toBe(true);
    expect(holdConflict(existing, 1, 9, now)).toBe('ALREADY_HELD');
    expect(
      hasDuplicateUserSlot(
        [{ userId: 1, slotId: 9, status: 'confirmed' as const, expiresAt: null }],
        1,
        9,
        now,
      ),
    ).toBe(true);
    expect(hasDuplicateUserSlot(existing, 2, 9, now)).toBe(false);
  });

  it('expired pending does not block same user', () => {
    const now = new Date('2026-08-23T12:00:00Z');
    const existing = [
      {
        userId: 1,
        slotId: 9,
        status: 'pending' as const,
        expiresAt: new Date('2026-08-23T11:00:00Z'),
      },
    ];
    expect(hasDuplicateUserSlot(existing, 1, 9, now)).toBe(false);
  });

  it('public aforo uses partySize; private uses 1 spot', () => {
    expect(spotsNeeded('public', 4)).toBe(4);
    expect(spotsNeeded('private', 6)).toBe(1);
    expect(canFitParty(3, 'public', 4)).toBe(false);
    expect(canFitParty(4, 'public', 4)).toBe(true);
    expect(canFitParty(1, 'private', 8)).toBe(true);
    expect(canFitParty(0, 'private', 2)).toBe(false);
  });

  it('talla stock never goes negative', () => {
    expect(availableStock(10, 7)).toBe(3);
    expect(canReserveSize(10, 7, 3)).toBe(true);
    expect(canReserveSize(10, 7, 4)).toBe(false);
    expect(availableStock(2, 5)).toBe(0);
  });

  it('own skates + rentals must cover partySize', () => {
    expect(validateSkateCoverage(4, 4, 0).ok).toBe(true);
    expect(validateSkateCoverage(4, 1, 3).ok).toBe(true);
    expect(validateSkateCoverage(4, 0, 3).ok).toBe(false);
  });

  it('points are 5 × partySize', () => {
    expect(pointsForCompleted(3)).toBe(15);
    expect(pointsForCompleted(1)).toBe(5);
  });

  it('lines sum qty × unit', () => {
    expect(sumLines([{ qty: 2, unitCents: 900 }, { qty: 1, unitCents: 350 }])).toBe(2150);
  });

  it('party size bounds', () => {
    expect(validatePartySize(0, 40, 'public').ok).toBe(false);
    expect(validatePartySize(41, 40, 'public').ok).toBe(false);
    expect(validatePartySize(8, 8, 'private').ok).toBe(true);
  });

  it('state machine', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'checked_in')).toBe(true);
    expect(canTransition('checked_in', 'completed')).toBe(true);
    expect(canTransition('completed', 'cancelled')).toBe(false);
  });
});
