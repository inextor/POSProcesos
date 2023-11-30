import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveProcessComponent } from './save-process.component';

describe('SaveProcessComponent', () => {
  let component: SaveProcessComponent;
  let fixture: ComponentFixture<SaveProcessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveProcessComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SaveProcessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
