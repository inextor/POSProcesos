import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentCommissionGeneratorComponent } from './agent-commission-generator.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';

describe('AgentCommissionGeneratorComponent', () => {
  let component: AgentCommissionGeneratorComponent;
  let fixture: ComponentFixture<AgentCommissionGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentCommissionGeneratorComponent],
      providers: provideComponentMocks()
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgentCommissionGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the formula flow', () => {
    expect(typeof component.calculateAgentFormulas).toBe('function');
    expect(typeof component.confirmGeneratePreview).toBe('function');
    expect(typeof component.cancelPreview).toBe('function');
  });

  it('should start without preview', () => {
    expect(component.show_preview).toBeFalse();
    expect(component.preview_lines).toEqual([]);
    expect(component.preview_errors).toEqual([]);
  });

  it('cancelPreview should clear the preview state', () => {
    component.show_preview = true;
    component.preview_lines = [{ order_id: 1, payment_id: 2, paid_ratio: 1, amount: 10, items: [] }];
    component.preview_errors = ['boom'];

    component.cancelPreview();

    expect(component.show_preview).toBeFalse();
    expect(component.preview_lines).toEqual([]);
    expect(component.preview_errors).toEqual([]);
  });
});
