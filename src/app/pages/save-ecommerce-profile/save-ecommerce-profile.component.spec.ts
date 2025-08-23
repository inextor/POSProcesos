import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveEcommerceProfileComponent } from './save-ecommerce-profile.component';

describe('SaveEcommerceProfileComponent', () => {
  let component: SaveEcommerceProfileComponent;
  let fixture: ComponentFixture<SaveEcommerceProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveEcommerceProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaveEcommerceProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
