import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListTaskCommentComponent } from './list-task-comment.component';

describe('ListTaskCommentComponent', () => {
  let component: ListTaskCommentComponent;
  let fixture: ComponentFixture<ListTaskCommentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListTaskCommentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ListTaskCommentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
