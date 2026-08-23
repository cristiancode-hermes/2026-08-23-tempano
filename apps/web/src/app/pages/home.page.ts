import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { Rink } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="hero-band">
      <div class="container">
        <h1>Una hora sobre hielo. Tu talla, reservada.</h1>
        <p class="lead">Sesión pública en Norte o hielo privado en Sur. 15 minutos de retención y ticket QR en el móvil.</p>
        <p class="text-ink">{{ freeToday() }} huecos hoy en las dos pistas.</p>
        <a routerLink="/pistas" class="btn btn-primary">Reservar sesión</a>
      </div>
    </section>
    <section class="page band-alt">
      <div class="container">
        <h2>Pistas</h2>
        @if (loading()) { <p>Cargando…</p> }
        @if (error()) { <p>{{ error() }} <button class="btn btn-ghost" type="button" (click)="load()">Reintentar</button></p> }
        @if (!loading() && !featured().length) { <p>No hay pistas activas.</p> }
        <div class="editorial-list">
          @for (r of featured(); track r.id) {
            <a class="editorial-item" [routerLink]="['/pistas', r.id]">
              <img [src]="r.photos?.[0] || fallback" [alt]="r.name" />
              <div class="editorial-body">
                <h3>{{ r.name }}</h3>
                <p>{{ r.mode === 'public' ? 'Sesión pública' : 'Hielo privado' }} · {{ eur(r.priceCents) }}</p>
                <p class="text-ink">{{ r.freeSlotsToday ?? 0 }} huecos hoy</p>
              </div>
            </a>
          }
        </div>
      </div>
    </section>
  `,
})
export class HomePageComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly featured = signal<Rink[]>([]);
  protected readonly freeToday = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  readonly fallback = '/assets/norte.jpg';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.featured().subscribe({
      next: (res) => {
        this.featured.set(res.items || []);
        this.freeToday.set(res.freeSlotsToday ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el hielo.');
        this.loading.set(false);
      },
    });
  }
}
