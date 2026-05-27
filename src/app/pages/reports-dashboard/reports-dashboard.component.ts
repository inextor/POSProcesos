import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../modules/shared/base/base.component';

@Component({
  selector: 'app-reports-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './reports-dashboard.component.html',
  styleUrl: './reports-dashboard.component.css'
})
export class ReportsDashboardComponent extends BaseComponent {
	external_base_url: string = this.rest.getExternalAppUrl();

	ngOnInit() {
		// Initialization if needed
	}
}
