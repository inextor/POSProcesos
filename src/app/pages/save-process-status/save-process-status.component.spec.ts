import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveProcessStatusComponent } from './save-process-status.component';

describe('SaveProcessStatusComponent', () => {
  let component: SaveProcessStatusComponent;
  let fixture: ComponentFixture<SaveProcessStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveProcessStatusComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SaveProcessStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
