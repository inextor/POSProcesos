import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter, mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { User } from '../../modules/shared/RestModels';
import { MergeUserPreview, MergeUsersResult } from '../../modules/shared/services/rest.service';
import { LoadingComponent } from '../../components/loading/loading.component';
import { SearchUsersComponent } from '../../components/search-users/search-users.component';

interface PreviewRow
{
	label:string;
	count:number;
}

interface SourceEntry
{
	user:User;
	user_display:string;
	preview:MergeUserPreview | null;
	preview_row_array:PreviewRow[];
	is_loading_preview:boolean;
	preview_error:string;
}

const PREVIEW_LABELS:Record<string, string> =
{
	orders_count:'Ordenes',
	payments_count:'Pagos',
	quotes_count:'Cotizaciones',
	returns_count:'Devoluciones',
	addresses_count:'Direcciones',
	reservations_count:'Reservaciones'
};

const SUMMARY_LABELS:Record<string, string> =
{
	orders:'Ordenes',
	payments:'Pagos',
	quotes:'Cotizaciones',
	returns:'Devoluciones',
	bank_movements:'Movimientos bancarios',
	points_log:'Historial de puntos',
	addresses:'Direcciones',
	bank_accounts:'Cuentas bancarias',
	accounts:'Cuentas',
	cart_items:'Carrito',
	notification_tokens:'Tokens',
	reservations:'Reservaciones',
	responses:'Respuestas',
	ecommerce_users:'Ecommerce',
	check_ins:'Check-ins',
	user_permissions:'Permisos',
	user_attachments:'Adjuntos',
	user_extra_fields:'Campos extra',
	points_transferred:'Puntos transferidos'
};

@Component({
	selector:'app-merge-user',
	standalone:true,
	imports:[CommonModule, FormsModule, LoadingComponent, SearchUsersComponent],
	templateUrl:'./merge-user.component.html',
	styleUrl:'./merge-user.component.css'
})
export class MergeUserComponent extends BaseComponent implements OnInit
{
	target_user:User | null = null;
	target_user_display:string = '';
	target_preview:MergeUserPreview | null = null;
	target_preview_row_array:PreviewRow[] = [];
	target_preview_error:string = '';
	target_preview_loading:boolean = false;
	source_entry_array:SourceEntry[] = [];
	merge_result:MergeUsersResult | null = null;
	merge_summary_row_array:PreviewRow[] = [];
	can_merge:boolean = false;
	can_swap:boolean = false;

	ngOnInit():void
	{
		this.path = '/merge-user';
		this.setTitle('Fusionar Clientes');
		this.is_loading = false;
	}

	onTargetSelected(user:User | null):void
	{
		this.merge_result = null;
		this.merge_summary_row_array = [];

		if (!user)
		{
			this.target_user = null;
			this.target_user_display = '';
			this.target_preview = null;
			this.target_preview_row_array = [];
			this.target_preview_error = '';
			this.updateCanMerge();
			return;
		}

		if (!this.isClientActive(user))
		{
			this.showError('El cliente destino debe ser tipo CLIENT y estar ACTIVO');
			return;
		}

		if (this.source_entry_array.some((entry) => entry.user.id === user.id))
		{
			this.showError('El cliente destino no puede ser uno de los clientes origen');
			return;
		}

		this.target_user = user;
		this.target_user_display = this.getUserDisplay(user);
		this.loadTargetPreview();
		this.updateCanMerge();
	}

	onSourceSelected(user:User | null):void
	{
		this.merge_result = null;
		this.merge_summary_row_array = [];

		if (!user)
			return;

		if (!this.isClientActive(user))
		{
			this.showError('Solo se pueden fusionar clientes tipo CLIENT y ACTIVOS');
			return;
		}

		if (this.target_user && user.id === this.target_user.id)
		{
			this.showError('El cliente origen no puede ser igual al destino');
			return;
		}

		if (this.source_entry_array.some((entry) => entry.user.id === user.id))
		{
			this.showError('Ese cliente ya esta en la lista de origen');
			return;
		}

		let entry:SourceEntry =
		{
			user:user,
			user_display:this.getUserDisplay(user),
			preview:null,
			preview_row_array:[],
			is_loading_preview:true,
			preview_error:''
		};
		this.source_entry_array = [...this.source_entry_array, entry];
		this.loadSourcePreview(entry);
		this.updateCanMerge();
	}

