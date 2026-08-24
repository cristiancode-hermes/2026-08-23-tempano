import { Component, inject, input, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { STATUS_LABELS } from '../shared/models';

@Component({
  selector: 'app-session-ticket',
  imports: [RouterLink],
  template: `
    <div class="page container confirm-wrap">
      <p class="text-sm text-muted">Ticket de sesión</p>
      @if (error()) {
        <h1>Sesión no encontrada</h1>
        <p>{{ error() }}</p>
        <a class="btn btn-secondary" routerLink="/">Volver al inicio</a>
      }
      @if (ticket(); as t) {
        <h1>{{ t.code }}</h1>
        <p>{{ labels[t.status] || t.status }} · {{ t.rink?.name }} · {{ t.slot?.date }} {{ t.slot?.startTime }}</p>
        <p class="text-ink">{{ t.partySize }} pers.</p>
        @if (qr()) {
          <div class="qr-box" [innerHTML]="qr()"></div>
        }
        @if (t.qrUrl) {
          <p class="text-sm"><a [href]="t.qrUrl">{{ t.qrUrl }}</a></p>
        }
        <a class="btn btn-primary" [routerLink]="['/mis-sesiones', t.id]">Abrir mi reserva</a>
      }
    </div>
  `,
})
export class SessionTicketPageComponent implements OnInit {
  readonly code = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly ticket = signal<any>(null);
  protected readonly qr = signal<SafeHtml | null>(null);
  protected readonly error = signal('');
  readonly labels = STATUS_LABELS;

  ngOnInit(): void {
    this.api.ticket(this.code()).subscribe({
      next: (row) => {
        this.ticket.set(row);
        if (row.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(row.qrSvg));
      },
      error: () => this.error.set('No hay una sesión con ese código.'),
    });
  }
}
