import { DaysOfWeek, today } from './date';
import { report } from './debug';

export const ScheduleType = {
  blockingTime: 'blocking',
  allowedTime: 'allowed'
};

export const newScheduleTimeRange = () => ({
  time: {
    start: '',
    end: ''
  },
  type: ScheduleType.blockingTime
});

export const defaultSchedule = {
  isEnabled: false,
  days: DaysOfWeek.reduce((acc, cur) => ({
    ...acc,
    [cur]: [],
  }), {}),
};

export function parseTime(time) {
  const [startHour, startMinute] = time.start.split(':');
  const start = Number(startHour) * 60 + Number(startMinute);
  const [endHour, endMinute] = time.end.split(':');
  const end = Number(endHour) * 60 + Number(endMinute);
  return { start, end };
}

export function inTime(start, end) {
  const now = new Date();
  const time = now.getHours() * 60 + now.getMinutes();
  return time >= start && (!end || time < end);
}

export function getTodaySchedule(schedule) {
  if (!schedule || !schedule.days) {
    return [];
  }
  return schedule.days[today()] || [];
}

export function isTodayScheduleAllowed(schedule) {
  let isAllowed = true;
  try {
    const todaySchedule = getTodaySchedule(schedule);
    for (const range of todaySchedule) {
      if (!isAllowed) break;
      const { start, end } = parseTime(range.time);
      isAllowed = range.type === ScheduleType.allowedTime ? !start || inTime(start, end) : start && !inTime(start, end);
    }
  } catch (error) {
    report.error(error);
  }
  return isAllowed;
}
