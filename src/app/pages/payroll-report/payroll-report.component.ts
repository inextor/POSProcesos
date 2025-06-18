import { Component, OnInit } from '@angular/core';

import { BaseComponent } from '../../modules/shared/base/base.component';
import { FormsModule } from '@angular/forms';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Payroll, Payroll_Concept, Payroll_Concept_Value, User, Work_Log } from '../../modules/shared/RestModels';
import { forkJoin, mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { Utils } from '../../modules/shared/Utils';
import { RouterModule } from '@angular/router';

interface CPayroll_Concept_Value extends Payroll_Concept_Value
{
	payroll_concept_name:string;
	type:string;
}

interface CWork_Log extends Work_Log
{
	day_name:string;
}

interface CPayrollInfo
{
	payroll:Payroll;
	work_logs:CWork_Log[];
	payroll_concept_values:CPayroll_Concept_Value[];
}

@Component({
    selector: 'app-payroll-report',
    imports: [BaseComponent, RouterModule, FormsModule, ShortDatePipe],
    templateUrl: './payroll-report.component.html',
    styleUrl: './payroll-report.component.css'
})
export class PayrollReportComponent extends BaseComponent {


}
