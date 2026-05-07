import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaidCommissionsReportComponent } from './paid-commissions-report.component';

describe('PaidCommissionsReportComponent', () => {
  let component: PaidCommissionsReportComponent;
  let fixture: ComponentFixture<PaidCommissionsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaidCommissionsReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaidCommissionsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
