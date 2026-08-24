export type UserRole = 'player' | 'staff' | 'admin';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  points?: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Rink {
  id: number;
  slug: string;
  name: string;
  mode: 'public' | 'private';
  capacity: number;
  priceCents: number;
  description?: string;
  photos?: string[];
  tags?: string[];
  active?: boolean;
  freeSlotsToday?: number;
  remainingSpots?: number;
  ratingAvg?: number;
  ratingCount?: number;
}

export interface SlotView {
  id: number;
  rinkId?: number;
  date: string;
  startTime: string;
  endTime: string;
  remainingSpots: number;
  capacity?: number;
  blocked?: boolean;
  status: string;
  startsAt?: string;
}

export interface MenuItem {
  id: number;
  slug?: string;
  name: string;
  kind?: string;
  priceCents: number;
  active?: boolean;
}

export interface SkateSize {
  id: number;
  sizeEu: number;
  stockTotal: number;
  stockReserved: number;
  available: number;
}

export interface BookingLine {
  id?: number;
  kind?: string;
  label?: string;
  qty: number;
  unitCents?: number;
  unitPriceCents?: number;
  amountCents?: number;
}

export interface Booking {
  id: number;
  code?: string | null;
  status: BookingStatus;
  partySize: number;
  ownSkatesCount?: number;
  totalCents: number;
  expiresAt?: string | null;
  qrSvg?: string | null;
  qrUrl?: string | null;
  rink?: Partial<Rink> | null;
  slot?: Partial<SlotView> | null;
  lines?: BookingLine[];
  rentals?: { sizeEu?: number; qty: number }[];
  checkIn?: unknown;
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Reservada',
  confirmed: 'Confirmada',
  checked_in: 'En pista',
  completed: 'Completada',
  cancelled: 'Cancelada',
  expired: 'Caducada',
};

export const TOKEN_KEY = 'tempano.accessToken';
export const RENTAL_CENTS = 350;
