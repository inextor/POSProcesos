import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ItemInfo, Price, Production, User, User_extra_fields, Work_Log, Work_log_rules } from '../../modules/shared/RestModels';
import { Utils } from '../../modules/shared/Utils';
import { FormsModule } from '@angular/forms';
import { forkJoin, mergeMap, of } from 'rxjs';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { CustomToTitlePipe } from '../../modules/shared/pipes/custom-to-title.pipe';


@Component({
  selector: 'app-production-report',
  standalone: true,
  imports: [CommonModule, BaseComponent, FormsModule, CustomToTitlePipe],
  templateUrl: './production-report.component.html',
  styleUrl: './production-report.component.css'
})
export class ProductionReportComponent extends BaseComponent{


}
