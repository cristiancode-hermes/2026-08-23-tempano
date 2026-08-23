import { Component, inject, input, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase } from '../shared/format';
import { STATUS_LABELS } from '../shared/models';

@Component({
  selector: 'app-booking-detail',
  imports: [RouterLink],
  template: `
    <div class="page container">
      @if (error()) { <p>{{ error() }} <a routerLink="/mis-sesiones">Volver</a></p> }
      @if (booking(); as b) {
        <h1>{{ b.code || 'Sesión' }}</h1>
        <p>{{ labels[b.status] }} · {{ b.rink?.name }} · {{ b.slot?.date }} {{ b.slot?.startTime }}</p>
        <ul class="summary-lines">
          @for (l of b.lines || []; track l.label) {
            <li>{{ l.label }} · {{ eur(l.amountCents || l.qty * (l.unitCents || l.unitPriceCents || 0)) }}</li>
          }
        </ul>
        <p class="total">{{ eur(b.totalCents) }}</p>
        @if (qr()) { <div class="qr-box" [innerHTML]="qr()"></div> }
        @if (b.status === 'pending' || b.status === 'confirmed') {
          <button class="btn btn-danger" type="button" (click)="cancel()">Cancelar</button>
        }
      }
    </div>
  `,
})
export class BookingDetailPageComponent extends FormatBase implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly booking = signal<any>(null);
  protected readonly qr = signal<SafeHtml | null>(null);
  protected readonly error = signal('');
  readonly labels = STATUS_LABELS;

  ngOnInit(): void {
    this.api.booking(Number(this.id())).subscribe({
      next: (b) => {
        const row = b.booking || b;
        this.booking.set(row);
        if (row.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(row.qrSvg));
      },
      error: () => this.error.set('Error inesperado'),
    });
  }

  cancel(): void {
    const b = this.booking();
    if (!b) return;
    this.api.cancel(b.id).subscribe({
      next: (res) => this.booking.set(res.booking || res),
      error: (err) => this.error.set(err?.error?.message || 'No se pudo cancelar'),
    });
  }
}
