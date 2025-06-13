import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListItemProductionComponent } from './list-item-production.component';

describe('ListItemProductionComponent', () => {
  let component: ListItemProductionComponent;
  let fixture: ComponentFixture<ListItemProductionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListItemProductionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ListItemProductionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
