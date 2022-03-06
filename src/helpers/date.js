export const DaysOfWeek = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const DayNumber = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
};

export const DayString = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export const WorkingDays = DaysOfWeek.slice(0, -2); // Monday to Friday

export const WeekendDays = DaysOfWeek.slice(-2); // Weekend

export function today(asNumber = false) {
  const now = new Date();
  const day = now.getDay();
  return asNumber ? day : DayString[day];
}

export function inToday(days) {
  const day = today();
  return !!days.find((d) => d === day);
}

export function now(asTimestamp = false) {
  const date = new Date();
  return asTimestamp ? date.getTime() : date;
}
