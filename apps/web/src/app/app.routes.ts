import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent) },
  { path: 'entrar', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent) },
  { path: 'registro', loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPageComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePageComponent) },
      { path: 'sesion/:code', loadComponent: () => import('./pages/session-ticket.page').then((m) => m.SessionTicketPageComponent) },
      { path: 'pistas', loadComponent: () => import('./pages/rinks-catalogue.page').then((m) => m.RinksCataloguePageComponent) },
      { path: 'pistas/:id', loadComponent: () => import('./pages/rink-detail.page').then((m) => m.RinkDetailPageComponent) },
      { path: 'pistas/:id/resena', canActivate: [authGuard], loadComponent: () => import('./pages/review-form.page').then((m) => m.ReviewFormPageComponent) },
      { path: 'checkout/:slotId', canActivate: [authGuard], loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutPageComponent) },
      { path: 'reservas/:id/confirmacion', canActivate: [authGuard], loadComponent: () => import('./pages/confirmation.page').then((m) => m.ConfirmationPageComponent) },
      { path: 'mis-sesiones', canActivate: [authGuard], loadComponent: () => import('./pages/my-bookings.page').then((m) => m.MyBookingsPageComponent) },
      { path: 'mis-sesiones/:id', canActivate: [authGuard], loadComponent: () => import('./pages/booking-detail.page').then((m) => m.BookingDetailPageComponent) },
      { path: 'cuenta', canActivate: [authGuard], loadComponent: () => import('./pages/account.page').then((m) => m.AccountPageComponent) },
      { path: 'staff', canActivate: [authGuard, roleGuard(['staff', 'admin'])], loadComponent: () => import('./pages/staff-dashboard.page').then((m) => m.StaffDashboardPageComponent) },
      { path: 'staff/pistas', canActivate: [authGuard, roleGuard(['staff', 'admin'])], loadComponent: () => import('./pages/rink-admin.page').then((m) => m.RinkAdminPageComponent) },
      { path: 'staff/franjas', canActivate: [authGuard, roleGuard(['staff', 'admin'])], loadComponent: () => import('./pages/slot-admin.page').then((m) => m.SlotAdminPageComponent) },
      { path: 'staff/inventario', canActivate: [authGuard, roleGuard(['staff', 'admin'])], loadComponent: () => import('./pages/inventory.page').then((m) => m.InventoryPageComponent) },
      { path: 'staff/check-in', canActivate: [authGuard, roleGuard(['staff', 'admin'])], loadComponent: () => import('./pages/check-in.page').then((m) => m.CheckInPageComponent) },
      { path: '**', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPageComponent) },
    ],
  },
];
