import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export type UserRole = 'player' | 'staff' | 'admin';
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'expired';
export type BookingLineKind = 'base' | 'rental' | 'addon' | 'extra';
export type RinkMode = 'public' | 'private';

export const LIVE_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'checked_in'];

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 180, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 200 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: 'player' })
  role: UserRole;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Booking, (b: Booking) => b.user)
  bookings?: Booking[];
}

@Entity('rinks')
export class Rink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 16, default: 'public' })
  mode: RinkMode;

  @Column({ type: 'int', default: 40 })
  capacity: number;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'varchar', length: 2400, default: '' })
  description: string;

  @Column({ type: 'simple-json', default: '[]' })
  photos: string[];

  @Column({ type: 'simple-json', default: '[]' })
  tags: string[];

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => SessionSlot, (s: SessionSlot) => s.rink)
  slots?: SessionSlot[];
}

@Entity('session_slots')
@Unique(['rinkId', 'date', 'startTime'])
export class SessionSlot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  rinkId: number;

  @ManyToOne(() => Rink, (r: Rink) => r.slots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rinkId' })
  rink?: Rink;

  @Column({ type: 'varchar', length: 10 })
  date: string;

  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  @Column({ type: 'varchar', length: 5 })
  endTime: string;

  @Column({ type: 'int' })
  remainingSpots: number;

  @Column({ type: 'boolean', default: false })
  blocked: boolean;

  @Column({ type: 'datetime' })
  startsAt: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Booking, (b: Booking) => b.slot)
  bookings?: Booking[];
}

@Entity('skate_sizes')
export class SkateSize {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  sizeEu: number;

  @Column({ type: 'int' })
  stockTotal: number;

  @Column({ type: 'int', default: 0 })
  stockReserved: number;
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, (u: User) => u.bookings)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'int' })
  slotId: number;

  @ManyToOne(() => SessionSlot, (s: SessionSlot) => s.bookings)
  @JoinColumn({ name: 'slotId' })
  slot?: SessionSlot;

  @Column({ type: 'int' })
  rinkId: number;

  @ManyToOne(() => Rink)
  @JoinColumn({ name: 'rinkId' })
  rink?: Rink;

  @Column({ type: 'int' })
  partySize: number;

  @Column({ type: 'int', default: 0 })
  ownSkatesCount: number;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: BookingStatus;

  @Column({ type: 'int', default: 0 })
  totalCents: number;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'varchar', length: 12, nullable: true, unique: true })
  code: string | null;

  @Column({ type: 'varchar', length: 8000, nullable: true })
  qrSvg: string | null;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => BookingLine, (l: BookingLine) => l.booking)
  lines?: BookingLine[];

  @OneToMany(() => RentalHold, (h: RentalHold) => h.booking)
  rentals?: RentalHold[];

  @OneToOne(() => CheckIn, (c) => c.booking)
  checkIn?: any;
}

@Entity('booking_lines')
export class BookingLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  bookingId: number;

  @ManyToOne(() => Booking, (b: Booking) => b.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'varchar', length: 16 })
  kind: BookingLineKind;

  @Column({ type: 'varchar', length: 140 })
  label: string;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'int' })
  unitCents: number;

  @Column({ type: 'int' })
  amountCents: number;

  @Column({ type: 'int', nullable: true })
  menuItemId: number | null;
}

@Entity('rental_holds')
@Unique(['bookingId', 'skateSizeId'])
export class RentalHold {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  bookingId: number;

  @ManyToOne(() => Booking, (b: Booking) => b.rentals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'int' })
  skateSizeId: number;

  @ManyToOne(() => SkateSize)
  @JoinColumn({ name: 'skateSizeId' })
  skateSize?: SkateSize;

  @Column({ type: 'int' })
  qty: number;
}

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 16, default: 'addon' })
  kind: string;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}

@Entity('check_ins')
export class CheckIn {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  bookingId: number;

  @OneToOne(() => Booking, (b) => b.checkIn)
  @JoinColumn({ name: 'bookingId' })
  booking?: any;

  @Column({ type: 'int' })
  staffUserId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'staffUserId' })
  staff?: User;

  @Column({ type: 'varchar', length: 12 })
  code: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  scannedAt: Date;
}

@Entity('reviews')
@Unique(['bookingId'])
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'int' })
  rinkId: number;

  @ManyToOne(() => Rink)
  @JoinColumn({ name: 'rinkId' })
  rink?: Rink;

  @Column({ type: 'int' })
  bookingId: number;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'varchar', length: 2000, default: '' })
  comment: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int', nullable: true })
  bookingId: number | null;

  @Column({ type: 'varchar', length: 180 })
  toAddr: string;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'varchar', length: 4000, default: '' })
  body: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity('favorites')
@Unique(['userId', 'rinkId'])
export class Favorite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int' })
  rinkId: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

export const ALL_ENTITIES = [
  User,
  Rink,
  SessionSlot,
  SkateSize,
  Booking,
  BookingLine,
  RentalHold,
  MenuItem,
  CheckIn,
  Review,
  EmailLog,
  Favorite,
];
