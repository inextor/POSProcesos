import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaidCommissionsReportComponent } from './paid-commissions-report.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';

describe('PaidCommissionsReportComponent', () => {
  let component: PaidCommissionsReportComponent;
  let fixture: ComponentFixture<PaidCommissionsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaidCommissionsReportComponent],
      providers: provideComponentMocks()
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
