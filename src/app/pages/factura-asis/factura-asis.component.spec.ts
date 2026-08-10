import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { FacturaAsisComponent } from './factura-asis.component';
import { provideComponentMocks, createRestMock, createRestInstanceMock } from '../../modules/shared/test/test-mocks';
import { GetEmpty } from '../../modules/shared/GetEmpty';

describe('FacturaAsisComponent', () => {
  let component: FacturaAsisComponent;
  let fixture: ComponentFixture<FacturaAsisComponent>;

  beforeEach(async () => {
    const user = GetEmpty.user();
    const rest = createRestMock({ user });
    const empty_order = GetEmpty.order_info(rest, GetEmpty.store(), GetEmpty.price_type());

    await TestBed.configureTestingModule({
      imports: [FacturaAsisComponent],
      providers: provideComponentMocks({
        rest: createRestMock({
          user,
          initRest: () => createRestInstanceMock({ get: () => of(empty_order) })
        })
      })
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
