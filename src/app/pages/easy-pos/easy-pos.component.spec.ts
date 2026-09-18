import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EasyPosComponent } from './easy-pos.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';

describe('EasyPosComponent', () => {
  let component: EasyPosComponent;
  let fixture: ComponentFixture<EasyPosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EasyPosComponent],
      providers: provideComponentMocks()
    })
    .compileComponents();

    fixture = TestBed.createComponent(EasyPosComponent);
    component = fixture.componentInstance;
  });

  it('should create without $localize (no i18n markers in template)', () => {
    expect(component).toBeTruthy();
  });
});
