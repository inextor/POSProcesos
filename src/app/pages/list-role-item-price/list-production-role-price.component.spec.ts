import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListProductionRolePriceComponent } from './list-production-role-price.component';

describe('ListProductionRolePriceComponent', () => {
  let component: ListProductionRolePriceComponent;
  let fixture: ComponentFixture<ListProductionRolePriceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListProductionRolePriceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ListProductionRolePriceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
