
export const DaysOfWeek = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

export const DaysNumbers = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0
};

export const WorkingDays = DaysOfWeek.slice(0, -2); // Monday to Friday

export const WeekendDays = DaysOfWeek.slice(-2); // Weekend

export function inToday(days) {
  const now = new Date();
  const day = now.getDay();
  return !!days.find(d => DaysNumbers[d] === day);
}
