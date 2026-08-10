import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListObjectSatFacturaComponent } from './list-object-sat-factura.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';

describe('ListObjectSatFacturaComponent', () => {
  let component: ListObjectSatFacturaComponent;
  let fixture: ComponentFixture<ListObjectSatFacturaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListObjectSatFacturaComponent],
      providers: provideComponentMocks()
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListObjectSatFacturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
