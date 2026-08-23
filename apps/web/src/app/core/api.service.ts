import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { MenuItem, Rink, SkateSize, SlotView } from '../shared/models';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  featured(date?: string) {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<{ items: Rink[]; freeSlotsToday: number }>(`${API}/rinks/featured`, { params });
  }

  rinks(q?: { mode?: string; q?: string; date?: string }) {
    let params = new HttpParams();
    if (q?.mode) params = params.set('mode', q.mode);
    if (q?.q) params = params.set('q', q.q);
    if (q?.date) params = params.set('date', q.date);
    return this.http.get<{ items: Rink[]; total: number; freeSlotsToday: number }>(`${API}/rinks`, { params });
  }

  rink(id: number) {
    return this.http.get<{ rink: Rink; ratingAvg: number; ratingCount: number }>(`${API}/rinks/${id}`);
  }

  slots(rinkId: number, date: string) {
    return this.http.get<{ slots: SlotView[] }>(`${API}/rinks/${rinkId}/slots`, {
      params: new HttpParams().set('date', date),
    });
  }

  slot(id: number) {
    return this.http.get<{ slot: SlotView; rink: Rink }>(`${API}/slots/${id}`);
  }

  menu() {
    return this.http.get<{ items: MenuItem[] }>(`${API}/menu`);
  }

  sizes() {
    return this.http.get<{ items: SkateSize[] }>(`${API}/skate-sizes`);
  }

  hold(body: {
    slotId: number;
    partySize: number;
    rentals: { sizeEu: number; qty: number }[];
    ownSkatesCount: number;
    addonIds: number[];
  }) {
    return this.http.post<{ booking: any; expiresAt: string; lines: any[]; rentals: any[]; totalCents: number }>(
      `${API}/bookings/hold`,
      body,
    );
  }

  confirm(id: number, paymentNonce = 'sim-ok') {
    return this.http.post<any>(`${API}/bookings/${id}/confirm`, { paymentNonce });
  }

  bookings(status?: string) {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<{ items: any[]; total: number }>(`${API}/bookings`, { params });
  }

  booking(id: number) {
    return this.http.get<any>(`${API}/bookings/${id}`);
  }

  cancel(id: number) {
    return this.http.post<any>(`${API}/bookings/${id}/cancel`, {});
  }

  reviews(rinkId: number) {
    return this.http.get<{ items: any[]; avg: number; count: number }>(`${API}/rinks/${rinkId}/reviews`);
  }

  createReview(rinkId: number, body: { rating: number; comment?: string }) {
    return this.http.post(`${API}/rinks/${rinkId}/reviews`, body);
  }

  toggleFavorite(rinkId: number) {
    return this.http.post(`${API}/favorites`, { rinkId });
  }

  staffStats() {
    return this.http.get<{ kpis: any; series: { date: string; occupied: number; revenueCents: number }[] }>(
      `${API}/staff/stats`,
    );
  }

  checkIn(code: string) {
    return this.http.post(`${API}/staff/check-in`, { code });
  }

  updateStock(id: number, stockTotal: number) {
    return this.http.patch(`${API}/skate-sizes/${id}`, { stockTotal });
  }

  generateSlots(rinkId: number, date: string, times: string[]) {
    return this.http.post(`${API}/rinks/${rinkId}/slots/generate`, { date, times });
  }

  blockSlot(id: number, blocked: boolean) {
    return this.http.patch(`${API}/slots/${id}/block`, { blocked });
  }

  emails() {
    return this.http.get<{ items?: any[] }>(`${API}/auth/me`);
  }
}
