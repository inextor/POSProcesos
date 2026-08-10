import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportCashCountTotalsComponent } from './report-cash-count-totals.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';

describe('ReportCashCountTotalsComponent', () => {
  let component: ReportCashCountTotalsComponent;
  let fixture: ComponentFixture<ReportCashCountTotalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportCashCountTotalsComponent],
      providers: provideComponentMocks()
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
