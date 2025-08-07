import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewSatFacturaComponent } from './view-sat-factura.component';

describe('ViewSatFacturaComponent', () => {
  let component: ViewSatFacturaComponent;
  let fixture: ComponentFixture<ViewSatFacturaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewSatFacturaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewSatFacturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
