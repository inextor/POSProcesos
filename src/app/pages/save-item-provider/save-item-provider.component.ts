import { Component, OnInit } from '@angular/core';
import { Item_Provider, Item, User } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/services/Rest';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, mergeMap, of } from 'rxjs';

@Component({
  selector: 'app-save-item-provider',
  imports: [FormsModule],
  templateUrl: './save-item-provider.component.html',
  styleUrl: './save-item-provider.component.css'
})
export class SaveItemProviderComponent extends BaseComponent implements OnInit {
  item_provider_rest: RestSimple<Item_Provider> = this.rest.initRestSimple('item_provider');
  item_rest: RestSimple<Item> = this.rest.initRestSimple('item');
  user_rest: RestSimple<User> = this.rest.initRestSimple('user');
  item_provider = GetEmpty.item_provider();
  item_list: Item[] = [];
  user_list: User[] = [];

  ngOnInit() {
    this.route.paramMap.pipe(
      mergeMap((paramMap) => {
        return forkJoin({
          item_provider: paramMap.has('id')
            ? this.item_provider_rest.get(paramMap.get('id'))
            : of(GetEmpty.item_provider()),
          items: this.item_rest.search({ limit: 9999999 }),
          users: this.user_rest.search({ limit: 9999999 })
        });
      })
    ).subscribe((response) => {
      this.is_loading = false;
      this.item_list = response.items.data;
      this.user_list = response.users.data;
      this.item_provider = response.item_provider;
    });
  }

  save(evt: Event) {
    this.is_loading = true;
    evt.preventDefault();
    evt.stopPropagation();

    if (this.item_provider.id) {
      this.item_provider_rest.update(this.item_provider)
        .subscribe((item_provider) => {
          this.is_loading = false;
          this.location.back();
        });
      return;
    }

    this.item_provider_rest.create(this.item_provider)
      .subscribe((item_provider) => {
        this.is_loading = false;
        this.location.back();
      });
  }
}
