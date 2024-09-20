import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../../../components/header/header.component";

@Component({
    selector: 'app-page-structure',
    standalone: true,
    templateUrl: './page-structure.component.html',
    styleUrl: './page-structure.component.css',
    imports: [CommonModule, HeaderComponent]
})
export class PageStructureComponent {

}
