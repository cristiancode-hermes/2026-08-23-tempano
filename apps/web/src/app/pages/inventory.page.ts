import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import type { SkateSize } from '../shared/models';

@Component({
  selector: 'app-inventory',
  template: `
    <div class="page container">
      <h1>Inventario de tallas</h1>
      @for (s of items(); track s.id) {
        <div class="admin-row">
          <span>EU {{ s.sizeEu }}</span>
          <span>total {{ s.stockTotal }} · reservado {{ s.stockReserved }} · libre {{ s.available }}</span>
          <button class="btn btn-ghost btn-sm" type="button" (click)="bump(s, 1)">+1</button>
        </div>
      }
    </div>
  `,
})
export class InventoryPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<SkateSize[]>([]);
  ngOnInit(): void {
    this.refresh();
  }
  refresh(): void {
    this.api.sizes().subscribe({ next: (r) => this.items.set(r.items || []) });
  }
  bump(s: SkateSize, d: number): void {
    this.api.updateStock(s.id, s.stockTotal + d).subscribe({ next: () => this.refresh() });
  }
}
