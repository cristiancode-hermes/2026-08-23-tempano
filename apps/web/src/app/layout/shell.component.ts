import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell" [class.nav-drawer-open]="menuOpen()">
      <header class="topnav">
        <div class="container topnav-inner">
          <a routerLink="/" class="brand" (click)="closeMenu()">
            <span class="brand-mark">T</span>
            <span>Témpano</span>
          </a>
          <ul class="nav-links" id="primary-nav" [class.open]="menuOpen()">
            <li>
              <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeMenu()">Inicio</a>
            </li>
            <li><a routerLink="/pistas" routerLinkActive="active" (click)="closeMenu()">Pistas</a></li>
            @if (auth.getToken()) {
              <li><a routerLink="/mis-sesiones" routerLinkActive="active" (click)="closeMenu()">Mis sesiones</a></li>
              <li><a routerLink="/cuenta" routerLinkActive="active" (click)="closeMenu()">Cuenta</a></li>
            }
            @if (auth.isStaff()) {
              <li><a routerLink="/staff" routerLinkActive="active" (click)="closeMenu()">Staff</a></li>
            }
            <li class="nav-drawer-actions">
              <button type="button" class="theme-toggle" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Modo claro' : 'Modo oscuro'">
                @if (theme.isDark()) {
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0 3.25a.75.75 0 0 0 .75-.75v-1a.75.75 0 0 0-1.5 0v1c0 .41.34.75.75.75Zm0-15.5a.75.75 0 0 0 .75-.75v-1a.75.75 0 0 0-1.5 0v1c0 .41.34.75.75.75ZM5.47 18.53a.75.75 0 0 0 1.06 0l.71-.7a.75.75 0 1 0-1.06-1.07l-.71.71a.75.75 0 0 0 0 1.06Zm11.29-11.3a.75.75 0 0 0 1.06 0l.71-.7a.75.75 0 1 0-1.06-1.07l-.71.71a.75.75 0 0 0 0 1.06ZM3.5 12.75h1a.75.75 0 0 0 0-1.5h-1a.75.75 0 0 0 0 1.5Zm15 0h1a.75.75 0 0 0 0-1.5h-1a.75.75 0 0 0 0 1.5ZM5.47 5.47a.75.75 0 0 0 0 1.06l.71.71A.75.75 0 1 0 7.24 6.17l-.71-.71a.75.75 0 0 0-1.06 0Zm11.29 11.3a.75.75 0 0 0 0 1.06l.71.71a.75.75 0 1 0 1.06-1.06l-.71-.71a.75.75 0 0 0-1.06 0Z"/></svg>
                } @else {
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.5 13.5A7.5 7.5 0 0 1 10 4.07 8.5 8.5 0 1 0 19.93 14 7.46 7.46 0 0 1 16.5 13.5Z"/></svg>
                }
              </button>
              @if (auth.getToken()) {
                <button type="button" class="btn btn-secondary btn-sm" (click)="auth.logout(); closeMenu()">Salir</button>
              } @else {
                <a routerLink="/login" class="btn btn-secondary btn-sm" (click)="closeMenu()">Entrar</a>
                <a routerLink="/registro" class="btn btn-primary btn-sm" (click)="closeMenu()">Registro</a>
              }
            </li>
          </ul>
          <div class="nav-actions desktop-only">
            <button type="button" class="theme-toggle" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Modo claro' : 'Modo oscuro'">
              @if (theme.isDark()) {
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0 3.25a.75.75 0 0 0 .75-.75v-1a.75.75 0 0 0-1.5 0v1c0 .41.34.75.75.75Zm0-15.5a.75.75 0 0 0 .75-.75v-1a.75.75 0 0 0-1.5 0v1c0 .41.34.75.75.75ZM5.47 18.53a.75.75 0 0 0 1.06 0l.71-.7a.75.75 0 1 0-1.06-1.07l-.71.71a.75.75 0 0 0 0 1.06Zm11.29-11.3a.75.75 0 0 0 1.06 0l.71-.7a.75.75 0 1 0-1.06-1.07l-.71.71a.75.75 0 0 0 0 1.06ZM3.5 12.75h1a.75.75 0 0 0 0-1.5h-1a.75.75 0 0 0 0 1.5Zm15 0h1a.75.75 0 0 0 0-1.5h-1a.75.75 0 0 0 0 1.5ZM5.47 5.47a.75.75 0 0 0 0 1.06l.71.71A.75.75 0 1 0 7.24 6.17l-.71-.71a.75.75 0 0 0-1.06 0Zm11.29 11.3a.75.75 0 0 0 0 1.06l.71.71a.75.75 0 1 0 1.06-1.06l-.71-.71a.75.75 0 0 0-1.06 0Z"/></svg>
              } @else {
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.5 13.5A7.5 7.5 0 0 1 10 4.07 8.5 8.5 0 1 0 19.93 14 7.46 7.46 0 0 1 16.5 13.5Z"/></svg>
              }
            </button>
            @if (auth.getToken()) {
              <span class="user-chip">
                <strong>{{ auth.user()?.username }}</strong>
                <span class="points-chip">{{ auth.user()?.points ?? 0 }} pts</span>
              </span>
              <button type="button" class="btn btn-secondary btn-sm" (click)="auth.logout()">Salir</button>
            } @else {
              <a routerLink="/login" class="btn btn-secondary btn-sm">Entrar</a>
              <a routerLink="/registro" class="btn btn-primary btn-sm">Registro</a>
            }
          </div>
          <button type="button" class="nav-toggle" (click)="menuOpen.update((v) => !v)" [attr.aria-expanded]="menuOpen()" aria-controls="primary-nav">
            <span class="nav-toggle-bars" [class.open]="menuOpen()"><span></span><span></span><span></span></span>
          </button>
        </div>
      </header>
      @if (menuOpen()) {
        <button type="button" class="nav-backdrop" aria-label="Cerrar menú" (click)="closeMenu()"></button>
      }
      <main class="app-main"><router-outlet /></main>
      <footer class="site-footer">
        <div class="container">
          <span>© Témpano — el hielo se comparte. La talla, no.</span>
          <span class="text-sm">Niebla de Dársena · Europe/Madrid</span>
        </div>
      </footer>
    </div>
  `,
})
export class ShellComponent implements OnInit {
  public readonly auth = inject(AuthService);
  public readonly theme = inject(ThemeService);
  protected readonly menuOpen = signal(false);

  ngOnInit(): void {
    this.closeMenu();
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined' && window.innerWidth > 800) this.closeMenu();
  }
}
