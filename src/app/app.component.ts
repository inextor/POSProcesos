import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { RestService } from './modules/shared/services/rest.service';
import { SharedModule } from './modules/shared/SharedModule';
import { ToastErrorComponent } from './modules/shared/toast-error/ToastErrorComponent';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [CommonModule, RouterOutlet,RouterModule, SharedModule ],
	templateUrl: './app.component.html',
	styleUrl: './app.component.css'
})
export class AppComponent {
	title = 'POSProcesos';

	constructor(protected rest:RestService)
	{

	}
}
