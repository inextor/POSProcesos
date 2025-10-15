import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListItemOnlineComponent } from './list-item-online.component';

describe('ListItemOnlineComponent', () => {
  let component: ListItemOnlineComponent;
  let fixture: ComponentFixture<ListItemOnlineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListItemOnlineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListItemOnlineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
