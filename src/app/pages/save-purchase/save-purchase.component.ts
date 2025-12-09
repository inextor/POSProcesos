import { Component, OnInit, Injector } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ItemInfo, PurchaseDetailInfo, PurchaseInfo} from '../../modules/shared/Models';
import { Currency, Currency_Rate, Purchase, Purchase_Detail, Store, User} from '../../modules/shared/RestModels';
import { forkJoin, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../components/modal/modal.component';
import { SearchItemsComponent } from '../../components/search-items/search-items.component';
import { AttachmentUploaderComponent } from '../../components/attachment-uploader/attachment-uploader.component';

declare function txt2html(str:string):string;
declare function printHtml(html_body:string,title:string):any;

interface CItemAdd
{
	item_info:ItemInfo;
	qty:number;
}
interface CPurchaseInfo extends PurchaseInfo
{
	store:Store;
}

@Component({
	selector: 'app-save-purchase',
	standalone: true,
	imports: [CommonModule, FormsModule, ModalComponent, SearchItemsComponent, AttachmentUploaderComponent],
	templateUrl: './save-purchase.component.html',
	styleUrls: ['./save-purchase.component.css']
})
export class SavePurchaseComponent extends BaseComponent implements OnInit
{
	show_item_exists_modal: boolean = false;
	item_to_add: ItemInfo | null = null;

	purchase_info:CPurchaseInfo	= this.getEmptyPurchaseInfo();
	item_info_list:ItemInfo[] = [];
	input_search:string = '';
	show_provider_list:boolean = false;
	provider_user_list:User[] = [];
	show_add_new:boolean = false;
	show_new_provider:boolean = false;
	store_list:Store[] = [];
	currency_list:Currency[] = [];
	currency_rate_list:Currency_Rate[] = [];
	item_count:number = 0;
	override total_items:number = 0;
	search_str:string = '';

	note:string = '';
	paid_date:string = '';
	reference:string = '';
	transaction_type: "CASH" | "TRANSFER" | "CREDIT_CARD" | "DEBIT_CARD" | "CHECK" | "COUPON" | "DISCOUNT" | "RETURN_DISCOUNT" | "PAYPAL" = "CASH";

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit()
	{
		let rest_store = this.rest.initRestSimple<Store>('store');
		let rest_purchase_info = this.rest.initRestSimple<PurchaseInfo>('purchase_info');
		let rest_user = this.rest.initRestSimple<User>('user');
		let rest_currency = this.rest.initRestSimple<Currency>('currency');
		let rest_currency_rate = this.rest.initRestSimple<Currency_Rate>('currency_rate');

		this.sink = this.route.paramMap
		.pipe
		(
			mergeMap((params)=>
			{
				this.is_loading = true;
				this.input_search = '';
				let id_str = params.get('id');
				let provider_id_str = params.get('provider_id');

				return forkJoin
				({
					stores: rest_store.search({limit:9999,sort_order:['name_ASC']}),
					purchase: id_str
						? rest_purchase_info.get( parseInt(id_str) )
						: of( this.getEmptyPurchaseInfo() ),
					provider: provider_id_str ? rest_user.get( parseInt(provider_id_str) ) : of(null as User | null),
					currency: rest_currency.search({limit:9999,sort_order:['name_ASC']}),
					currency_rate: rest_currency_rate.search({limit:9999,sort_order:['currency_id_ASC']}),
				})
			})
		)
		.subscribe
		({
			next:(response)=>
			{
				this.store_list = response.stores.data;
				if( response.purchase.bill == null )
				{
					response.purchase.bill = {
						paid_status: 'PENDING',
						total: response.purchase.purchase.total
					}
				}

				this.currency_list = response.currency.data;
				this.currency_rate_list = response.currency_rate.data;

				this.is_loading = false;

				let store = GetEmpty.store();

				this.purchase_info = {...response.purchase, store };

				if( response.purchase.purchase.id )
				{
					this.purchase_info.store = this.store_list.find(i=>i.id == response.purchase.purchase.store_id) || GetEmpty.store();
				}
				else if( this.rest.user && this.rest.user.store_id )
				{
					this.purchase_info.store = this.store_list.find(i=>i.id == this.rest.user!.store_id!) || GetEmpty.store();
					this.purchase_info.purchase.store_id = this.rest.user.store_id;
				}

				if( response.provider )
				{
					this.userProviderSelected( response.provider );
				}

				this.updateTotal();
			},
			error:(error)=>this.showError( error )
		});
	}

	getExchangeRate(currency_id:string):number
	{
		if( this.purchase_info.bill.currency_id == currency_id )
			return 1;

		let store = this.store_list.find((s:Store)=>s.id == this.purchase_info.purchase.store_id) as Store;
		let default_currency_id = store.default_currency_id;

		let currency_rate = this.currency_rate_list.find((r:Currency_Rate)=>
		{
			console.log('COnsole',r);
			if( r.store_id != this.purchase_info.purchase.store_id )
				return false;

			if( this.purchase_info.bill.currency_id == default_currency_id )
			{
				return r.currency_id == currency_id;
			}

			return r.currency_id == this.purchase_info.bill.currency_id;
		});

		if( !currency_rate )
		{

		}

		return default_currency_id == this.purchase_info.bill.currency_id
			? currency_rate!.rate
			: 1/currency_rate!.rate;
	}

	searchProvider(provider_name:string)
	{
		this.show_provider_list = true;
		this.purchase_info.purchase.provider_name = provider_name;
		this.purchase_info.purchase.provider_user_id = null;

		let rest_user = this.rest.initRestSimple<User>('user');
		this.subs.sink = rest_user.search(
		{
			start:{	name:provider_name },
			eq:{ status:'ACTIVE'},
			search_extra:{'user_permission.is_provider':1},
			limit: 20
		})
		.subscribe((response)=>
		{
			this.provider_user_list = response.data;
		});
	}

	addNewProvider(provider_name: string)
	{
		this.is_loading = true;
		this.show_provider_list = false;

		let user: Partial<User> = {
			name: provider_name,
			email: provider_name,
			store_id: undefined,
			type: 'USER',
			credit_days: 0,
			credit_limit: 0,
			price_type_id: undefined,
		};

		let user_permission = GetEmpty.user_permission();
		user_permission.is_provider = 1;

		let rest_user = this.rest.initRestSimple<User>('user');
		let rest_user_permission = this.rest.initRestSimple<any>('user_permission');

		this.subs.sink = rest_user
		.create(user).pipe
		(
			mergeMap((response)=>
			{
				user_permission.user_id = response.id;
				this.purchase_info.purchase.provider_user_id = response.id;
				this.purchase_info.bill.provider_user_id = response.id;

				return rest_user_permission.update(user_permission);
			})
		)
		.subscribe
		({
			next: (response)=>
			{
				this.is_loading = false;
				this.showSuccess('Se agregó un nuevo proveedor');
				this.provider_user_list = [];
			},
			error: (error)=>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	userProviderSelected(user:User)
	{
		this.show_provider_list = false;
		this.purchase_info.purchase.provider_name = user.name;
		this.purchase_info.purchase.provider_user_id = user.id;
		this.purchase_info.bill.provider_user_id = user.id;
		this.provider_user_list = [];
	}

	getEmptyPurchaseInfo():CPurchaseInfo
	{
		let purchase:Purchase = {
			stock_status: 'PENDING',
			order_id: null,
			store_id: this.rest?.user?.store_id	|| 0,
			created: new Date(),
			updated: new Date(),
			created_by_user_id: this.rest?.user?.id || 0,
			provider_name: '',
			status: 'ACTIVE',
			provider_user_id: null,
			updated_by_user_id: null,
			total: 0,
			id: 0,
			amount_paid: 0,
			paid_timestamp: null
		};

		let p:CPurchaseInfo = {
			purchase,
			bill: {
				paid_status: 'PENDING',
				currency_id: 'MXN',
				amount_paid: 0,
				total: 0
			},
			details:[] as PurchaseDetailInfo[],
			shipping: null,
			bank_movements_info: [],
			store: GetEmpty.store()
		};

		return p;
	}

	save()
	{
		this.is_loading = true;

		//se toma por hecho que no hay pagos, y si se marca, para pagarlo completo
		if (this.purchase_info.bill.paid_status == 'PAID' && this.purchase_info.bank_movements_info.length == 0)
		{
			this.markAsPaid();
		}

		let rest_purchase_info = this.rest.initRestSimple<PurchaseInfo>('purchase_info');

		if( this.purchase_info.purchase.id	)
		{
			this.purchase_info.purchase.total =this.purchase_info.bill.total!;

			this.subs.sink = rest_purchase_info.update( this.purchase_info )
			.subscribe
			({
				next: (purchase)=>
				{
					this.is_loading = false;
					this.router.navigate(['/list-purchase']);
					this.showSuccess('La orden de compra se actualizó exitosamente');
				},
				error: (error)=>
				{
					this.is_loading = false;
					this.showError(error);
				}
			});
		}
		else
		{
			this.purchase_info.purchase.total =this.purchase_info.bill.total!;

			if( !this.rest.user_permission.global_purchases )
			{
				this.purchase_info.purchase.store_id = this.rest.user!.store_id!;
			}

			if (!this.purchase_info.purchase.provider_user_id)
			{
				this.is_loading = false;
				this.showError('Debe seleccionar un proveedor existente de la lista o registrar uno nuevo');
				return;
			}

			this.subs.sink = rest_purchase_info.create(this.purchase_info)
			.subscribe
			({
				next: (purchase)=>
				{
					this.is_loading = false;
					this.showSuccess('La orden de compra se guardó exitosamente');
					this.router.navigate(['/list-purchase']);
				},
				error: (error)=>
				{
					this.is_loading = false;
					this.showError(error);
				}
			});
		}
	}

	onInput(evt:Event)
	{
		if( (evt.target as HTMLInputElement).value == '' )
		{
			this.item_info_list = [];
			return;
		}

		let input = evt.target as HTMLInputElement;
		let rest_item_info = this.rest.initRestSimple<ItemInfo>('item_info');
		this.subs.sink = rest_item_info.search({
			search_extra:{category_name:input.value, status:'ACTIVE'}
		} as any)
		.subscribe((response)=>
		{
			this.item_info_list = response.data;
		});
	}

	onItemInfoSelect(item_info:ItemInfo, qty:number=1)
	{
		console.log('Item ifno has', item_info.item );
		if( this.purchase_info.details.some((i)=>i.purchase_detail.item_id == item_info.item.id && item_info.item.has_serial_number == "NO") )
		{
			this.item_to_add = item_info;
			this.show_item_exists_modal = true;
			return;
		}

		this.show_add_new = false;

		this.item_info_list = [];

		let purchase_detail:Purchase_Detail = {
			purchase_id: this.purchase_info.purchase.id,
			item_id	:	item_info.item.id,
			status: 'ACTIVE',
			qty: qty,
			stock_status: 'PENDING',
			description: '',
			id: 0,
			total: 0,
			serial_number: item_info.item.has_serial_number == 'YES' ? '' : null,
			created: new Date(),
			updated: new Date(),
			unitary_price: ( item_info.item.reference_price || 0.0 ) * this.getExchangeRate( item_info.item.reference_currency_id )
		};

		this.purchase_info.details.push
		({
			purchase_detail: purchase_detail,
			item: item_info.item,
			category: item_info.category
		})

		this.updateTotal();

		this.input_search = '';
	}

	incrementExistingItem()
	{
		let existing_item = this.purchase_info.details.find(i => i.item.id === this.item_to_add!.item.id);
		existing_item!.purchase_detail.qty++;
		this.updateTotal();
		this.show_item_exists_modal = false;
		this.item_to_add = null;
	}

	cancelAddExistingItem()
	{
		this.show_item_exists_modal = false;
		this.item_to_add = null;
	}

	onItemScannedAdd(item_add:CItemAdd)
	{
		let purchase_detail = this.purchase_info.details.find(i=>i.purchase_detail.item_id == item_add.item_info.item.id);

		if( purchase_detail )
		{
			purchase_detail.purchase_detail.qty += item_add.qty;
		}
		else
		{
			this.onItemInfoSelect(item_add.item_info, item_add.qty);
		}

		this.updateTotal();
	}

	updateTotal()
	{
		this.purchase_info.purchase.total = this.purchase_info.details.reduce((prev,pi)=>{
			if( pi.purchase_detail.unitary_price && pi.purchase_detail.qty)
				return prev+pi.purchase_detail.unitary_price * pi.purchase_detail.qty;
			return prev;
		},0);

		this.total_items = this.purchase_info.details.reduce((prev,pi)=>prev+pi.purchase_detail.qty,0);

		this.purchase_info.bill.total = Math.round( this.purchase_info.purchase.total*100 )/100;
	}

	removeItem(pid:PurchaseDetailInfo)
	{
		if( !pid.purchase_detail.id )
		{
			let index = this.purchase_info.details.findIndex(i=>i===pid);
			if( index > -1 )
				this.purchase_info.details.splice(index,1);
		}
		else
		{
			pid.purchase_detail.status = 'DELETED';
		}
		this.updateTotal();
	}

	showAddNewItem()
	{
		this.search_str = '';
		this.show_add_new = true;
	}

	toggleMarkAsPaid()
	{
		this.purchase_info.bill.paid_status = this.purchase_info.bill.paid_status == 'PAID' ? 'PENDING' : 'PAID';
	}

	markAsPaid()
	{
		this.purchase_info.bill.amount_paid = this.purchase_info.bill.total;
		this.purchase_info.bill.paid_by_user_id = this.rest.user!.id;
		this.purchase_info.bill.paid_date = Utils.getUTCMysqlStringFromDate(new Date());
		this.purchase_info.bill.aproved_by_user_id = this.rest.user!.id;
		this.purchase_info.bill.accepted_status = 'ACCEPTED';

		//set the bank movement info
		this.purchase_info.bank_movements_info.push({
			bank_movement:{
				id: null,
				amount_received: this.purchase_info.bill.total,
				bank_account_id: null,
				card_ending: null,
				client_user_id: null,
				created: new Date(),
				currency_id: this.purchase_info.bill.currency_id || 'MXN',
				invoice_attachment_id: this.purchase_info.bill.invoice_attachment_id,
				note: this.note,
				origin_bank_name: null,
				paid_date: this.paid_date,
				payment_id: null,
				provider_user_id: this.purchase_info.bill.provider_user_id ? this.purchase_info.bill.provider_user_id : null,
				receipt_attachment_id: this.purchase_info.bill.receipt_attachment_id,
				received_by_user_id: null,
				reference: this.reference,
				status: 'ACTIVE',
				exchange_rate: 1,
				total: this.purchase_info.bill.total,
				transaction_type: this.transaction_type,
				type: 'expense',
				updated: new Date(),
			}
			,bank_movement_bills:
			[{
				bank_movement_bill:{
					amount: this.purchase_info.bill.total,
					currency_amount: this.purchase_info.bill.total,
					currency_id: this.purchase_info.bill.currency_id || 'MXN',
					exchange_rate: 1,
					status: 'ACTIVE',
				}
			}]
		});
	}

	print(evt:Event)
	{
		let store = this.store_list.find(i=>this.purchase_info.purchase.store_id == i.id);

		if( !store )
			return;

		let store_name = txt2html(store.name || '');

		let html = `
			<h1>Orden de compra ${this.purchase_info.purchase.id}</h1>
			<div>
				Proveedor:<b>${txt2html(this.purchase_info.purchase.provider_name || '')}</b>
			</div>
			<div>
				Sucursal:<b>${store_name}</b>
			</div>
			<div>
				Fecha:<b>${this.purchase_info.purchase.created.toLocaleString()}</b>
			</div>
			<table style="width:100%">
				<thead>
					<tr>
						<th style="text-align:left;">Articulo</th>
						<th style="text-align:right;">Cantidad</th>
						<th style="text-align:right;">Total</th>
					</tr>
				</thead>
				<tbody>
		`;

		let total = 0;
		let total_items = 0;

		this.purchase_info.details.forEach((di)=>
		{
			let cname = '';

			if( di.category && this.rest.preferences.display_categories_on_items == 'YES' )
				cname = di.category.name+' - ';

			total += di.purchase_detail.qty*di.purchase_detail.unitary_price;
			total_items += di.purchase_detail.qty;

			let ciname = txt2html( cname+' '+di.item.name );

			html += `<tr>
				<td style="text-align:left;">${ciname}</td>
				<td style="text-align:right;">${this.formatNumber( di.purchase_detail.qty)}</td>
				<td style="text-align:right;">${this.formatCurrency( di.purchase_detail.qty*di.purchase_detail.unitary_price) }</td>
			</tr>`;
		});

		html += `
			<tr>
				<td style="text-align:right;"><b>Total</b></td>
				<td style="text-align:right;"><b>${this.formatNumber(total_items)}</b></td>
				<td style="text-align:right;"><b>${this.formatCurrency(total)}</b></td>
			</tr>
		`;

		html += '</tbody></table>';

		//console.log( 'html is ', html);

		printHtml( html, 'purchase' );
	}
	currency_formater = new Intl.NumberFormat('us-EN', { style: 'currency', currency: 'USD', currencyDisplay:"narrowSymbol" });
	number_formater = new Intl.NumberFormat('us-EN', { maximumSignificantDigits: 2,} ); // useGrouping:"always"

	formatCurrency(amount:number):string
	{
		return this.currency_formater.format(amount);
	}
	formatNumber(amount:number):string
	{
		return this.number_formater.format(amount);
	}
	clone(pdi:PurchaseDetailInfo)
	{
		let purchase_detail = {...pdi.purchase_detail };
		purchase_detail.serial_number = '';
		purchase_detail.id = 0;

		this.purchase_info.details.push({
			purchase_detail,
			item:pdi.item,
			category:pdi.category
		})
	}

	closeScannerDialog()
	{
		let dialog = document.getElementById('scanner_dialog') as HTMLDialogElement;
		dialog.close();
	}

	showScanner()
	{
		let dialog = document.getElementById('scanner_dialog') as HTMLDialogElement;
		dialog.showModal();
	}

	onNoResultsFound(barcode: string)
	{
		this.search_str = barcode;
		this.showAddNewItem();
	}
}
