import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Item_Provider } from '../../modules/shared/RestModels';
import { RouterModule } from '@angular/router';
import { mergeMap } from 'rxjs';
import { BaseComponent } from '../../modules/shared/base/base.component';

@Component({
  selector: 'app-list-item-provider',
  imports: [CommonModule, RouterModule],
  templateUrl: './list-item-provider.component.html',
  styleUrl: './list-item-provider.component.css'
})
export class ListItemProviderComponent extends BaseComponent implements OnInit {
  item_provider_rest: RestSimple<Item_Provider> = this.rest.initRestSimple<Item_Provider>('item_provider');
  item_provider_list: Item_Provider[] = [];

  ngOnInit() {
    this.is_loading = true;
    this.subs.sink = this.route.paramMap.pipe(
      mergeMap((_paramMap) => {
        return this.item_provider_rest.search({ limit: 99999 });
      })
    ).subscribe((response) => {
      this.is_loading = false;
      this.item_provider_list = response.data;
    });
  }
}
