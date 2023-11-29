import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveProductionAreaComponent } from './save-production-area.component';

describe('SaveProductionAreaComponent', () => {
  let component: SaveProductionAreaComponent;
  let fixture: ComponentFixture<SaveProductionAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveProductionAreaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SaveProductionAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
