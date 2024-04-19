import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-list-payroll',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './list-payroll.component.html',
  styleUrl: './list-payroll.component.css'
})
export class ListPayrollComponent {

}
