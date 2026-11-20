import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentCommissionReportComponent } from './payment-commission-report.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';

describe('PaymentCommissionReportComponent', () => {
  let component: PaymentCommissionReportComponent;
  let fixture: ComponentFixture<PaymentCommissionReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentCommissionReportComponent],
      providers: provideComponentMocks()
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentCommissionReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not expose the legacy selection/generate flow (read-only report)', () => {
    const any_component = component as unknown as Record<string, unknown>;
    expect(any_component['processCommissions']).toBeUndefined();
    expect(any_component['toggleAll']).toBeUndefined();
    expect(any_component['toggleAgentSelection']).toBeUndefined();
    expect(any_component['onSaleSelectionChange']).toBeUndefined();
  });

  it('should not include the formula flow (it lives in agent-commission-generator)', () => {
    const any_component = component as unknown as Record<string, unknown>;
    expect(any_component['calculateAgentFormulas']).toBeUndefined();
    expect(any_component['confirmGeneratePreview']).toBeUndefined();
    expect(any_component['cancelPreview']).toBeUndefined();
    expect(any_component['show_preview']).toBeUndefined();
    expect(any_component['preview_lines']).toBeUndefined();
  });
});
