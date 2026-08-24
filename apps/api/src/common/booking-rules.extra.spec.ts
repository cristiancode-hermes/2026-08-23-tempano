import {
  buildSessionQrSvg,
  canCancelByPolicy,
  extractTicketCode,
  hoursUntil,
  madridDate,
  sessionTicketUrl,
  SLOT_HOURS,
  endTimeOf,
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

  it('QR encodes the session URL and is deterministic', async () => {
    const url = sessionTicketUrl('TP-ABC');
    expect(url).toContain('/sesion/TP-ABC');
    const a = await buildSessionQrSvg(url, 'TP-ABC');
    const b = await buildSessionQrSvg(url, 'TP-ABC');
    expect(a).toBe(b);
    expect(a).toContain('<svg');
    expect(a).toContain(url);
  });

  it('extractTicketCode accepts URL or bare code', () => {
    expect(extractTicketCode('tp-seed01')).toBe('TP-SEED01');
    expect(extractTicketCode('https://tempano.proyectos.cristiancode.dev/sesion/TP-SEED01')).toBe(
      'TP-SEED01',
    );
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
