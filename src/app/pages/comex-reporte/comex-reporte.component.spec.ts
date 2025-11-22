import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComexReporteComponent } from './comex-reporte.component';

describe('ComexReporteComponent', () => {
  let component: ComexReporteComponent;
  let fixture: ComponentFixture<ComexReporteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComexReporteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComexReporteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
