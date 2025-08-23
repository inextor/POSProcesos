import { Component, OnInit } from '@angular/core';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Ecommerce, Ecommerce_Profile } from '../../modules/shared/RestModels';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, mergeMap, of, Observable } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from "../../components/loading/loading.component";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-save-ecommerce-profile',
  templateUrl: './save-ecommerce-profile.component.html',
  styleUrls: ['./save-ecommerce-profile.component.css'],
  standalone: true,
  imports: [LoadingComponent, FormsModule, CommonModule]
})
export class SaveEcommerceProfileComponent extends BaseComponent implements OnInit {

  ecommerce_profile: Ecommerce_Profile = GetEmpty.ecommerce_profile();
  rest_ecommerce_profile: RestSimple<Ecommerce_Profile> = this.rest.initRestSimple('ecommerce_profile');
  ecommerce: Ecommerce | null = null; // Initialize as null
  rest_ecommerce: RestSimple<Ecommerce> = this.rest.initRestSimple('ecommerce');

  ngOnInit() {
    this.subs.sink = this.route.paramMap.pipe(
      mergeMap((param_map) => {
        this.is_loading = true; // Set loading to true at the start of data fetching

        const profileId = param_map.get('id');
        const ecommerceId = param_map.get('ecommerce_id');

        let profile$: Observable<Ecommerce_Profile>;
        let ecommerce$: Observable<Ecommerce | null> = of(null);

        if (profileId) {
          profile$ = this.rest_ecommerce_profile.get(profileId);
        } else {
          profile$ = of(GetEmpty.ecommerce_profile());
        }

        if (ecommerceId) {
          ecommerce$ = this.rest_ecommerce.get(ecommerceId);
        }

        return forkJoin([profile$, ecommerce$]);
      })
    ).subscribe({
      next: ([profileResponse, ecommerceResponse]) => {
        this.ecommerce_profile = profileResponse;
        this.ecommerce = ecommerceResponse;

        // If it's a new profile and ecommerce_id is present in route, assign it
        if (!this.ecommerce_profile.id && this.ecommerce) {
          this.ecommerce_profile.ecommerce_id = this.ecommerce.id;
        }
        this.is_loading = false;
      },
      error: (error) => {
        this.is_loading = false;
        this.rest.showError(error);
      }
    });
  }

  save() {
    this.is_loading = true;
    this.subs.sink = (this.ecommerce_profile.id ?
      this.rest_ecommerce_profile.update(this.ecommerce_profile) :
      this.rest_ecommerce_profile.create(this.ecommerce_profile)
    ).subscribe({
      next: (response) => {
        this.is_loading = false;
        this.location.back();
      },
      error: (error) => {
        this.is_loading = false;
        this.rest.showError(error);
      }
    });
  }
}
