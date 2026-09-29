import { Component, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { CrearSatFacturaComponent } from '../../components/crear-sat-factura/crear-sat-factura.component';

@Component({
	selector: 'app-crear-sat-factura-page',
	standalone: true,
	imports: [
		CommonModule,
		CrearSatFacturaComponent
	],
	templateUrl: './crear-sat-factura.component.html',
	styleUrl: './crear-sat-factura.component.css'
})
export class CrearSatFacturaPageComponent extends BaseComponent {
	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit(): void {
		this.path = '/crear-sat-factura';
		this.setTitle('Crear SAT Factura');
	}
}
