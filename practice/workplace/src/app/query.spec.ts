import { convertToParamMap } from '@angular/router';
import { readQuery } from './query';

describe('readQuery', () => {
  it('normalizes external URL values before they reach the API', () => {
    expect(readQuery(convertToParamMap({ q: '  VPN  ', status: 'unknown', page: '-2' })))
      .toEqual({ q: 'VPN', status: 'all', page: 1 });
    expect(readQuery(convertToParamMap({ status: 'open', page: '2' })))
      .toEqual({ q: '', status: 'open', page: 2 });
  });
  it('rejects fractions, Infinity and non-numeric pages', () => {
    for (const page of ['1.5', 'Infinity', 'abc', '0', '9007199254740992']) {
      expect(readQuery(convertToParamMap({ page })).page).toBe(1);
    }
  });
});
