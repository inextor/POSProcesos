import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavePayrollConceptComponent } from './save-payroll-concept.component';

describe('SavePayrollConceptComponent', () => {
  let component: SavePayrollConceptComponent;
  let fixture: ComponentFixture<SavePayrollConceptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavePayrollConceptComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SavePayrollConceptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
