import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturaAsisComponent } from './factura-asis.component';

describe('FacturaAsisComponent', () => {
  let component: FacturaAsisComponent;
  let fixture: ComponentFixture<FacturaAsisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturaAsisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturaAsisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
