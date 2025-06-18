import { Component } from '@angular/core';

import { BaseComponent } from '../../shared/base/base.component';


declare function initMap(lat:number,lng:number):Promise<any>;
declare function addMarker(lat:number,lng:number,title:string):Promise<any>;

@Component
({
    selector: 'app-view-map',
    imports: [],
    templateUrl: './view-map.component.html',
    styleUrl: './view-map.component.css'
})
export class ViewMapComponent extends BaseComponent
{
	lng: number = 0;
	lat: number = 0;
	title: string = '';

	ngOnInit()
	{
		this.subs.sink = this.route.paramMap.subscribe(params =>
		{
			this.title = params.get('title') as string;
			this.setTitle( this.title );
			this.lat = parseFloat(params.get('lat') as string);
			this.lng = parseFloat(params.get('lng') as string);
		});
	}

	ngAfterViewInit()
	{
		initMap(this.lat, this.lng)
		.then(()=>
		{
			console.log('Mapa cargado');
			return addMarker(this.lat, this.lng, this.title);
		})
		.then(()=>
		{
			console.log('marker agregado');
			console.log('Mapa cargado');
		})
		.catch(err=>
		{
			console.log('Error cargando mapa');
			console.log(err);
		});
	}
}
