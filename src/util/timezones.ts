export const TIMEZONES = [
  "Pacific/Midway",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Caracas",
  "America/Sao_Paulo",
  "Atlantic/Azores",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Athens",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Asia/Jakarta",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Noumea",
  "Pacific/Auckland",
  "Pacific/Fiji",
  "Pacific/Tongatapu"
];

const TIMEZONE_LOCALE_MAP: { [key: string]: string } = {
  "Pacific/Midway": "en-US",
  "Pacific/Honolulu": "en-US",
  "America/Anchorage": "en-US",
  "America/Los_Angeles": "en-US",
  "America/Denver": "en-US",
  "America/Chicago": "en-US",
  "America/New_York": "en-US",
  "America/Caracas": "es-VE",
  "America/Sao_Paulo": "pt-BR",
  "Atlantic/Azores": "pt-PT",
  "Europe/London": "en-GB",
  "Europe/Berlin": "de-DE",
  "Europe/Athens": "el-GR",
  "Europe/Moscow": "ru-RU",
  "Asia/Dubai": "ar-AE",
  "Asia/Karachi": "ur-PK",
  "Asia/Dhaka": "bn-BD",
  "Asia/Jakarta": "id-ID",
  "Asia/Shanghai": "zh-CN",
  "Asia/Tokyo": "ja-JP",
  "Australia/Sydney": "en-AU",
  "Pacific/Noumea": "fr-NC",
  "Pacific/Auckland": "en-NZ",
  "Pacific/Fiji": "en-FJ",
  "Pacific/Tongatapu": "en-TO"
};

export function getLocaleFromTimezone(timezone: string): string {
  return TIMEZONE_LOCALE_MAP[timezone] || "en-US"; // Default to "en-US" if timezone is not found
}
