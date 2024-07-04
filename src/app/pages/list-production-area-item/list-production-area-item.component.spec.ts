import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListProductionAreaItemComponent } from './list-production-area-item.component';

describe('ListProductionAreaItemComponent', () => {
  let component: ListProductionAreaItemComponent;
  let fixture: ComponentFixture<ListProductionAreaItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListProductionAreaItemComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ListProductionAreaItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
