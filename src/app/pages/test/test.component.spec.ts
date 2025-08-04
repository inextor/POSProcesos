import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { TestComponent } from './test.component';

describe('TestComponent', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestComponent]
    });
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the label after a delay', fakeAsync(() => {
    const button = fixture.nativeElement.querySelector('button');
    button.click();
    
    let label = fixture.nativeElement.querySelector('p');
    expect(label).toBeFalsy();

    tick(60000);
    fixture.detectChanges();
    debugger;
    
    label = fixture.nativeElement.querySelector('p');
    expect(label).toBeTruthy();
  }));
});
