import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, RestResponse, SearchObject } from '../../modules/shared/services/Rest';
import { Item, Serial, Subscription, SubscriptionStatus, User } from '../../modules/shared/RestModels';
import { ItemInfo, SerialInfo, SubscriptionInfo } from '../../modules/shared/Models';

interface SubscriptionSummaryRow
{
	item_id:number | null;
	item_name:string;
	user_count:number;
	period_count:number;
	active_count:number;
}

interface CSubscriptionInfo extends SubscriptionInfo
{
	item_name_display:string;
	customer_name_display:string;
	period_display:string;
	balance_display:string;
	asset_code_display:string;
}

interface CSerialOption
{
	id:number;
	serial_number:string;
}

@Component
({
	selector: 'app-list-subscription',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './list-subscription.component.html',
	styleUrl: './list-subscription.component.css'
})
export class ListSubscriptionComponent extends BaseComponent implements OnInit
{
	mode:'summary' | 'client' | 'room' = 'summary';

	rest_item_info:Rest<Item,ItemInfo> = this.rest.initRest('item_info');
	rest_subscription_info:Rest<Subscription,SubscriptionInfo> = this.rest.initRest('subscription_info');
	rest_serial_info:Rest<Serial,SerialInfo> = this.rest.initRest('serial_info');
	rest_user:Rest<User,User> = this.rest.initRestSimple('user');

	summary_status:SubscriptionStatus | '' = 'ACTIVE';
	subscription_item_array:ItemInfo[] = [];
	summary_array:SubscriptionSummaryRow[] = [];
	total_users:number = 0;
	total_periods:number = 0;

	expanded_item_id:number | null = null;
	article_subscription_array:CSubscriptionInfo[] = [];

	client_search_str:string = '';
	client_array:User[] = [];
	selected_client:User | null = null;
	client_subscription_array:CSubscriptionInfo[] = [];
	show_client_detail:boolean = false;
	client_search_subject:Subject<string> = new Subject<string>();

	asset_item_array:ItemInfo[] = [];
	selected_asset_item_id:number | null = null;
	serial_array:CSerialOption[] = [];
	selected_serial_id:number | null = null;
	serial_history_array:CSubscriptionInfo[] = [];
	show_room_detail:boolean = false;

