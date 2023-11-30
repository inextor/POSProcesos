import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveProductionAreaItemComponent } from './save-production-area-item.component';

describe('SaveProductionAreaItemComponent', () => {
  let component: SaveProductionAreaItemComponent;
  let fixture: ComponentFixture<SaveProductionAreaItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveProductionAreaItemComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SaveProductionAreaItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
