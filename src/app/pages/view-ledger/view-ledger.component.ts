import { Component, OnInit, Injector } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Ledger } from '../../modules/shared/RestModels';
import { CommonModule } from '@angular/common';
import { PaginationComponent } from '../../components/pagination/pagination.component';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { mergeMap } from 'rxjs';

@Component({
  selector: 'app-view-ledger',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './view-ledger.component.html',
  styleUrl: './view-ledger.component.css'
})
export class ViewLedgerComponent extends BaseComponent implements OnInit {
  account_id: number | null = null;
  ledgerEntries: Ledger[] = [];

  rest_ledger: RestSimple<Ledger> = this.rest.initRestSimple('ledger');
  search_ledger: SearchObject<Ledger> = this.rest_ledger.getEmptySearch();

  ngOnInit(): void {
    this.path = 'view-ledger';
    this.subs.sink = this.route.queryParamMap.pipe(
      mergeMap(queryParams => {
        this.search_ledger = this.rest_ledger.getSearchObject(queryParams);
        const accountIdParam = queryParams.get('account_id');
        if (accountIdParam) {
          this.account_id = +accountIdParam;
          this.search_ledger.eq.account_id = this.account_id;
          this.search_ledger.limit = this.page_size;
          this.current_page = this.search_ledger.page;
          return this.rest_ledger.search(this.search_ledger);
        }
        return this.rest_ledger.search(this.search_ledger);
      })
    ).subscribe(response => {
      this.is_loading = false;
      this.ledgerEntries = response.data;
      this.setPages(this.current_page, response.total);
    });
  }

  goToPage(page: number): void {
    this.search_ledger.page = page;
    this.search(this.search_ledger);
  }

  nextPage(): void {
    this.search_ledger.page++;
    this.search(this.search_ledger);
  }

  previousPage(): void {
    this.search_ledger.page--;
    this.search(this.search_ledger);
  }
}
