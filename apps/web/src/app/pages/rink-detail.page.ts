import { Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { Rink, SlotView } from '../shared/models';
import { FormatBase, addDays, madridToday } from '../shared/format';

@Component({
  selector: 'app-rink-detail',
  imports: [RouterLink],
  template: `
    <div class="page container">
      @if (loading()) { <p>Cargando pista…</p> }
      @if (error()) { <p>{{ error() }} <button class="btn btn-ghost" type="button" (click)="load()">Reintentar</button></p> }
      @if (notFound()) { <p>Pista no encontrada. <a routerLink="/pistas">Volver al catálogo</a></p> }
      @if (rink(); as r) {
        <div class="detail-split">
          <img class="detail-photo" [src]="r.photos?.[0] || fallback" [alt]="r.name" />
          <div>
            <h1>{{ r.name }}</h1>
            <p>{{ r.mode === 'public' ? 'Sesión pública, aforo compartido' : 'Hielo privado, un grupo' }}</p>
            <p>{{ r.description }}</p>
            <p class="text-ink">{{ eur(r.priceCents) }} · {{ r.freeSlotsToday ?? 0 }} huecos hoy</p>
            <a class="btn btn-secondary" [routerLink]="['/pistas', r.id, 'resena']">Escribir reseña</a>
          </div>
        </div>
        <h2 class="mt-5">Franjas</h2>
        <div class="filters">
          @for (d of days; track d) {
            <button type="button" class="btn btn-ghost btn-sm" [class.btn-primary]="date() === d" (click)="pick(d)">{{ dateFmt(d) }}</button>
          }
        </div>
        <div class="slot-grid">
          @for (s of slots(); track s.id) {
            @if (s.status === 'completa' || s.blocked) {
              <div class="slot-chip completa" aria-disabled="true">
                <span class="slot-time">{{ s.startTime }}</span>
                <span class="slot-state">Completa</span>
              </div>
            } @else {
              <a class="slot-chip" [routerLink]="['/checkout', s.id]">
                <span class="slot-time">{{ s.startTime }}</span>
                <span class="slot-state">{{ s.remainingSpots }} plazas</span>
              </a>
            }
          }
        </div>
      }
    </div>
  `,
})
export class RinkDetailPageComponent extends FormatBase implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  protected readonly rink = signal<Rink | null>(null);
  protected readonly slots = signal<SlotView[]>([]);
  protected readonly date = signal(madridToday());
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly notFound = signal(false);
  readonly fallback = '/assets/norte.jpg';
  readonly days = Array.from({ length: 14 }, (_, i) => addDays(madridToday(), i));

  ngOnInit(): void {
    this.load();
  }

  pick(d: string): void {
    this.date.set(d);
    this.loadSlots();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.notFound.set(false);
    this.api.rink(Number(this.id())).subscribe({
      next: (res) => {
        this.rink.set(res.rink);
        this.loading.set(false);
        this.loadSlots();
      },
      error: (err) => {
        this.notFound.set(err?.status === 404);
        this.error.set(err?.status === 404 ? '' : 'Error inesperado');
        this.loading.set(false);
      },
    });
  }

  loadSlots(): void {
    const r = this.rink();
    if (!r) return;
    this.api.slots(r.id, this.date()).subscribe({
      next: (res) => this.slots.set(res.slots || []),
    });
  }
}
