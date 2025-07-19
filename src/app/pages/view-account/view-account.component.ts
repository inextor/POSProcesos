import { Component, OnInit, Injector } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Account, Ledger } from '../../modules/shared/RestModels';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { mergeMap } from 'rxjs';

@Component({
  selector: 'app-view-account',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './view-account.component.html',
  styleUrl: './view-account.component.css'
})
export class ViewAccountComponent extends BaseComponent implements OnInit {
  user_id: number | null = null;
  accounts: Account[] = [];
  ledgerEntries: Ledger[] = [];

  rest_account: RestSimple<Account> = this.rest.initRestSimple('account');
  search_account: SearchObject<Account> = this.rest_account.getEmptySearch();

  rest_ledger: RestSimple<Ledger> = this.rest.initRestSimple('ledger');
  search_ledger: SearchObject<Ledger> = this.rest_ledger.getEmptySearch();

  ngOnInit(): void {
    this.path = 'view-account';
    this.subs.sink = this.route.queryParamMap.pipe(
      mergeMap(queryParams => {
        this.search_account = this.rest_account.getSearchObject(queryParams);
        this.search_ledger = this.rest_ledger.getSearchObject(queryParams);

        const userIdParam = queryParams.get('user_id');
        if (userIdParam) {
          this.user_id = +userIdParam;
          this.search_account.eq.user_id = this.user_id;
          this.search_ledger.eq.created_by_user_id = this.user_id;

          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          this.search_ledger.ge.created = oneMonthAgo; // Use 'ge' for greater than or equal

          this.search_account.limit = 9999; // Fetch all accounts for the user
          this.search_ledger.limit = 9999; // Fetch all ledger entries for the last month

          return this.rest_account.search(this.search_account);
        }
        return this.rest_account.search(this.search_account);
      })
    ).subscribe(response => {
      this.accounts = response.data;
      this.rest_ledger.search(this.search_ledger).subscribe(ledgerResponse => {
        this.ledgerEntries = ledgerResponse.data;
      });
    });
  }
}
