
export function inTime(start, end) {
  const now = new Date();
  const time = now.getHours() * 60 + now.getMinutes();
  return time >= start && (!end || time < end);
}
