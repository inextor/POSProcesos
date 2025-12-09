import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Item_Transform } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/services/Rest';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { mergeMap, of } from 'rxjs';

@Component({
  selector: 'app-view-item-transform',
  imports: [CommonModule, RouterModule],
  templateUrl: './view-item-transform.component.html',
  styleUrl: './view-item-transform.component.css'
})
export class ViewItemTransformComponent extends BaseComponent implements OnInit {
  item_transform_rest: RestSimple<Item_Transform> = this.rest.initRestSimple('item_transform');
  item_transform = GetEmpty.item_transform();

  ngOnInit() {
    this.is_loading = true;
    this.subs.sink = this.route.paramMap.pipe(
      mergeMap((paramMap) => {
        return paramMap.has('id')
          ? this.item_transform_rest.get(paramMap.get('id'))
          : of(GetEmpty.item_transform());
      })
    ).subscribe((response) => {
      this.is_loading = false;
      this.item_transform = response;
    });
  }
}
