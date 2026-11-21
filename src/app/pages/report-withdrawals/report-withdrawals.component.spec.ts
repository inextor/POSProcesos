import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportWithdrawalsComponent } from './report-withdrawals.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';

describe('ReportWithdrawalsComponent', () => {
  let component: ReportWithdrawalsComponent;
  let fixture: ComponentFixture<ReportWithdrawalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportWithdrawalsComponent],
      providers: provideComponentMocks()
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportWithdrawalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
