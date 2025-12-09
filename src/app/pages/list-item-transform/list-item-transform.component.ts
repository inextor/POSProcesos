import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Item_Transform } from '../../modules/shared/RestModels';
import { RouterModule } from '@angular/router';
import { mergeMap } from 'rxjs';
import { BaseComponent } from '../../modules/shared/base/base.component';

@Component({
  selector: 'app-list-item-transform',
  imports: [CommonModule, RouterModule],
  templateUrl: './list-item-transform.component.html',
  styleUrl: './list-item-transform.component.css'
})
export class ListItemTransformComponent extends BaseComponent implements OnInit {
  item_transform_rest: RestSimple<Item_Transform> = this.rest.initRestSimple<Item_Transform>('item_transform');
  item_transform_list: Item_Transform[] = [];

  ngOnInit() {
    this.is_loading = true;
    this.subs.sink = this.route.paramMap.pipe(
      mergeMap((_paramMap) => {
        return this.item_transform_rest.search({ limit: 99999 });
      })
    ).subscribe((response) => {
      this.is_loading = false;
      this.item_transform_list = response.data;
    });
  }
}
