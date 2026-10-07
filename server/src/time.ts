const partsOf = (tz: string, date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
};

const pad = (n: number) => String(n).padStart(2, '0');

export const dayKey = (tz: string, date: Date = new Date()) => {
  const p = partsOf(tz, date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
};

export const hourIn = (tz: string, date: Date = new Date()) => partsOf(tz, date).hour;

export const noonOf = (day: string, tz: string) => {
  const [year, month, date] = day.split('-').map(Number);
  const guess = new Date(Date.UTC(year, month - 1, date, 12));
  const p = partsOf(tz, guess);
  const offsetMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - guess.getTime();
  return new Date(guess.getTime() - offsetMs);
};

export const dateLong = (day: string, tz: string) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(noonOf(day, tz));

export const dateFull = (day: string, tz: string) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: tz, day: 'numeric', month: 'long', year: 'numeric' }).format(noonOf(day, tz));
