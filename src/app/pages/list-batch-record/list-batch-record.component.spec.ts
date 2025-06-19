import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListBatchRecordComponent } from './list-batch-record.component';

describe('ListBatchRecordComponent', () => {
  let component: ListBatchRecordComponent;
  let fixture: ComponentFixture<ListBatchRecordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListBatchRecordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListBatchRecordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
