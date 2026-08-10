import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListSatFacturaComponent } from './list-sat-factura.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';

describe('ListSatFacturaComponent', () => {
  let component: ListSatFacturaComponent;
  let fixture: ComponentFixture<ListSatFacturaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListSatFacturaComponent],
      providers: provideComponentMocks()
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListSatFacturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
