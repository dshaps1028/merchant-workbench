// Shared utility functions for testing and runtime reuse

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const levenshtein = (a, b) => {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
};

const fuzzyNormalizeQuery = (text) => {
  const vocab = [
    'yesterday',
    'today',
    'tomorrow',
    'last',
    'past',
    'week',
    'month',
    'year',
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];
  const parts = text.toLowerCase().split(/\b/);
  let warning = '';
  const normalized = parts
    .map((tok) => {
      if (!/[a-z]/.test(tok)) return tok;
      let best = tok;
      let bestDist = Infinity;
      for (const cand of vocab) {
        const d = levenshtein(tok, cand);
        if (d < bestDist) {
          bestDist = d;
          best = cand;
        }
      }
      if (bestDist > 0 && bestDist <= 2 && best !== tok) {
        warning = warning || `Interpreted "${tok}" as "${best}".`;
        return best;
      }
      return tok;
    })
    .join('');
  return { normalized, warning };
};

const deriveDateRangeFromQuery = (query, existingMin, existingMax) => {
  let created_at_min = existingMin;
  let created_at_max = existingMax;

  if (created_at_min || created_at_max) {
    return { created_at_min, created_at_max, warning: '' };
  }

  const { normalized: lcQuery, warning } = fuzzyNormalizeQuery(query);
  const dayMs = 24 * 60 * 60 * 1000;
  let rangeStart = null;
  let rangeEnd = null;
  const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const fuzzyIncludes = (needle) => lcQuery.includes(needle) || lcQuery.replace(/[^a-z]/g, '').includes(needle);

  const explicitDateMatch =
    query.match(/\b\d{4}-\d{2}-\d{2}\b/) ||
    query.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i);
  const monthOnlyMatch = query.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b(?:\s+(\d{4}))?/i
  );

  if (explicitDateMatch) {
    const parsed = Date.parse(explicitDateMatch[0]);
    if (!Number.isNaN(parsed)) {
      const parsedDate = new Date(parsed);
      rangeStart = startOfDay(parsedDate);
      rangeEnd = endOfDay(parsedDate);
    }
  } else if (monthOnlyMatch) {
    const monthToken = monthOnlyMatch[1].toLowerCase().slice(0, 3);
    const monthIndex =
      ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(
        monthToken === 'sep' && monthOnlyMatch[1].toLowerCase().startsWith('sept') ? 'sep' : monthToken
      );
    const now = new Date();
    const year = monthOnlyMatch[2] ? Number(monthOnlyMatch[2]) : now.getFullYear();
    if (monthIndex !== -1) {
      const effectiveYear =
        !monthOnlyMatch[2] && monthIndex > now.getMonth() ? now.getFullYear() - 1 : year;
      rangeStart = new Date(effectiveYear, monthIndex, 1, 0, 0, 0, 0);
      rangeEnd = new Date(effectiveYear, monthIndex + 1, 0, 23, 59, 59, 999);
    }
  } else if (lcQuery.match(/\b(last|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)) {
    const weekdayMatch = lcQuery.match(/\b(last|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    const mode = weekdayMatch && weekdayMatch[1] ? weekdayMatch[1].trim() : '';
    const dayToken = weekdayMatch ? weekdayMatch[2] : '';
    const targetIndex = weekdayNames.indexOf(dayToken);
    if (targetIndex !== -1) {
      const now = new Date();
      const nowIndex = now.getDay();
      let diff = (nowIndex - targetIndex + 7) % 7;
      if (mode === 'last' && diff === 0) diff = 7;
      const targetDate = new Date(now.getTime() - diff * dayMs);
      rangeStart = startOfDay(targetDate);
      rangeEnd = endOfDay(targetDate);
    }
  } else if (fuzzyIncludes('lastyear')) {
    const now = new Date();
    rangeStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    rangeEnd = new Date(now.getFullYear(), 0, 0, 23, 59, 59, 999);
  } else if (fuzzyIncludes('pastyear')) {
    const now = new Date();
    rangeStart = startOfDay(new Date(now.getTime() - 365 * dayMs));
    rangeEnd = endOfDay(now);
  } else if (fuzzyIncludes('lastmonth')) {
    const now = new Date();
    rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    rangeEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (fuzzyIncludes('pastmonth') || /(past|last)\s+30\s+days/.test(lcQuery)) {
    const now = new Date();
    rangeStart = startOfDay(new Date(now.getTime() - 30 * dayMs));
    rangeEnd = endOfDay(now);
  } else if (fuzzyIncludes('lastweek') || fuzzyIncludes('pastweek') || /(past|last)\s+7\s+days/.test(lcQuery)) {
    const now = new Date();
    rangeStart = startOfDay(new Date(now.getTime() - 7 * dayMs));
    rangeEnd = endOfDay(now);
  } else if (lcQuery.includes('yesterday') || /\byesterd[a-z]*\b/.test(lcQuery)) {
    const now = new Date();
    rangeStart = startOfDay(new Date(now.getTime() - dayMs));
    rangeEnd = endOfDay(new Date(now.getTime() - dayMs));
  } else if (fuzzyIncludes('today')) {
    const now = new Date();
    rangeStart = startOfDay(now);
    rangeEnd = endOfDay(now);
  }

  return {
    created_at_min: rangeStart ? rangeStart.toISOString() : created_at_min,
    created_at_max: rangeEnd ? rangeEnd.toISOString() : created_at_max,
    warning
  };
};

const parseTagList = (text) => {
  const tags = new Set();
  const quoted = [...text.matchAll(/["']([^"']+)["']/g)].map((m) => m[1].trim());
  quoted.forEach((t) => t && tags.add(t));

  const stopWords = new Set([
    'to',
    'these',
    'those',
    'orders',
    'order',
    'please',
    'the',
    'my',
    'a',
    'an',
    'and',
    'with',
    'for',
    'add',
    'apply',
    'update',
    'change',
    'set',
    'tag',
    'tags'
  ]);

  const parts = text
    .split(/tag[s]?:?/i)
    .slice(1)
    .join(' ')
    .split(/[,|\s]+/);
  parts.forEach((p) => {
    const cleaned = p.trim().replace(/[?!.]/g, '');
    if (!cleaned) return;
    if (stopWords.has(cleaned.toLowerCase())) return;
    if (/^[A-Za-z0-9_-]+$/.test(cleaned)) {
      tags.add(cleaned);
    }
  });

  return Array.from(tags);
};

module.exports = {
  startOfDay,
  endOfDay,
  deriveDateRangeFromQuery,
  parseTagList,
  fuzzyNormalizeQuery,
  levenshtein
};