	removeSourceEntry(entry:SourceEntry):void
	{
		this.merge_result = null;
		this.merge_summary_row_array = [];
		this.source_entry_array = this.source_entry_array.filter((item) => item.user.id !== entry.user.id);
		this.updateCanMerge();
	}

	clearTarget():void
	{
		this.target_user = null;
		this.target_user_display = '';
		this.target_preview = null;
		this.target_preview_row_array = [];
		this.target_preview_error = '';
		this.merge_result = null;
		this.merge_summary_row_array = [];
		this.updateCanMerge();
	}

	clearAll():void
	{
		this.clearTarget();
		this.source_entry_array = [];
		this.merge_result = null;
		this.merge_summary_row_array = [];
		this.updateCanMerge();
	}

	loadTargetPreview():void
	{
		if (!this.target_user)
			return;

		let user_id = this.target_user.id;
		this.target_preview = null;
		this.target_preview_row_array = [];
		this.target_preview_error = '';
		this.target_preview_loading = true;
		this.updateCanMerge();

		this.subs.sink = this.rest.getMergeUserPreview(user_id).subscribe
		({
			next:(preview) =>
			{
				if (!this.target_user || this.target_user.id !== user_id)
					return;

				this.target_preview = preview;
				this.target_preview_row_array = this.buildPreviewRows(preview);
				this.target_preview_loading = false;
				this.updateCanMerge();
			},
			error:(error) =>
			{
				if (!this.target_user || this.target_user.id !== user_id)
					return;

				this.target_preview_loading = false;
				this.target_preview_error = this.getPreviewErrorMessage(error);
				this.updateCanMerge();
			}
		});
	}

	loadSourcePreview(entry:SourceEntry):void
	{
		this.subs.sink = this.rest.getMergeUserPreview(entry.user.id).subscribe
		({
			next:(preview) =>
			{
				entry.preview = preview;
				entry.preview_row_array = this.buildPreviewRows(preview);
				entry.is_loading_preview = false;
				this.source_entry_array = [...this.source_entry_array];
				this.updateCanMerge();
			},
			error:(error) =>
			{
				entry.is_loading_preview = false;
				entry.preview_error = this.getPreviewErrorMessage(error);
				this.source_entry_array = [...this.source_entry_array];
				this.updateCanMerge();
			}
		});
	}

	confirmAndMerge():void
	{
		if (!this.target_user)
		{
			this.showError('Seleccione el cliente destino');
			return;
		}

		if (!this.isClientActive(this.target_user))
		{
			this.showError('El cliente destino debe ser tipo CLIENT y estar ACTIVO');
			return;
		}

		if (this.source_entry_array.length === 0)
		{
			this.showError('Agregue al menos un cliente origen');
			return;
		}

		let target_id = this.target_user.id;
		let source_id_array = this.source_entry_array.map((entry) => entry.user.id);

		if (source_id_array.includes(target_id))
		{
			this.showError('El cliente origen no puede ser igual al destino');
			return;
		}

		for (let entry of this.source_entry_array)
		{
			if (!this.isClientActive(entry.user))
			{
				this.showError('Solo se pueden fusionar clientes tipo CLIENT y ACTIVOS');
				return;
			}
		}

		let source_names = this.source_entry_array.map((entry) => entry.user_display).join(', ');
		let description = 'Se moveran los registros de ' + source_names + ' a ' + this.target_user_display + ' y los origenes se marcaran como ELIMINADOS. Esta accion no se puede deshacer. Desea continuar?';

		this.subs.sink = this.confirmation.showConfirmAlert({ source_id_array, target_id }, 'Fusionar Clientes', description)
			.pipe
			(
				filter((response) => response.accepted),
				mergeMap(() =>
				{
					this.is_loading = true;
					this.updateCanMerge();
					return this.rest.mergeUsers(source_id_array, target_id);
				})
			)
			.subscribe
			({
				next:(result) =>
				{
					this.is_loading = false;
					this.merge_result = result;
					this.merge_summary_row_array = this.buildSummaryRows(result);
					this.source_entry_array = [];
					this.loadTargetPreview();
					this.showSuccess('Clientes fusionados exitosamente');
				},
				error:(error) =>
				{
					this.showError(error);
					this.updateCanMerge();
				}
			});
	}

