import { TestBed } from '@angular/core/testing';
import { MockStore } from './mock-store.service';

describe('MockStore', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(MockStore);
    store.reset();
  });

  it('resets mutated collections', () => {
    store.clients.splice(0, 1);
    expect(store.clients.length).toBe(2);
    store.reset();
    expect(store.clients.length).toBe(3);
    expect(store.session).toBeNull();
  });
});
