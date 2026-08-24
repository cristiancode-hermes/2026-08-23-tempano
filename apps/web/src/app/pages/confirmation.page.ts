import { Component, inject, input, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-confirmation',
  imports: [RouterLink],
  template: `
    <div class="page container confirm-wrap">
      <h1>Sesión confirmada</h1>
      @if (error()) { <p>{{ error() }}</p> }
      @if (booking(); as b) {
        <p class="mono">{{ b.code }}</p>
        @if (qr()) {
          <div class="qr-box" [innerHTML]="qr()"></div>
        }
        @if (b.qrUrl) {
          <p class="text-sm"><a [href]="b.qrUrl">{{ b.qrUrl }}</a></p>
        }
        <p class="total">{{ eur(b.totalCents) }}</p>
        <a class="btn btn-primary" [routerLink]="['/mis-sesiones', b.id]">Ver detalle</a>
      }
    </div>
  `,
})
export class ConfirmationPageComponent extends FormatBase implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly booking = signal<any>(null);
  protected readonly qr = signal<SafeHtml | null>(null);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.api.booking(Number(this.id())).subscribe({
      next: (b) => {
        const row = b.booking || b;
        this.booking.set(row);
        if (row.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(row.qrSvg));
      },
      error: () => this.error.set('No encontramos esa reserva.'),
    });
  }
}
