export const AUTOCLICKER_THRESHOLD = 60; // Number of failed attempts in an hour to flag
export const AUTOCLICKER_TIMEFRAME = 1000 * 60 * 60; // 1 hour
export const AUTOCLICKER_FLAGGED_TIMEFRAME = 1000 * 60 * 60 * 24; // 24 hours
export const AUTOCLICKER_REFLAG_TIMEFRAME = 1000 * 60 * 60 * 1; // 1 hour to reflag after being flagged
export const AUTOBAN_TIME = 1000 * 60 * 60 * 24 * 7; // 7 day

export const AUTOCLICKER_FAILED_ATTEMPTS_BAN_THRESHOLD = 3; //Number of flags last day to ban

export const EXCESSIVE_WATERING_THRESHOLD = 20; // Threshold for excessive watering events in a day, if you water more than 20 different hours in a day you get flagged
export const WATERING_EVENT_TIMEFRAME = 1000 * 60 * 60 * 24; // 24 hours
