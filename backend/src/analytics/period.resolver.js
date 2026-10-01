const PERIODS = Object.freeze([
  'TODAY',
  'YESTERDAY',
  'THIS_WEEK',
  'LAST_WEEK',
  'THIS_MONTH',
  'LAST_MONTH',
  'LAST_30_DAYS',
  'LAST_90_DAYS',
  'YTD',
  'CUSTOM'
]);

function startOfDay(date) {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setUTCHours(23, 59, 59, 999);
  return value;
}

function startOfMonth(date) {
  const value = startOfDay(date);
  value.setUTCDate(1);
  return value;
}

function endOfMonth(date) {
  const value = startOfMonth(date);
  value.setUTCMonth(value.getUTCMonth() + 1);
  value.setUTCDate(0);
  return endOfDay(value);
}

function startOfWeek(date) {
  const value = startOfDay(date);
  const day = value.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  value.setUTCDate(value.getUTCDate() - offset);
  return value;
}

function endOfWeek(date) {
  const value = startOfWeek(date);
  value.setUTCDate(value.getUTCDate() + 6);
  return endOfDay(value);
}

function parseDate(value, field) {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) {
    const error = new Error('ANALYTICS_INVALID_PERIOD');
    error.code = 'ANALYTICS_INVALID_PERIOD';
    error.status = 400;
    error.details = { field };
    throw error;
  }
  return date;
}

function resolvePeriod(name, input = {}, now = new Date()) {
  const period = String(name || '').trim().toUpperCase();
  if (!PERIODS.includes(period)) {
    const error = new Error('ANALYTICS_INVALID_PERIOD');
    error.code = 'ANALYTICS_INVALID_PERIOD';
    error.status = 400;
    error.details = { period };
    throw error;
  }

  const current = new Date(now);
  let from;
  let to;

  switch (period) {
    case 'TODAY':
      from = startOfDay(current);
      to = endOfDay(current);
      break;
    case 'YESTERDAY': {
      const day = new Date(current);
      day.setUTCDate(day.getUTCDate() - 1);
      from = startOfDay(day);
      to = endOfDay(day);
      break;
    }
    case 'THIS_WEEK':
      from = startOfWeek(current);
      to = endOfWeek(current);
      break;
    case 'LAST_WEEK': {
      const week = startOfWeek(current);
      week.setUTCDate(week.getUTCDate() - 7);
      from = startOfWeek(week);
      to = endOfWeek(week);
      break;
    }
    case 'THIS_MONTH':
      from = startOfMonth(current);
      to = endOfMonth(current);
      break;
    case 'LAST_MONTH': {
      const month = startOfMonth(current);
      month.setUTCMonth(month.getUTCMonth() - 1);
      from = startOfMonth(month);
      to = endOfMonth(month);
      break;
    }
    case 'LAST_30_DAYS':
      to = endOfDay(current);
      from = startOfDay(current);
      from.setUTCDate(from.getUTCDate() - 29);
      break;
    case 'LAST_90_DAYS':
      to = endOfDay(current);
      from = startOfDay(current);
      from.setUTCDate(from.getUTCDate() - 89);
      break;
    case 'YTD':
      from = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
      to = endOfDay(current);
      break;
    case 'CUSTOM':
      from = startOfDay(parseDate(input.from, 'from'));
      to = endOfDay(parseDate(input.to, 'to'));
      break;
    default:
      throw new Error('ANALYTICS_INVALID_PERIOD');
  }

  if (from > to) {
    const error = new Error('ANALYTICS_INVALID_PERIOD');
    error.code = 'ANALYTICS_INVALID_PERIOD';
    error.status = 400;
    error.details = { from: from.toISOString(), to: to.toISOString() };
    throw error;
  }

  const maxDays = Number(process.env.ANALYTICS_MAX_PERIOD_DAYS || 366);
  const spanDays = Math.ceil((to.getTime() - from.getTime()) / 86400000);
  if (spanDays > maxDays) {
    const error = new Error('ANALYTICS_PERIOD_TOO_LARGE');
    error.code = 'ANALYTICS_PERIOD_TOO_LARGE';
    error.status = 400;
    error.details = { max_days: maxDays };
    throw error;
  }

  return { name: period, from, to };
}

module.exports = { PERIODS, resolvePeriod };
