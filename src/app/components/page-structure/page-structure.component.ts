import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { HeaderComponent } from "../header/header.component";
import { BaseComponent } from '../../modules/shared/base/base.component';
import { MenuComponent } from "../menu/menu.component";

@Component({
  selector: 'app-page-structure',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, HeaderComponent, MenuComponent],
  templateUrl: './page-structure.component.html',
  styleUrl: './page-structure.component.css'
})
export class PageStructureComponent extends BaseComponent {

  title = 'POSProcesos';
  store_name: string = '';
}
