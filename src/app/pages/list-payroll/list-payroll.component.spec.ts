import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListPayrollComponent } from './list-payroll.component';

describe('ListPayrollComponent', () => {
  let component: ListPayrollComponent;
  let fixture: ComponentFixture<ListPayrollComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListPayrollComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ListPayrollComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
