import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';

@Component({
  selector: 'app-list-reservation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list-reservation.component.html',
  styleUrl: './list-reservation.component.css'
})
export class ListReservationComponent extends BaseComponent implements OnInit
{
    ngOnInit(): void
	{
		this.path = '/rentals/list-reservation';
    }
}
