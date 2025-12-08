const {
  startOfDay,
  endOfDay,
  deriveDateRangeFromQuery,
  parseTagList,
  fuzzyNormalizeQuery
} = require('../utils');

describe('utils date helpers', () => {
  const freeze = (iso) => {
    const now = new Date(iso);
    jest.useFakeTimers().setSystemTime(now);
    return now;
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  test('startOfDay/endOfDay produce expected boundaries (local time)', () => {
    const base = new Date('2025-10-15T12:34:56Z');
    const start = startOfDay(base);
    const end = endOfDay(base);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(9);
    expect(start.getDate()).toBe(15);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);

    expect(end.getFullYear()).toBe(2025);
    expect(end.getMonth()).toBe(9);
    expect(end.getDate()).toBe(15);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });

  test('deriveDateRangeFromQuery handles "yesterdy" typo and returns warning', () => {
    freeze('2025-10-15T12:00:00Z');
    const { created_at_min, created_at_max, warning } = deriveDateRangeFromQuery('orders from yesterdy');
    expect(warning).toMatch(/Interpreted "yesterdy" as "yesterday"/i);
    const minDate = new Date(created_at_min);
    const maxDate = new Date(created_at_max);
    expect(maxDate.getTime() - minDate.getTime()).toBe(23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000 + 999);
    expect(minDate.getDate()).toBe(maxDate.getDate());
  });

  test('deriveDateRangeFromQuery handles month-only queries', () => {
    freeze('2025-10-15T12:00:00Z');
    const { created_at_min, created_at_max, warning } = deriveDateRangeFromQuery('show me orders in September 2025');
    expect(warning).toBe('');
    const min = new Date(created_at_min);
    const max = new Date(created_at_max);
    expect(max.getTime() - min.getTime()).toBeGreaterThan(25 * 24 * 60 * 60 * 1000); // full month span
    expect(min.getFullYear()).toBe(2025);
    expect(max.getFullYear()).toBe(2025);
  });

  test('deriveDateRangeFromQuery handles past week phrases', () => {
    freeze('2025-10-15T12:00:00Z');
    const { created_at_min, created_at_max } = deriveDateRangeFromQuery('orders from the past week');
    const min = new Date(created_at_min);
    const max = new Date(created_at_max);
    // Range should cover roughly 7 days
    const days = Math.round((max - min) / (24 * 60 * 60 * 1000));
    expect(days).toBeGreaterThanOrEqual(6);
    expect(days).toBeLessThanOrEqual(8);
  });
});

describe('utils text parsing', () => {
  test('parseTagList extracts quoted and unquoted tags', () => {
    const tags = parseTagList('add tag "holiday_sale" and clearance, vip');
    expect(tags).toEqual(expect.arrayContaining(['holiday_sale', 'clearance', 'vip']));
  });

  test('parseTagList ignores stop words and punctuation', () => {
    const tags = parseTagList('please add tags to these orders?');
    expect(tags).toEqual([]);
  });

  test('parseTagList handles multiple quoted tags', () => {
    const tags = parseTagList('apply tags "holiday_sale" "vip_cust" and promo');
    expect(tags).toEqual(expect.arrayContaining(['holiday_sale', 'vip_cust', 'promo']));
  });

  test('fuzzyNormalizeQuery normalizes close matches', () => {
    const { normalized, warning } = fuzzyNormalizeQuery('yesterdy');
    expect(normalized).toBe('yesterday');
    expect(warning).toMatch(/Interpreted "yesterdy" as "yesterday"/i);
  });

  test('levenshtein distance basics', () => {
    expect(fuzzyNormalizeQuery('today').warning).toBe('');
    // quick sanity: distance 1 case gets normalized when in vocab
    const { normalized } = fuzzyNormalizeQuery('tday');
    expect(normalized.includes('today')).toBe(true);
  });
});
