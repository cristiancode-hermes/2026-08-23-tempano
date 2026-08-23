import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-brand-panel">
      <aside class="auth-brand">
        <h1>Témpano</h1>
        <p>Reserva tu sesión y tu talla.</p>
      </aside>
      <div class="auth-form-side">
        <form class="auth-form-inner" (ngSubmit)="submit()">
          <h2>Registro</h2>
          <label class="field">Usuario
            <input name="username" autocomplete="off" [ngModel]="username()" (ngModelChange)="username.set($event)" />
          </label>
          <label class="field">Email
            <input name="email" autocomplete="off" [ngModel]="email()" (ngModelChange)="email.set($event)" />
          </label>
          <label class="field">Contraseña
            <input name="password" type="password" autocomplete="new-password" [ngModel]="password()" (ngModelChange)="password.set($event)" />
          </label>
          @if (error()) {
            <p class="text-sm" style="color: var(--color-danger)">{{ error() }}</p>
          }
          <button class="btn btn-primary" type="submit" [disabled]="!canSubmit() || loading()">
            {{ loading() ? 'Creando…' : 'Crear cuenta' }}
          </button>
          <p class="mt-3"><a routerLink="/login">Ya tengo cuenta</a></p>
        </form>
      </div>
    </div>
  `,
})
export class RegisterPageComponent {
  public auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly username = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly canSubmit = computed(
    () => this.username().trim().length >= 3 && this.email().includes('@') && this.password().length >= 6,
  );

  submit(): void {
    if (!this.canSubmit()) return;
    this.loading.set(true);
    this.auth
      .register({
        username: this.username().trim(),
        email: this.email().trim(),
        password: this.password(),
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigateByUrl('/');
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'No se pudo registrar');
        },
      });
  }
}
