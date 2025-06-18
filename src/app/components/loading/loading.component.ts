import { Component, Input, OnInit } from '@angular/core';


@Component({
    selector: 'app-loading',
    imports: [],
    templateUrl: './loading.component.html',
    styleUrl: './loading.component.css'
})
export class LoadingComponent implements OnInit {
	@Input() is_loading: boolean = false;

	constructor() { }

	ngOnInit() {
	}
}
