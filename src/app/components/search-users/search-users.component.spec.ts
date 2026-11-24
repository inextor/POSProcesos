import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { SearchUsersComponent } from './search-users.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';
import { ShortcutsService } from '../../modules/shared/services/shortcuts.service';
import { Subject } from 'rxjs';

describe('SearchUsersComponent', () => {
  let component: SearchUsersComponent;
  let fixture: ComponentFixture<SearchUsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchUsersComponent],
      providers: [...provideComponentMocks(), { provide: ShortcutsService, useValue: { shortcuts: new Subject() } }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should only query staff (no providers)', fakeAsync(() => {
    const search_spy = spyOn(component.rest_user, 'search');
    component.search_subject.next('acme');
    tick(400);
    expect(search_spy).toHaveBeenCalled();
    const query: any = search_spy.calls.mostRecent().args[0];
    expect(query.eq.type).toBe('USER');
    expect(query.search_extra['user_permission.is_provider']).toBe(0);
    tick(1);
  }));
});
