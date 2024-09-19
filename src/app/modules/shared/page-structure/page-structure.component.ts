import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../../../components/header/header.component";
import { HeadBodyFooterLayoutComponent } from "../components/head-body-footer-layout/head-body-footer-layout.component";
import { BaseComponent } from '../base/base.component';

@Component({
    selector: 'app-page-structure',
    standalone: true,
    templateUrl: './page-structure.component.html',
    styleUrl: './page-structure.component.css',
    imports: [CommonModule, HeaderComponent, HeadBodyFooterLayoutComponent]
})
export class PageStructureComponent extends BaseComponent
{

}
