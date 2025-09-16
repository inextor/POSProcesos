import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveProfileComponent } from './save-profile.component';

describe('SaveProfileComponent', () => {
  let component: SaveProfileComponent;
  let fixture: ComponentFixture<SaveProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaveProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
