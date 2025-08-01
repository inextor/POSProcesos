import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReporteEstadoCuentaClienteComponent } from './reporte-estado-cuenta-cliente.component';

describe('ReporteEstadoCuentaClienteComponent', () => {
  let component: ReporteEstadoCuentaClienteComponent;
  let fixture: ComponentFixture<ReporteEstadoCuentaClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteEstadoCuentaClienteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReporteEstadoCuentaClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
