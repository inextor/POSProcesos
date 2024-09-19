import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { RestService } from '../../modules/shared/services/rest.service';
import { BuildInfo } from '../../modules/shared/BuildInfo';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent {

  build_info = BuildInfo;

  constructor(public rest: RestService)
  {
    
  }

}
