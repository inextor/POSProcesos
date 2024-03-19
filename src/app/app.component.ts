import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { RestService } from './modules/shared/services/rest.service';
import { SharedModule } from './modules/shared/SharedModule';
import { ConfirmationService } from './modules/shared/services/confirmation.service';
import { KeyboardShortcutEvent } from './modules/shared/Utils';
import { ModalComponent } from './components/modal/modal.component';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [CommonModule, RouterOutlet,RouterModule, SharedModule, ModalComponent ],
	templateUrl: './app.component.html',
	styleUrl: './app.component.css'
})
export class AppComponent {
	title = 'POSProcesos';

	constructor(protected rest:RestService, public confirmation:ConfirmationService)
	{

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
