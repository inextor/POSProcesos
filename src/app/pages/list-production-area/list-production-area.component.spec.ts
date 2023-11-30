import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListProductionAreaComponent } from './list-production-area.component';

describe('ListProductionAreaComponent', () => {
  let component: ListProductionAreaComponent;
  let fixture: ComponentFixture<ListProductionAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListProductionAreaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ListProductionAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
