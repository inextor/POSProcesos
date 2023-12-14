import { Component, OnInit, OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestService } from '../services/rest.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SubSink } from 'subsink';
import {Location} from '@angular/common';
import { ShortDatePipe } from '../pipes/short-date.pipe';

@Component({
	selector: 'app-base',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './base.component.html',
	styleUrl: './base.component.css'
})
export class BaseComponent	implements OnDestroy
{
	subs = new SubSink();
	is_loading = false;

	constructor(public rest:RestService, public route:ActivatedRoute,public router:Router, public location:Location)
	{

	}

	ngOnDestroy()
	{
		this.subs.unsubscribe();
	}

	showError(a:any)
	{
		console.error('Mostrando error', a );
	}

	showSuccess(msg:string)
	{
		console.log('Mostrando mensage de exito:', msg );
	}
}
