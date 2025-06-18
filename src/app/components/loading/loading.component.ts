import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-loading',
    imports: [CommonModule],
    templateUrl: './loading.component.html',
    styleUrl: './loading.component.css'
})
export class LoadingComponent implements OnInit {
	@Input() is_loading: boolean = false;

	constructor() { }

	ngOnInit() {
	}
}
