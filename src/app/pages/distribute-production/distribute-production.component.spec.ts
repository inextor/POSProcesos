import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DistributeProductionComponent } from './distribute-production.component';

describe('DistributeProductionComponent', () => {
  let component: DistributeProductionComponent;
  let fixture: ComponentFixture<DistributeProductionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DistributeProductionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DistributeProductionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
