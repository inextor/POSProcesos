import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockBatchSearchReportComponent } from './stock-batch-search-report.component';

describe('StockBatchSearchReportComponent', () => {
  let component: StockBatchSearchReportComponent;
  let fixture: ComponentFixture<StockBatchSearchReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockBatchSearchReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockBatchSearchReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
