import { Component, computed, HostListener, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { MenuItem, Rink, SkateSize, SlotView } from '../shared/models';
import { FormatBase } from '../shared/format';
import { RENTAL_CENTS } from '../shared/models';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule],
  template: `
    <div class="page container">
      @if (error()) { <p style="color:var(--color-danger)">{{ error() }}</p> }
      @if (!slot()) { <p>Cargando franja…</p> }
      @if (slot(); as s) {
        <h1>Checkout · {{ rink()?.name }} {{ s.startTime }}</h1>
        <p>{{ s.remainingSpots }} plazas libres</p>
        <div class="checkout-grid">
          <div>
            <label class="field">Grupo
              <input type="number" min="1" [ngModel]="partySize()" (ngModelChange)="partySize.set(+$event)" />
            </label>
            <label class="field">Traigo mis patines
              <input type="number" min="0" [ngModel]="ownSkates()" (ngModelChange)="ownSkates.set(+$event)" />
            </label>
            <h3>Tallas EU</h3>
            <div class="size-stepper">
              @for (sz of sizes(); track sz.id) {
                <div class="size-chip">
                  <span>{{ sz.sizeEu }}</span>
                  <span class="text-sm">{{ sz.available }}</span>
                  <div>
                    <button type="button" class="btn btn-ghost btn-sm" [disabled]="qty(sz.sizeEu)===0" (click)="bump(sz.sizeEu, -1)">−</button>
                    <span>{{ qty(sz.sizeEu) }}</span>
                    <button type="button" class="btn btn-ghost btn-sm" [disabled]="sz.available===0" (click)="bump(sz.sizeEu, 1)">+</button>
                  </div>
                </div>
              }
            </div>
            <h3 class="mt-4">Extras</h3>
            @for (m of menu(); track m.id) {
              <label class="check-row">
                <input type="checkbox" [checked]="addonIds().includes(m.id)" (change)="toggleAddon(m.id)" />
                {{ m.name }} · {{ eur(m.priceCents) }}
              </label>
            }
          </div>
          <aside class="summary-panel">
            <h3>Resumen</h3>
            <ul class="summary-lines">
              @for (line of liveLines(); track line.label) {
                <li>{{ line.label }} · {{ eur(line.amount) }}</li>
              }
            </ul>
            <p class="total">{{ eur(liveTotalCents()) }}</p>
            @if (booking()) {
              <p class="hold-timer">{{ mmss(holdSecondsLeft()) }}</p>
              <button class="btn btn-primary" type="button" (click)="pay()">Pagar y confirmar</button>
            } @else {
              <button class="btn btn-primary" type="button" [disabled]="!coverageOk() || busy()" (click)="hold()">
                Retener 15 min
              </button>
            }
          </aside>
        </div>
      }
    </div>
  `,
})
export class CheckoutPageComponent extends FormatBase implements OnInit, OnDestroy {
  readonly slotId = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly slot = signal<SlotView | null>(null);
  protected readonly rink = signal<Rink | null>(null);
  protected readonly sizes = signal<SkateSize[]>([]);
  protected readonly menu = signal<MenuItem[]>([]);
  protected readonly partySize = signal(2);
  protected readonly ownSkates = signal(0);
  protected readonly rentals = signal<Record<number, number>>({});
  protected readonly addonIds = signal<number[]>([]);
  protected readonly booking = signal<any>(null);
  protected readonly expiresAt = signal<string | null>(null);
  protected readonly now = signal(Date.now());
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private timer: ReturnType<typeof setInterval> | null = null;

  protected readonly rentalQty = computed(() =>
    Object.values(this.rentals()).reduce((s, q) => s + q, 0),
  );
  protected readonly coverageOk = computed(
    () => this.ownSkates() + this.rentalQty() === this.partySize() && this.partySize() >= 1,
  );
  protected readonly liveLines = computed(() => {
    const r = this.rink();
    const lines: { label: string; amount: number }[] = [];
    if (!r) return lines;
    if (r.mode === 'public') {
      lines.push({ label: `Sesión × ${this.partySize()}`, amount: r.priceCents * this.partySize() });
    } else {
      lines.push({ label: 'Hielo privado', amount: r.priceCents });
    }
    if (this.rentalQty()) {
      lines.push({ label: `Patines × ${this.rentalQty()}`, amount: this.rentalQty() * RENTAL_CENTS });
    }
    for (const m of this.menu().filter((x) => this.addonIds().includes(x.id))) {
      lines.push({ label: m.name, amount: m.priceCents });
    }
    return lines;
  });
  protected readonly liveTotalCents = computed(() => this.liveLines().reduce((s, l) => s + l.amount, 0));
  protected readonly holdSecondsLeft = computed(() => {
    const exp = this.expiresAt();
    if (!exp) return 0;
    return Math.max(0, (new Date(exp).getTime() - this.now()) / 1000);
  });

  ngOnInit(): void {
    this.api.slot(Number(this.slotId())).subscribe({
      next: (res) => {
        this.slot.set(res.slot);
        this.rink.set(res.rink);
      },
      error: () => this.error.set('Franja no encontrada'),
    });
    this.api.sizes().subscribe({ next: (r) => this.sizes.set(r.items || []) });
    this.api.menu().subscribe({ next: (r) => this.menu.set(r.items || []) });
    this.timer = setInterval(() => this.now.set(Date.now()), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  @HostListener('document:visibilitychange')
  @HostListener('window:focus')
  resync(): void {
    this.now.set(Date.now());
  }

  qty(eu: number): number {
    return this.rentals()[eu] || 0;
  }

  bump(eu: number, d: number): void {
    const next = { ...this.rentals() };
    next[eu] = Math.max(0, (next[eu] || 0) + d);
    this.rentals.set(next);
  }

  toggleAddon(id: number): void {
    const cur = this.addonIds();
    this.addonIds.set(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  hold(): void {
    const s = this.slot();
    if (!s || !this.coverageOk()) return;
    this.busy.set(true);
    this.error.set('');
    const rentals = Object.entries(this.rentals())
      .filter(([, q]) => q > 0)
      .map(([eu, q]) => ({ sizeEu: Number(eu), qty: q }));
    this.api
      .hold({
        slotId: s.id,
        partySize: this.partySize(),
        rentals,
        ownSkatesCount: this.ownSkates(),
        addonIds: this.addonIds(),
      })
      .subscribe({
        next: (res) => {
          this.booking.set(res.booking);
          this.expiresAt.set(res.expiresAt);
          this.busy.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'No se pudo retener');
          this.busy.set(false);
        },
      });
  }

  pay(): void {
    const b = this.booking();
    if (!b) return;
    this.api.confirm(b.id).subscribe({
      next: (res) => {
        const id = res.id || res.booking?.id || b.id;
        void this.router.navigate(['/reservas', id, 'confirmacion']);
      },
      error: (err) => this.error.set(err?.error?.message || 'Pago rechazado'),
    });
  }
}
