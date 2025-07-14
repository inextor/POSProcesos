import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListEcommerceOrderComponent } from './list-ecommerce-order.component';

describe('ListEcommerceOrderComponent', () => {
  let component: ListEcommerceOrderComponent;
  let fixture: ComponentFixture<ListEcommerceOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListEcommerceOrderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListEcommerceOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
