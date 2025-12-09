import { Component, OnInit } from '@angular/core';
import { Item_Transform, Item } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/services/Rest';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, mergeMap, of } from 'rxjs';

@Component({
  selector: 'app-save-item-transform',
  imports: [FormsModule],
  templateUrl: './save-item-transform.component.html',
  styleUrl: './save-item-transform.component.css'
})
export class SaveItemTransformComponent extends BaseComponent implements OnInit {
  item_transform_rest: RestSimple<Item_Transform> = this.rest.initRestSimple('item_transform');
  item_rest: RestSimple<Item> = this.rest.initRestSimple('item');
  item_transform = GetEmpty.item_transform();
  item_list: Item[] = [];

  ngOnInit() {
    this.route.paramMap.pipe(
      mergeMap((paramMap) => {
        return forkJoin({
          item_transform: paramMap.has('id')
            ? this.item_transform_rest.get(paramMap.get('id'))
            : of(GetEmpty.item_transform()),
          items: this.item_rest.search({ limit: 9999999 })
        });
      })
    ).subscribe((response) => {
      this.is_loading = false;
      this.item_list = response.items.data;
      this.item_transform = response.item_transform;
    });
  }

  save(evt: Event) {
    this.is_loading = true;
    evt.preventDefault();
    evt.stopPropagation();

    if (this.item_transform.id) {
      this.item_transform_rest.update(this.item_transform)
        .subscribe((item_transform) => {
          this.is_loading = false;
          this.location.back();
        });
      return;
    }

    this.item_transform_rest.create(this.item_transform)
      .subscribe((item_transform) => {
        this.is_loading = false;
        this.location.back();
      });
  }
}
