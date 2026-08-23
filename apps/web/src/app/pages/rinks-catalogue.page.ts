import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { Rink } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-rinks',
  imports: [RouterLink],
  template: `
    <div class="page container">
      <header class="page-header">
        <div>
          <h1>Pistas</h1>
          <p class="lead">{{ freeToday() }} huecos hoy — misma cifra que en inicio.</p>
        </div>
      </header>
      @if (loading()) { <p>Cargando catálogo…</p> }
      @if (error()) { <p>{{ error() }} <button class="btn btn-ghost" type="button" (click)="load()">Reintentar</button></p> }
      @if (!loading() && !items().length) { <p>No hay pistas. <a routerLink="/">Volver</a></p> }
      <div class="editorial-list">
        @for (r of items(); track r.id) {
          <a class="editorial-item" [routerLink]="['/pistas', r.id]">
            <img [src]="r.photos?.[0] || fallback" [alt]="r.name" />
            <div class="editorial-body">
              <h2>{{ r.name }}</h2>
              <p>{{ r.description }}</p>
              <p class="text-ink">{{ r.freeSlotsToday ?? 0 }} huecos hoy · aforo {{ r.capacity }} · {{ eur(r.priceCents) }}</p>
            </div>
          </a>
        }
      </div>
    </div>
  `,
})
export class RinksCataloguePageComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<Rink[]>([]);
  protected readonly freeToday = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  readonly fallback = '/assets/norte.jpg';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.rinks().subscribe({
      next: (res) => {
        this.items.set(res.items || []);
        this.freeToday.set(res.freeSlotsToday ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar pistas');
        this.loading.set(false);
      },
    });
  }
}
