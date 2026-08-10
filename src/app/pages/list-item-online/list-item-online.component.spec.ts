import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListItemOnlineComponent } from './list-item-online.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';

describe('ListItemOnlineComponent', () => {
  let component: ListItemOnlineComponent;
  let fixture: ComponentFixture<ListItemOnlineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListItemOnlineComponent],
      providers: provideComponentMocks()
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