	swapSourceAndTarget():void
	{
		if (!this.target_user)
		{
			this.showError('Seleccione el cliente destino para intercambiar');
			return;
		}

		if (this.source_entry_array.length !== 1)
		{
			this.showError('El intercambio solo esta disponible con un cliente origen');
			return;
		}

		if (this.target_preview_loading || this.source_entry_array[0].is_loading_preview)
		{
			this.showError('Espere a que terminen de cargar los resumenes');
			return;
		}

		let old_target = this.target_user;
		let old_target_display = this.target_user_display;
		let old_target_preview = this.target_preview;
		let old_target_row_array = this.target_preview_row_array;
		let old_target_error = this.target_preview_error;

		let source_entry = this.source_entry_array[0];

		this.target_user = source_entry.user;
		this.target_user_display = source_entry.user_display;
		this.target_preview = source_entry.preview;
		this.target_preview_row_array = source_entry.preview_row_array;
		this.target_preview_error = source_entry.preview_error;
		this.target_preview_loading = false;

		let new_entry:SourceEntry =
		{
			user:old_target,
			user_display:old_target_display,
			preview:old_target_preview,
			preview_row_array:old_target_row_array,
			is_loading_preview:false,
			preview_error:old_target_error
		};
		this.source_entry_array = [new_entry];
		this.merge_result = null;
		this.merge_summary_row_array = [];
		this.updateCanMerge();
	}

	updateCanMerge():void
	{
		let has_loading_preview = this.target_preview_loading || this.source_entry_array.some((entry) => entry.is_loading_preview);

		this.can_merge = !!this.target_user
			&& this.source_entry_array.length > 0
			&& !this.is_loading
			&& !has_loading_preview;

		this.can_swap = !!this.target_user
			&& this.source_entry_array.length === 1
			&& !this.is_loading
			&& !has_loading_preview;
	}

	buildPreviewRows(preview:MergeUserPreview):PreviewRow[]
	{
		let row_array:PreviewRow[] = [];

		for (let key in PREVIEW_LABELS)
		{
			row_array.push
			({
				label:PREVIEW_LABELS[key],
				count:Number(preview.related_records[key] || 0)
			});
		}

		return row_array;
	}

	buildSummaryRows(result:MergeUsersResult):PreviewRow[]
	{
		let row_array:PreviewRow[] = [];

		for (let key in result.total_updates_summary)
		{
			row_array.push
			({
				label:SUMMARY_LABELS[key] || key,
				count:Number(result.total_updates_summary[key] || 0)
			});
		}

		return row_array;
	}

	getUserDisplay(user:User):string
	{
		let parts = [user.name];

		if (user.email)
			parts.push(user.email);

		parts.push('(ID: ' + user.id + ')');

		return parts.join(' ');
	}

	isClientActive(user:User):boolean
	{
		return user.type === 'CLIENT' && user.status === 'ACTIVE';
	}

	getPreviewErrorMessage(error:any):string
	{
		if (error && error.error && typeof error.error.error === 'string')
			return error.error.error;

		if (error && typeof error.message === 'string')
			return error.message;

		return 'No se pudo cargar el resumen del cliente';
	}
}
