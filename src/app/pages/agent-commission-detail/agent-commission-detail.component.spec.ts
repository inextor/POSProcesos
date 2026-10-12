import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AgentCommissionDetailComponent } from './agent-commission-detail.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';

describe('AgentCommissionDetailComponent', () => {
  let component: AgentCommissionDetailComponent;
  let fixture: ComponentFixture<AgentCommissionDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentCommissionDetailComponent],
      providers: provideComponentMocks()
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgentCommissionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the detail actions', () => {
    expect(typeof component.toggleSale).toBe('function');
    expect(typeof component.generateCommissions).toBe('function');
    expect(typeof component.applyFilters).toBe('function');
  });

  it('should start without sales', () => {
    expect(component.sale_rows).toEqual([]);
    expect(component.commission_lines).toEqual([]);
    expect(component.calc_errors).toEqual([]);
  });

  it('toggleSale should flip the expanded flag', () => {
    const sale: any = { expanded: false };

    component.toggleSale(sale);
    expect(sale.expanded).toBeTrue();

    component.toggleSale(sale);
    expect(sale.expanded).toBeFalse();
  });

  it('onSaleAmountChange should update the sale, its line and the total', () => {
    const sale: any = {
      sale_key: '1-2', order_id: 1, payment_id: 2, commission_amount: 100,
      item_rows: [
        { order_item_id: 11, commission_amount: 60 },
        { order_item_id: 12, commission_amount: 40 }
      ]
    };
    component.commission_lines = [{ order_id: 1, payment_id: 2, paid_ratio: 1, amount: 100, items: [
      { order_item_id: 11, rule_id: 1, amount: 60 },
      { order_item_id: 12, rule_id: 1, amount: 40 }
    ]}];
    component.total_calculated = 100;

    const input = document.createElement('input');
    input.value = '200';
    component.onSaleAmountChange(sale, { target: input } as any);

    expect(sale.commission_amount).toBe(200);
    expect(component.commission_lines[0].amount).toBe(200);
    expect(sale.item_rows[0].commission_amount).toBe(120);
    expect(component.commission_lines[0].items[1].amount).toBe(80);
    expect(component.total_calculated).toBe(200);
  });

  it('onItemAmountChange should roll up to the sale, the line and the total', () => {
    const sale: any = {
      sale_key: '1-2', order_id: 1, payment_id: 2, commission_amount: 100,
      item_rows: [
        { order_item_id: 11, commission_amount: 60 },
        { order_item_id: 12, commission_amount: 40 }
      ]
    };
    component.commission_lines = [{ order_id: 1, payment_id: 2, paid_ratio: 1, amount: 100, items: [
      { order_item_id: 11, rule_id: 1, amount: 60 },
      { order_item_id: 12, rule_id: 1, amount: 40 }
    ]}];
    component.total_calculated = 100;

    const input = document.createElement('input');
    input.value = '100';
    component.onItemAmountChange(sale, sale.item_rows[0], { target: input } as any);

    expect(sale.item_rows[0].commission_amount).toBe(100);
    expect(component.commission_lines[0].items[0].amount).toBe(100);
    expect(sale.commission_amount).toBe(140);
    expect(component.commission_lines[0].amount).toBe(140);
    expect(component.total_calculated).toBe(140);
  });

  it('onSaleAmountChange should revert invalid input', () => {
    const sale: any = {
      sale_key: '1-2', order_id: 1, payment_id: 2, commission_amount: 100, item_rows: []
    };
    component.commission_lines = [{ order_id: 1, payment_id: 2, paid_ratio: 1, amount: 100, items: [] }];
    component.total_calculated = 100;

    const input = document.createElement('input');
    input.value = 'not-a-number';
    component.onSaleAmountChange(sale, { target: input } as any);

    expect(sale.commission_amount).toBe(100);
    expect(component.commission_lines[0].amount).toBe(100);
    expect(input.value).toBe('100');
    expect(component.total_calculated).toBe(100);
  });

  it('generateCommissions should block lines with invalid amounts', () => {
    component.calc_errors = [];
    component.sale_rows = [{ sale_key: '1-2', order_id: 1, payment_id: 2, commission_amount: -5, selected: true, item_rows: [] }] as any;
    component.commission_lines = [{ order_id: 1, payment_id: 2, paid_ratio: 1, amount: -5, items: [] }];
    spyOn(component, 'showError');

    component.generateCommissions();

    expect(component.showError).toHaveBeenCalled();
  });

  it('buildSaleRow should preselect pending sales only', () => {
    const report: any = { items_by_order: {} };
    const line_map = new Map();

    const pending: any = { order_id: 1, payment_id: 2, order_total: 100, amount_paid_in_period: 100 };
    expect(component.buildSaleRow(pending, report, line_map).selected).toBeTrue();

    const generated: any = { order_id: 3, payment_id: 4, order_total: 50, amount_paid_in_period: 50, commission_id: 9, commission_bill_id: 7 };
    const generated_row = component.buildSaleRow(generated, report, line_map);
    expect(generated_row.selected).toBeFalse();
    expect(generated_row.commission_id).toBe(9);
  });

  it('toggleSelectSale should update the selection totals', () => {
    component.sale_rows = [
      { sale_key: '1-2', order_id: 1, payment_id: 2, commission_amount: 100, selected: true, item_rows: [] },
      { sale_key: '3-4', order_id: 3, payment_id: 4, commission_amount: 50, selected: true, item_rows: [] }
    ] as any;
    component.commission_lines = [
      { order_id: 1, payment_id: 2, paid_ratio: 1, amount: 100, items: [] },
      { order_id: 3, payment_id: 4, paid_ratio: 1, amount: 50, items: [] }
    ];
    component.refreshSelection();
    expect(component.selected_count).toBe(2);
    expect(component.all_selected).toBeTrue();

    component.toggleSelectSale(component.sale_rows[0], { target: { checked: false } } as any);

    expect(component.sale_rows[0].selected).toBeFalse();
    expect(component.selected_count).toBe(1);
    expect(component.total_selected).toBe(50);
    expect(component.all_selected).toBeFalse();
  });

  it('toggleSelectAll should select and deselect every sale', () => {
    component.sale_rows = [
      { sale_key: '1-2', order_id: 1, payment_id: 2, commission_amount: 100, selected: false, item_rows: [] },
      { sale_key: '3-4', order_id: 3, payment_id: 4, commission_amount: 50, selected: false, item_rows: [] }
    ] as any;
    component.commission_lines = [
      { order_id: 1, payment_id: 2, paid_ratio: 1, amount: 100, items: [] },
      { order_id: 3, payment_id: 4, paid_ratio: 1, amount: 50, items: [] }
    ];
    component.refreshSelection();
    expect(component.selected_count).toBe(0);

    component.toggleSelectAll({ target: { checked: true } } as any);

    expect(component.sale_rows[0].selected).toBeTrue();
    expect(component.sale_rows[1].selected).toBeTrue();
    expect(component.selected_count).toBe(2);
    expect(component.total_selected).toBe(150);
    expect(component.all_selected).toBeTrue();

    component.toggleSelectAll({ target: { checked: false } } as any);

    expect(component.selected_count).toBe(0);
    expect(component.total_selected).toBe(0);
    expect(component.all_selected).toBeFalse();
  });

  it('generateCommissions should send only selected lines', () => {
    component.calc_errors = [];
    component.agent_name = 'Test Agent';
    component.sale_rows = [
      { sale_key: '1-2', order_id: 1, payment_id: 2, commission_amount: 100, selected: true, item_rows: [] },
      { sale_key: '3-4', order_id: 3, payment_id: 4, commission_amount: 50, selected: false, item_rows: [] }
    ] as any;
    component.commission_lines = [
      { order_id: 1, payment_id: 2, paid_ratio: 1, amount: 100, items: [] },
      { order_id: 3, payment_id: 4, paid_ratio: 1, amount: 50, items: [] }
    ];
    component.refreshSelection();

    let sent: any = null;
    (component.rest as any).httpPost = (...args: any[]) => {
      sent = args[1];
      return of({ generated_commission_ids: [7], skipped: [], sales: [], items_by_order: {}, summary: null, agent: null });
    };
    component.confirmation = { showConfirmAlert: () => of({ accepted: true }) } as any;

    component.generateCommissions();

    expect(sent).not.toBeNull();
    expect(sent.lines.length).toBe(1);
    expect(sent.lines[0].order_id).toBe(1);
  });

  it('generateCommissions should require at least one selected line', () => {
    component.calc_errors = [];
    component.sale_rows = [{ sale_key: '1-2', order_id: 1, payment_id: 2, commission_amount: 100, selected: false, item_rows: [] }] as any;
    component.commission_lines = [{ order_id: 1, payment_id: 2, paid_ratio: 1, amount: 100, items: [] }];
    spyOn(component, 'showError');

    component.generateCommissions();

    expect(component.showError).toHaveBeenCalledWith('Seleccione al menos una comisión para generar.');
  });

  it('onRestoreItemAmount should restore the calculated value and roll up', () => {
    const sale: any = {
      sale_key: '1-2', order_id: 1, payment_id: 2, commission_amount: 140, selected: true,
      item_rows: [
        { order_item_id: 11, commission_amount: 100, commission_calculated: 60 },
        { order_item_id: 12, commission_amount: 40, commission_calculated: 40 }
      ]
    };
    component.commission_lines = [{ order_id: 1, payment_id: 2, paid_ratio: 1, amount: 140, items: [
      { order_item_id: 11, rule_id: 1, amount: 100 },
      { order_item_id: 12, rule_id: 1, amount: 40 }
    ]}];
    component.total_calculated = 140;

    const input = document.createElement('input');
    input.value = '100';
    component.onRestoreItemAmount(sale, sale.item_rows[0], input);

    expect(sale.item_rows[0].commission_amount).toBe(60);
    expect(component.commission_lines[0].items[0].amount).toBe(60);
    expect(sale.commission_amount).toBe(100);
    expect(component.commission_lines[0].amount).toBe(100);
    expect(component.total_calculated).toBe(100);
    expect(input.value).toBe('60');
  });

  it('onRestoreItemAmount should error when the line is missing', () => {
    const sale: any = {
      sale_key: '1-2', order_id: 1, payment_id: 2, commission_amount: 100,
      item_rows: [{ order_item_id: 11, commission_amount: 100, commission_calculated: 60 }]
    };
    component.commission_lines = [];
    spyOn(component, 'showError');

    component.onRestoreItemAmount(sale, sale.item_rows[0], null);

    expect(component.showError).toHaveBeenCalled();
    expect(sale.item_rows[0].commission_amount).toBe(100);
  });

  it('buildSaleRow should keep the calculated item value', () => {
    const report: any = { items_by_order: { '1': { items: [
      { order_item_id: 11, item_name: 'Test', qty: 1, unitary_price: 10, total_commission: 5 }
    ] } } };
    const line_map = new Map();
    line_map.set('1-2', { order_id: 1, payment_id: 2, paid_ratio: 1, amount: 60, items: [
      { order_item_id: 11, rule_id: 1, amount: 60 }
    ]});
    const sale: any = { order_id: 1, payment_id: 2, order_total: 100, amount_paid_in_period: 100 };

    const row = component.buildSaleRow(sale, report, line_map);

    expect(row.item_rows[0].commission_amount).toBe(60);
    expect(row.item_rows[0].commission_calculated).toBe(60);
  });
});
