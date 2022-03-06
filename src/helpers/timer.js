export const unactiveTimerRuntimeSettings = {
  duration: 0, // seconds
  endDate: 0, // timestamp
};

export const defaultTimerSettings = {
  isEnabled: true,
  defaultValue: '00:30', // hh:mm
  allowStoppingTimer: true,
  displayNotificationOnComplete: true,
  allowUsingTimerWithoutPassword: false,
  runtime: unactiveTimerRuntimeSettings,
};

function zpad(number) {
  return `${number < 10 ? '0' : ''}${number}`;
}

export function formatRemainingTime(time) {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;

  return `${zpad(hours)}:${zpad(minutes)}:${zpad(seconds)}`;
}

export function hmsToSeconds(str) {
  const [hh = '0', mm = '0', ss = '0'] = (str || '0:0:0').split(':');
  const hour = parseInt(hh, 10) || 0;
  const minute = parseInt(mm, 10) || 0;
  const second = parseInt(ss, 10) || 0;

  return hour * 3600 + minute * 60 + second;
}
