import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShortcutsService } from '../../modules/shared/services/shortcuts.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
//export class ModalComponent implements OnInit, OnChanges
export class ModalComponent implements OnInit, OnChanges
{
	@Input() biggest_posible:boolean = false;
	@Input() show:boolean = false;
	@Input() closable:boolean = true;
	@Output() showChange= new EventEmitter<boolean>();
	//@ViewChild('dialog') dialog:ElementRef;

	constructor(private ss:ShortcutsService)
	{

	}
	ngOnChanges(changes: SimpleChanges): void {

		/*I
		if( changes['show'] )
		{
			console.log('Changes', changes );

			if( changes['show'].currentValue )
			{
				let nDialog = this.dialog.nativeElement as HTMLDialogElement;
				if( !nDialog.open )
					nDialog.showModal();
			}
			else
			{
				let nDialog = this.dialog.nativeElement as HTMLDialogElement;
				if(nDialog && nDialog.open )
					nDialog.close();
			}
		}
		*/
	}

	ngOnInit()
	{
		this.ss.shortcuts.subscribe((response)=>
		{
			if( !this.show )
				return;

			if( response.shortcut.name == ShortcutsService.ESCAPE && this.closable )
			{
				this.showChange.emit( false );
/*
				console.log('DIALOG HAS', this.dialog );
				let nDialog = this.dialog.nativeElement as HTMLDialogElement;
				nDialog.showModal();
*/
			}
		});
	}
	close()
	{
		this.showChange.emit( false );
		//let nDialog = this.dialog.nativeElement as HTMLDialogElement;
		//nDialog.showModal();
	}
}
