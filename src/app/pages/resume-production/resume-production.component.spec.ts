import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumeProductionComponent } from './resume-production.component';

describe('ResumeProductionComponent', () => {
  let component: ResumeProductionComponent;
  let fixture: ComponentFixture<ResumeProductionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumeProductionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResumeProductionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
