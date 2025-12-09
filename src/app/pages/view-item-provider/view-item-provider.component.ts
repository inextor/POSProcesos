import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Item_Provider } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/services/Rest';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { mergeMap, of } from 'rxjs';

@Component({
  selector: 'app-view-item-provider',
  imports: [CommonModule, RouterModule],
  templateUrl: './view-item-provider.component.html',
  styleUrl: './view-item-provider.component.css'
})
export class ViewItemProviderComponent extends BaseComponent implements OnInit {
  item_provider_rest: RestSimple<Item_Provider> = this.rest.initRestSimple('item_provider');
  item_provider = GetEmpty.item_provider();

  ngOnInit() {
    this.is_loading = true;
    this.subs.sink = this.route.paramMap.pipe(
      mergeMap((paramMap) => {
        return paramMap.has('id')
          ? this.item_provider_rest.get(paramMap.get('id'))
          : of(GetEmpty.item_provider());
      })
    ).subscribe((response) => {
      this.is_loading = false;
      this.item_provider = response;
    });
  }
}
