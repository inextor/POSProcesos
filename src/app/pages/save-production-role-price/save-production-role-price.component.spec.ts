import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveProductionRolePriceComponent } from './save-production-role-price.component';

describe('SaveProductionRolePriceComponent', () => {
  let component: SaveProductionRolePriceComponent;
  let fixture: ComponentFixture<SaveProductionRolePriceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveProductionRolePriceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SaveProductionRolePriceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
