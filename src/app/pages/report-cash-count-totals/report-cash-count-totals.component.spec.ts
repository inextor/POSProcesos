import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportCashCountTotalsComponent } from './report-cash-count-totals.component';

describe('ReportCashCountTotalsComponent', () => {
  let component: ReportCashCountTotalsComponent;
  let fixture: ComponentFixture<ReportCashCountTotalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportCashCountTotalsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportCashCountTotalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
