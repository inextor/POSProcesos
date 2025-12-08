import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Store } from '../../modules/shared/RestModels/Store';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-clear-inventory',
  imports: [CommonModule, ModalComponent],
  templateUrl: './clear-inventory.component.html',
  styleUrl: './clear-inventory.component.css'
})
export class ClearInventoryComponent extends BaseComponent
{
  rest_store = this.rest.initRestSimple<Store>('store');
  stores: Store[] = [];
  selected_store_id: number | null = null;
  show_confirmation_modal: boolean = false;

  ngOnInit(): void
  {
    this.loadStores();
  }

  loadStores(): void
  {
    this.subs.sink = this.rest_store.search({limit: 99999, sort_order: ['name_ASC']}).subscribe({
      next: (response) =>
      {
        this.stores = response.data;
      },
      error: (error) =>
      {
        this.showError(error);
      }
    });
  }

  onStoreChange(event: Event): void
  {
    let target = event.target as HTMLSelectElement;
    this.selected_store_id = target.value ? parseInt(target.value) : null;
  }

  openConfirmationModal(): void
  {
    if (!this.selected_store_id)
    {
      this.showWarning('Por favor selecciona una sucursal');
      return;
    }

    this.show_confirmation_modal = true;
  }

  clearInventory(): void
  {
    if (!this.selected_store_id)
    {
      this.showWarning('Por favor selecciona una sucursal');
      return;
    }

    this.subs.sink = this.rest.update('clearStoreInventory', {
      store_id: this.selected_store_id
    }).subscribe({
      next: (response) =>
      {
        this.showSuccess('Inventario vaciado exitosamente');
        this.show_confirmation_modal = false;
        this.selected_store_id = null;
      },
      error: (error) =>
      {
        this.showError(error);
        this.show_confirmation_modal = false;
      }
    });
  }

  getSelectedStoreName(): string
  {
    if (!this.selected_store_id)
      return '';

    let store = this.stores.find(s => s.id === this.selected_store_id);
    return store ? store.name || '' : '';
  }
}
