import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumeProductionDayComponent } from './resume-production-day.component';

describe('ResumeProductionDayComponent', () => {
  let component: ResumeProductionDayComponent;
  let fixture: ComponentFixture<ResumeProductionDayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumeProductionDayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResumeProductionDayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
