import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-staff-dash',
  imports: [RouterLink],
  template: `
    <div class="page container">
      <h1>Staff</h1>
      <nav class="staff-nav">
        <a routerLink="/staff/pistas" class="btn btn-secondary btn-sm">Pistas</a>
        <a routerLink="/staff/franjas" class="btn btn-secondary btn-sm">Franjas</a>
        <a routerLink="/staff/inventario" class="btn btn-secondary btn-sm">Inventario</a>
        <a routerLink="/staff/check-in" class="btn btn-secondary btn-sm">Check-in</a>
      </nav>
      <div class="kpi-row">
        <div class="kpi"><strong>{{ kpis().sessions }}</strong><br />sesiones</div>
        <div class="kpi"><strong>{{ kpis().skaters }}</strong><br />patinadores</div>
        <div class="kpi"><strong>{{ eur(kpis().revenueCents) }}</strong><br />ingresos</div>
      </div>
      <svg class="chart" viewBox="0 0 640 220" role="img" aria-label="Ocupación 7 días">
        <line x1="40" y1="180" x2="620" y2="180" stroke="currentColor" />
        <line x1="40" y1="20" x2="40" y2="180" stroke="currentColor" />
        @for (p of points(); track p.date) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="5" fill="var(--color-primary)">
            <title>{{ p.date }} · {{ p.occupied }} plazas · {{ eur(p.revenueCents) }}</title>
          </circle>
          <text [attr.x]="p.x" y="200" font-size="11" text-anchor="middle">{{ p.date.slice(5) }}</text>
        }
        @if (points().length > 1) {
          <polyline fill="none" stroke="var(--color-primary)" stroke-width="2" [attr.points]="poly()" />
        }
      </svg>
    </div>
  `,
})
export class StaffDashboardPageComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly kpis = signal({ sessions: 0, skaters: 0, revenueCents: 0, pending: 0 });
  protected readonly points = signal<{ date: string; occupied: number; revenueCents: number; x: number; y: number }[]>([]);

  ngOnInit(): void {
    this.api.staffStats().subscribe({
      next: (res) => {
        this.kpis.set(res.kpis || this.kpis());
        const series = res.series || [];
        const max = Math.max(1, ...series.map((s) => s.occupied));
        this.points.set(
          series.map((s, i) => ({
            ...s,
            x: 40 + (i * 560) / Math.max(1, series.length - 1),
            y: 180 - (s.occupied / max) * 150,
          })),
        );
      },
    });
  }

  poly(): string {
    return this.points().map((p) => `${p.x},${p.y}`).join(' ');
  }
}
