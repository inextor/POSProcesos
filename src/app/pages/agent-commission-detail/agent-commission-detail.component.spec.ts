import { ComponentFixture, TestBed } from '@angular/core/testing';

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
});
