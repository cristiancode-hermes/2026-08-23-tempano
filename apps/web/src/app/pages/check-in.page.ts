import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-check-in',
  imports: [FormsModule],
  template: `
    <div class="page container">
      <h1>Check-in</h1>
      <label class="field">Código
        <input [ngModel]="code()" (ngModelChange)="code.set($event)" autocomplete="off" />
      </label>
      <button class="btn btn-primary" type="button" (click)="scan()">Escanear</button>
      @if (msg()) { <p class="success-box">{{ msg() }}</p> }
      @if (error()) { <p style="color:var(--color-danger)">{{ error() }}</p> }
    </div>
  `,
})
export class CheckInPageComponent {
  private readonly api = inject(ApiService);
  protected readonly code = signal('');
  protected readonly msg = signal('');
  protected readonly error = signal('');

  scan(): void {
    this.error.set('');
    this.api.checkIn(this.code().trim()).subscribe({
      next: () => this.msg.set('Entrada registrada'),
      error: (err) => this.error.set(err?.error?.message || 'Código inválido'),
    });
  }
}
