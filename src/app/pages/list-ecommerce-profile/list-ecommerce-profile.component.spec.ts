import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListEcommerceProfileComponent } from './list-ecommerce-profile.component';

describe('ListEcommerceProfileComponent', () => {
  let component: ListEcommerceProfileComponent;
  let fixture: ComponentFixture<ListEcommerceProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListEcommerceProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListEcommerceProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
