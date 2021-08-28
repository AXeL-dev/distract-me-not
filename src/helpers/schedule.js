import { DaysOfWeek, today, inTime } from './date';
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

export function getTodayScheduleRange(schedule) {
  let todayRange = null;
  try {
    const todaySchedule = schedule.days[today()] || [];
    for (const range of todaySchedule) {
      if (!todayRange) {
        todayRange = range;
      } else {
        const { start, end } = parseTime(range.time);
        const isInTime = inTime(start, end);
        if (isInTime) {
          todayRange = range;
        }
      }
    }
  } catch (error) {
    report.error(error);
  }
  return todayRange;
}

export function isTodayScheduleAllowed(schedule) {
  let isAllowed = true;
  try {
    const todaySchedule = schedule.days[today()] || [];
    for (const range of todaySchedule) {
      if (!isAllowed) break;
      const { start, end } = parseTime(range.time);
      const isInTime = inTime(start, end);
      isAllowed = range.type === ScheduleType.allowedTime ? !start || isInTime : start && !isInTime;
    }
  } catch (error) {
    report.error(error);
  }
  return isAllowed;
}
