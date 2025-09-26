import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavePurchaseComponent } from './save-purchase.component';

describe('SavePurchaseComponent', () => {
  let component: SavePurchaseComponent;
  let fixture: ComponentFixture<SavePurchaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavePurchaseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SavePurchaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
