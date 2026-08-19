import { Component, OnInit } from '@angular/core';
import { RestService } from '../../modules/shared/services/rest.service';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest } from '../../modules/shared/services/Rest';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Store_Bank_Account, Bank_Account, Store } from '../../modules/shared/RestModels';
import { RouterLink } from '@angular/router';
import { GetEmpty } from '../../modules/shared/GetEmpty';

interface CStoreBankAccount {
	store_bank_account: Store_Bank_Account;
	store: Store;
	bank_account: Bank_Account;
}

@Component({
	selector: 'app-list-store-bank-account',
	templateUrl: './list-store-bank-account.component.html',
	styleUrls: ['./list-store-bank-account.component.css'],
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink]
})
export class ListStoreBankAccountComponent extends BaseComponent implements OnInit {

	records: CStoreBankAccount[] = [];
	store_list: Store[] = [];
	bank_account_list: Bank_Account[] = [];

	rest_store_bank_account: Rest<Store_Bank_Account, Store_Bank_Account> = this.rest.initRestSimple('store_bank_account', ['id', 'store_id', 'bank_account_id']);
	rest_store: Rest<Store, Store> = this.rest.initRestSimple('store');
	rest_bank_account: Rest<Bank_Account, Bank_Account> = this.rest.initRestSimple('bank_account');

	search_object: any = this.rest_store_bank_account.getEmptySearch();

	show_modal: boolean = false;
	new_record: any = GetEmpty.store_bank_account();

	ngOnInit()
	{
		this.subs.sink = this.getQueryParamObservable().pipe(
			mergeMap(([query_params, param_map]) => {
				let store_relation = this.rest_store.getRelation('store_id');
				let bank_account_relation = this.rest_bank_account.getRelation('bank_account_id');
				let relations = [store_relation, bank_account_relation];
				let search_object = this.rest_store_bank_account.getSearchObject(query_params);

				return forkJoin({
					store_bank_account: this.rest_store_bank_account.searchWithRelations(search_object, relations),
					stores: this.rest_store.search({ limit: 9999999 }),
					bank_accounts: this.rest_bank_account.search({ limit: 9999999 }),
				});
			})
		).subscribe({
			next: (response: any) => {
				this.records = response.store_bank_account.data;
				this.store_list = response.stores.data;
				this.bank_account_list = response.bank_accounts.data;
				this.is_loading = false;
			},
			error: (error: any) => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	override search()
	{
		let search_object = { ...this.search_object } as any;
		if (!search_object.eq) search_object.eq = {};
		if (!search_object.like) search_object.like = {};

		let store_relation = this.rest_store.getRelation('store_id');
		let bank_account_relation = this.rest_bank_account.getRelation('bank_account_id');
		let relations = [store_relation, bank_account_relation];

		this.is_loading = true;
		this.subs.sink = this.rest_store_bank_account.searchWithRelations(search_object, relations).subscribe({
			next: (response: any) => {
				this.records = response.data;
				this.is_loading = false;
			},
			error: (error: any) => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	openModal()
	{
		this.show_modal = true;
		this.new_record = GetEmpty.store_bank_account();
	}

	closeModal()
	{
		this.show_modal = false;
	}

	saveRecord()
	{
		if (!this.new_record.store_id || this.new_record.store_id === 0) {
			this.rest.showError('Debe seleccionar una sucursal');
			return;
		}

		if (!this.new_record.bank_account_id || this.new_record.bank_account_id === 0) {
			this.rest.showError('Debe seleccionar una cuenta bancaria');
			return;
		}

		this.is_loading = true;

		if (this.new_record.id) {
			this.subs.sink = this.rest_store_bank_account.update(this.new_record).subscribe({
				next: () => {
					this.is_loading = false;
					this.closeModal();
					this.ngOnInit();
				},
				error: (error: any) => {
					this.is_loading = false;
					this.showError(error);
				}
			});
		} else {
			this.subs.sink = this.rest_store_bank_account.create(this.new_record).subscribe({
				next: () => {
					this.is_loading = false;
					this.closeModal();
					this.ngOnInit();
				},
				error: (error: any) => {
					this.is_loading = false;
					this.showError(error);
				}
			});
		}
	}

	editRecord(record: Store_Bank_Account)
	{
		this.new_record = { ...record };
		this.show_modal = true;
	}

	formatStoreName(store: Store | undefined): string
	{
		if (!store) return '-';
		return store.name || 'Store #' + store.id;
	}

	formatBankAccountName(ba: Bank_Account | undefined): string
	{
		if (!ba) return '-';
		return ba.alias || ba.name || ba.account || 'Bank Account #' + ba.id;
	}

	getStoreName(id: number): string
	{
		let s = this.store_list.find(x => x.id === id);
		return this.formatStoreName(s);
	}

	getBankAccountName(id: number): string
	{
		let b = this.bank_account_list.find(x => x.id === id);
		return this.formatBankAccountName(b);
	}
}
