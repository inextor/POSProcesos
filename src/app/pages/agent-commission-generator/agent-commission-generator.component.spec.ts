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

  it('onLineAmountChange should update the line, rescale its items and recompute the total', () => {
    component.preview_lines = [
      { order_id: 1, payment_id: 2, paid_ratio: 1, amount: 100, items: [
        { order_item_id: 11, rule_id: 1, amount: 60 },
        { order_item_id: 12, rule_id: 1, amount: 40 }
      ]},
      { order_id: 3, payment_id: 4, paid_ratio: 1, amount: 50, items: [] }
    ];
    component.preview_total = 150;

    const input = document.createElement('input');
    input.value = '200';
    component.onLineAmountChange(component.preview_lines[0], { target: input } as any);

    expect(component.preview_lines[0].amount).toBe(200);
    expect(component.preview_lines[0].items[0].amount).toBe(120);
    expect(component.preview_lines[0].items[1].amount).toBe(80);
    expect(component.preview_total).toBe(250);
  });

  it('onLineAmountChange should split evenly when the calculated line is zero', () => {
    component.preview_lines = [
      { order_id: 1, payment_id: 2, paid_ratio: 1, amount: 0, items: [
        { order_item_id: 11, rule_id: 1, amount: 0 },
        { order_item_id: 12, rule_id: 1, amount: 0 }
      ]}
    ];
    component.preview_total = 0;

    const input = document.createElement('input');
    input.value = '100';
    component.onLineAmountChange(component.preview_lines[0], { target: input } as any);

    expect(component.preview_lines[0].amount).toBe(100);
    expect(component.preview_lines[0].items[0].amount + component.preview_lines[0].items[1].amount).toBe(100);
    expect(component.preview_total).toBe(100);
  });

  it('onLineAmountChange should revert invalid input and clamp negatives to zero', () => {
    component.preview_lines = [
      { order_id: 1, payment_id: 2, paid_ratio: 1, amount: 100, items: [
        { order_item_id: 11, rule_id: 1, amount: 100 }
      ]}
    ];
    component.preview_total = 100;

    const bad_input = document.createElement('input');
    bad_input.value = 'abc';
    component.onLineAmountChange(component.preview_lines[0], { target: bad_input } as any);

    expect(component.preview_lines[0].amount).toBe(100);
    expect(bad_input.value).toBe('100');
    expect(component.preview_total).toBe(100);

    const negative_input = document.createElement('input');
    negative_input.value = '-25';
    component.onLineAmountChange(component.preview_lines[0], { target: negative_input } as any);

    expect(component.preview_lines[0].amount).toBe(0);
    expect(component.preview_lines[0].items[0].amount).toBe(0);
    expect(component.preview_total).toBe(0);
  });

  it('confirmGeneratePreview should block lines with invalid amounts', () => {
    component.preview_errors = [];
    component.preview_lines = [{ order_id: 1, payment_id: 2, paid_ratio: 1, amount: -5, items: [] }];
    spyOn(component, 'showError');

    component.confirmGeneratePreview();

    expect(component.showError).toHaveBeenCalled();
  });
});
