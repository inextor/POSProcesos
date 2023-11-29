import { Component, Directive } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Rest } from '../Rest';

@Component({
	selector: 'app-base',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './base.component.html',
	styleUrl: './base.component.css'
})
export class BaseComponent
{
}
