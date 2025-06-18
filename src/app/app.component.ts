import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { RestService } from './modules/shared/services/rest.service';
import { SharedModule } from './modules/shared/SharedModule';
import { ConfirmationService } from './modules/shared/services/confirmation.service';
import { KeyboardShortcutEvent } from './modules/shared/Utils';
import { ModalComponent } from './components/modal/modal.component';
import { RestSimple } from './modules/shared/services/Rest';
import { Store } from './modules/shared/RestModels';
import { HeaderComponent } from './components/header/header.component';
import { BuildInfo } from './modules/shared/BuildInfo';
import { PageStructureComponent } from "./modules/shared/page-structure/page-structure.component";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    imports: [CommonModule, RouterOutlet, RouterModule, SharedModule, ModalComponent, HeaderComponent, PageStructureComponent]
})
export class AppComponent implements OnInit {
	title = 'POSProcesos';
	store_name:string = '';

	build_info = BuildInfo;

	constructor(protected rest:RestService, public confirmation:ConfirmationService, public router:Router)
	{

	}

	ngOnInit(): void {

	}

	keyHandler(kse:KeyboardShortcutEvent)
	{

		if( this.confirmation.show_confirmation )
		{
			if( kse.shortcut.key_combination == 'Enter' )
			{
				kse.stopPropagation();
				this.confirmation.onAccept();
				return;
			}

			if( kse.shortcut.key_combination == 'Escape' )
			{
				kse.stopPropagation();
				this.confirmation.onCancel();
			}
		}
	}
}
