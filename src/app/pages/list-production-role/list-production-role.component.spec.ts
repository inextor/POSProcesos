import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListProductionRoleComponent } from './list-production-role.component';

describe('ListProductionRoleComponent', () => {
  let component: ListProductionRoleComponent;
  let fixture: ComponentFixture<ListProductionRoleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListProductionRoleComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ListProductionRoleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
