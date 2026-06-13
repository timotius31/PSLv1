import { config } from "./config.js";

export function getZonedParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: config.appTimezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );

  return {
    weekday: parts.weekday.toLowerCase(),
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
}

export function isWithinWeeklyWindow(schedule, date = new Date()) {
  if (!schedule || schedule.is_manually_open) return true;

  const { weekday, minutes } = getZonedParts(date);
  const start = timeToMinutes(schedule.start_time);
  const end = timeToMinutes(schedule.end_time);

  return schedule.weekday === weekday && minutes >= start && minutes <= end;
}

function timeToMinutes(value) {
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}
