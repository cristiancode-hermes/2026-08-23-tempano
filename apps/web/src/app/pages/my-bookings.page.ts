import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase } from '../shared/format';
import { STATUS_LABELS } from '../shared/models';

@Component({
  selector: 'app-my-bookings',
  imports: [RouterLink],
  template: `
    <div class="page container">
      <h1>Mis sesiones</h1>
      @if (loading()) { <p>Cargando…</p> }
      @if (!loading() && !items().length) { <p>Aún no tienes sesiones. <a routerLink="/pistas">Reservar</a></p> }
      <ul class="booking-list">
        @for (b of items(); track b.id) {
          <li>
            <a class="booking-row" [routerLink]="['/mis-sesiones', b.id]">
              <span>{{ b.rink?.name }} · {{ b.slot?.date }} {{ b.slot?.startTime }}</span>
              <span>{{ labels[b.status] || b.status }}</span>
              <span>{{ b.partySize }} pers.</span>
              <span>{{ eur(b.totalCents) }}</span>
            </a>
          </li>
        }
      </ul>
    </div>
  `,
})
export class MyBookingsPageComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<any[]>([]);
  protected readonly loading = signal(true);
  readonly labels = STATUS_LABELS;

  ngOnInit(): void {
    this.api.bookings().subscribe({
      next: (res) => {
        this.items.set(res.items || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
