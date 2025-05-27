import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveProductionRoleComponent } from './save-production-role.component';

describe('SaveProductionRoleComponent', () => {
  let component: SaveProductionRoleComponent;
  let fixture: ComponentFixture<SaveProductionRoleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveProductionRoleComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SaveProductionRoleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
