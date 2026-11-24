import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { SearchClientsComponent } from './search-clients.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';
import { ShortcutsService } from '../../modules/shared/services/shortcuts.service';
import { Subject } from 'rxjs';

describe('SearchClientsComponent', () => {
  let component: SearchClientsComponent;
  let fixture: ComponentFixture<SearchClientsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchClientsComponent],
      providers: [...provideComponentMocks(), { provide: ShortcutsService, useValue: { shortcuts: new Subject() } }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchClientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should only query CLIENT type', fakeAsync(() => {
    const search_spy = spyOn(component.rest_user, 'search');
    component.search_subject.next('acme');
    tick(400);
    expect(search_spy).toHaveBeenCalled();
    const query: any = search_spy.calls.mostRecent().args[0];
    expect(query.eq.type).toBe('CLIENT');
    expect(query.search_extra).toBeUndefined();
    tick(1);
  }));
});