	ngOnInit():void
	{
		this.path = '/list-subscription';
		this.setTitle('Suscripciones');
		this.is_loading = true;

		this.subs.sink = forkJoin
		({
			subscription_items: this.rest_item_info.search({ eq: { is_subscription: 1, status: 'ACTIVE' } as any, limit: 200 }),
			asset_items: this.rest_item_info.search({ eq: { has_serial_number: 'YES', status: 'ACTIVE' } as any, limit: 200 }),
			subscriptions: this.rest_subscription_info.search( this.getSummarySearch() )
		})
		.subscribe
		({
			next: (response) =>
			{
				this.subscription_item_array = response.subscription_items.data;
				this.asset_item_array = response.asset_items.data;
				this.buildSummary( response.subscriptions.data );
				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});

		this.subs.sink = this.client_search_subject.pipe
		(
			debounceTime(300),
			distinctUntilChanged(),
			switchMap((search_str:string) =>
			{
				if( search_str.length < 2 )
				{
					this.client_array = [];
					return of({ data: [], total: 0 } as RestResponse<User>);
				}

				let search:SearchObject<User> = this.getEmptySearch<User>();
				search.limit = 20;
				search.eq.type = 'CLIENT';
				search.lk = { name: search_str } as any;
				return this.rest_user.search( search );
			})
		)
		.subscribe
		({
			next: (response) => { this.client_array = response.data; },
			error: (error) => this.showError(error)
		});
	}

	getSummarySearch():SearchObject<Subscription>
	{
		let search:SearchObject<Subscription> = this.getEmptySearch<Subscription>();
		search.limit = 1000;
		search.sort_order = ['starts_at_DESC'];

		if( this.summary_status )
		{
			search.eq.status = this.summary_status;
		}

		return search;
	}

	loadSummary():void
	{
		this.expanded_item_id = null;
		this.article_subscription_array = [];
		this.is_loading = true;

		this.subs.sink = this.rest_subscription_info.search( this.getSummarySearch() ).subscribe
		({
			next: (response) =>
			{
				this.buildSummary( response.data );
				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	buildSummary(subscription_array:SubscriptionInfo[]):void
	{
		let by_item = new Map<number | null, SubscriptionInfo[]>();

		for( let info of subscription_array )
		{
			let key = info.subscription.item_id;
			let rows_for_item = by_item.get( key );

			if( !rows_for_item )
			{
				rows_for_item = [];
				by_item.set( key, rows_for_item );
			}

			rows_for_item.push( info );
		}

		this.summary_array = [];
		let all_users = new Set<number>();
		let periods = 0;

		by_item.forEach((rows, item_id) =>
		{
			let users = new Set<number>();
			let active = 0;

			for( let row of rows )
			{
				users.add( row.subscription.user_id );
				all_users.add( row.subscription.user_id );

				if( row.subscription.status == 'ACTIVE' )
				{
					active++;
				}
			}

			periods += rows.length;
			this.summary_array.push
			({
				item_id: item_id,
				item_name: rows[0]?.item?.name || ('Artículo #' + item_id),
				user_count: users.size,
				period_count: rows.length,
				active_count: active
			});
		});

		this.summary_array.sort((a, b) => b.active_count - a.active_count || b.period_count - a.period_count);
		this.total_users = all_users.size;
		this.total_periods = periods;
	}

	toggleArticle(row:SubscriptionSummaryRow):void
	{
		if( this.expanded_item_id === row.item_id )
		{
			this.expanded_item_id = null;
			this.article_subscription_array = [];
			return;
		}

		this.expanded_item_id = row.item_id;
		this.article_subscription_array = [];
		this.is_loading = true;

		let search:SearchObject<Subscription> = this.getEmptySearch<Subscription>();
		search.limit = 500;
		search.sort_order = ['starts_at_DESC'];
		search.eq.item_id = row.item_id;

		if( this.summary_status )
		{
			search.eq.status = this.summary_status;
		}

		this.subs.sink = this.rest_subscription_info.search( search ).subscribe
		({
			next: (response) =>
			{
				this.article_subscription_array = response.data.map((info) => this.getCSubscriptionInfo( info ));
				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	onClientSearchChange():void
	{
		this.client_search_subject.next( (this.client_search_str || '').trim() );
	}

	selectClient(client:User):void
	{
		this.selected_client = client;
		this.client_array = [];
		this.client_subscription_array = [];
		this.show_client_detail = false;
		this.is_loading = true;

		let search:SearchObject<Subscription> = this.getEmptySearch<Subscription>();
		search.limit = 200;
		search.sort_order = ['expires_at_DESC'];
		search.eq.user_id = client.id;

		this.subs.sink = this.rest_subscription_info.search( search ).subscribe
		({
			next: (response) =>
			{
				this.client_subscription_array = response.data.map((info) => this.getCSubscriptionInfo( info ));
				this.show_client_detail = true;
				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	loadSerials():void
	{
		this.serial_array = [];
		this.selected_serial_id = null;
		this.serial_history_array = [];
		this.show_room_detail = false;

		if( !this.selected_asset_item_id )
		{
			return;
		}

		this.is_loading = true;

		let search:SearchObject<Serial> = this.getEmptySearch<Serial>();
		search.limit = 500;
		search.eq.item_id = this.selected_asset_item_id;
		search.eq.status = 'ACTIVE';

		this.subs.sink = this.rest_serial_info.search( search ).subscribe
		({
			next: (response) =>
			{
				this.serial_array = response.data.map((info:SerialInfo) => ({
					id: info.serial.id,
					serial_number: info.serial.serial_number
				}));
				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	loadSerialHistory():void
	{
		this.serial_history_array = [];
		this.show_room_detail = false;

		if( !this.selected_serial_id )
		{
			return;
		}

		this.is_loading = true;

		let search:SearchObject<Subscription> = this.getEmptySearch<Subscription>();
		search.limit = 500;
		search.sort_order = ['starts_at_DESC'];
		search.eq.serial_id = this.selected_serial_id;

		this.subs.sink = this.rest_subscription_info.search( search ).subscribe
		({
			next: (response) =>
			{
				this.serial_history_array = response.data.map((info) => this.getCSubscriptionInfo( info ));
				this.show_room_detail = true;
				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	getCSubscriptionInfo(info:SubscriptionInfo):CSubscriptionInfo
	{
		return {
			...info,
			item_name_display: info.item?.name || ('Artículo #' + info.subscription.item_id),
			customer_name_display: info.customer?.name || ('Usuario #' + info.subscription.user_id),
			period_display: info.subscription.starts_at + ' → ' + (info.subscription.expires_at || 'sin expiración'),
			balance_display: info.subscription.balance_qty != null ? (info.subscription.balance_qty + ' / ' + info.subscription.total_qty) : '—',
			asset_code_display: info.subscription.asset_code || '—'
		};
	}
}