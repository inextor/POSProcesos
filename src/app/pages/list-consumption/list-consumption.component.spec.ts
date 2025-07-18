import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListConsumptionComponent } from './list-consumption.component';

describe('ListConsumptionComponent', () => {
  let component: ListConsumptionComponent;
  let fixture: ComponentFixture<ListConsumptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListConsumptionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListConsumptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
