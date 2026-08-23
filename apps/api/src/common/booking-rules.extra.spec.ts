import {
  buildQrPlaceholderSvg,
  canCancelByPolicy,
  endTimeOf,
  hoursUntil,
  madridDate,
  SLOT_HOURS,
} from './booking-rules';

describe('booking-rules extras', () => {
  it('cancel policy is 24h', () => {
    expect(canCancelByPolicy(24)).toBe(true);
    expect(canCancelByPolicy(23.9)).toBe(false);
  });

  it('hoursUntil is signed', () => {
    const future = new Date(Date.now() + 48 * 3600_000);
    expect(hoursUntil(future)).toBeGreaterThan(47);
  });

  it('QR is deterministic', () => {
    expect(buildQrPlaceholderSvg('TP-ABC', 'TP-ABC')).toBe(buildQrPlaceholderSvg('TP-ABC', 'TP-ABC'));
    expect(buildQrPlaceholderSvg('TP-ABC', 'TP-ABC')).toContain('<svg');
  });

  it('slots 10:00–21:00', () => {
    const h = SLOT_HOURS();
    expect(h[0]).toBe('10:00');
    expect(h[h.length - 1]).toBe('21:00');
    expect(endTimeOf('21:00')).toBe('22:00');
  });

  it('madridDate is YYYY-MM-DD', () => {
    expect(madridDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
