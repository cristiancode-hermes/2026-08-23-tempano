import * as QRCode from 'qrcode';

export function webOrigin(): string {
  const raw =
    process.env.WEB_ORIGIN ||
    process.env.PUBLIC_WEB_ORIGIN ||
    'https://tempano.proyectos.cristiancode.dev';
  return raw.replace(/\/$/, '');
}

export function sessionTicketUrl(code: string): string {
  return `${webOrigin()}/sesion/${encodeURIComponent(String(code).trim())}`;
}

/** Accepts a ticket code or a scanned session URL. */
export function extractTicketCode(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    const last = u.pathname.split('/').filter(Boolean).pop() || '';
    if (last) return decodeURIComponent(last).toUpperCase();
  } catch {
    /* not a URL */
  }
  return s.toUpperCase();
}

/** Real QR (scannable) whose payload is the session URL. */
export async function buildSessionQrSvg(url: string, code: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#12242C', light: '#FFFFFF' },
  });
  return svg.replace(
    /^<svg\b/,
    `<svg role="img" aria-label="QR ${escapeXml(code)}" data-session-url="${escapeXml(url)}"`,
  );
}

function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
