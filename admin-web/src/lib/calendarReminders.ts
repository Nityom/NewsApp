import type { CalendarReminder } from '../types/calendar';

const STORAGE_KEY = 'newsapp_calendar_user_reminders';

/**
 * Get all reminders stored on the current device.
 */
export function getAllReminders(): CalendarReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CalendarReminder[];
  } catch (err) {
    console.error('Failed to load reminders from localStorage:', err);
    return [];
  }
}

/**
 * Get reminders filtered for a specific calendar, and optionally specific month.
 */
export function getRemindersForCalendar(
  calendarId: string,
  monthIndex?: number
): CalendarReminder[] {
  const all = getAllReminders();
  return all
    .filter((r) => {
      const matchCal = !calendarId || r.calendarId === calendarId;
      const matchMonth = monthIndex === undefined || r.monthIndex === monthIndex;
      return matchCal && matchMonth;
    })
    .sort((a, b) => a.day - b.day || a.createdAt - b.createdAt);
}

/**
 * Save (create or update) a reminder to this device's localStorage.
 */
export function saveReminder(reminder: CalendarReminder): void {
  try {
    const all = getAllReminders();
    const idx = all.findIndex((r) => r.id === reminder.id);
    if (idx >= 0) {
      all[idx] = reminder;
    } else {
      all.push(reminder);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save reminder:', err);
  }
}

/**
 * Delete a reminder by its ID.
 */
export function deleteReminder(id: string): void {
  try {
    const all = getAllReminders();
    const filtered = all.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete reminder:', err);
  }
}

/**
 * Toggle the completed status of a reminder.
 */
export function toggleReminderComplete(id: string): void {
  try {
    const all = getAllReminders();
    const item = all.find((r) => r.id === id);
    if (item) {
      item.completed = !item.completed;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  } catch (err) {
    console.error('Failed to toggle reminder:', err);
  }
}

/**
 * Check which reminders are due today.
 */
export function getDueRemindersToday(allReminders: CalendarReminder[]): CalendarReminder[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  return allReminders.filter(
    (r) =>
      !r.completed &&
      r.year === currentYear &&
      r.monthIndex === currentMonth &&
      r.day === currentDay
  );
}

/**
 * Request browser permission for system push/banner notifications.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

/**
 * Trigger a native desktop/device browser notification if allowed.
 */
export function triggerBrowserNotification(title: string, body?: string): boolean {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }
  try {
    new Notification(title, {
      body: body || 'Reminder scheduled in your NewsApp Calendar',
      icon: '/favicon.ico',
    });
    return true;
  } catch (err) {
    console.error('Failed to trigger browser notification:', err);
    return false;
  }
}

/**
 * Generate a 1-click Google Calendar URL with preset alarm for the reminder.
 */
export function getGoogleCalendarUrl(reminder: CalendarReminder): string {
  const year = reminder.year || new Date().getFullYear();
  const month = String(reminder.monthIndex + 1).padStart(2, '0');
  const day = String(reminder.day).padStart(2, '0');

  const dateStr = `${year}${month}${day}`;
  let datesParam = `${dateStr}/${dateStr}`;

  if (reminder.time && reminder.time.includes(':')) {
    const [hh, mm] = reminder.time.split(':');
    const startHour = parseInt(hh, 10) || 9;
    const startMin = parseInt(mm, 10) || 0;
    const pad = (n: number) => String(n).padStart(2, '0');
    const startTimeStr = `${dateStr}T${pad(startHour)}${pad(startMin)}00`;
    const endTimeStr = `${dateStr}T${pad((startHour + 1) % 24)}${pad(startMin)}00`;
    datesParam = `${startTimeStr}/${endTimeStr}`;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: reminder.title,
    dates: datesParam,
    details: `${reminder.note || ''}\n\n[Created via NewsApp Calendar Studio]`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}


/**
 * Generate and download an .ics iCalendar file that syncs directly
 * to Apple Calendar, Outlook, or native Android calendar with an audible alarm.
 */
export function downloadIcsCalendarFile(reminder: CalendarReminder): void {
  const year = reminder.year || new Date().getFullYear();
  const month = String(reminder.monthIndex + 1).padStart(2, '0');
  const day = String(reminder.day).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const nowStr = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NewsApp//Calendar Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${reminder.id}@newsapp.calendar`,
    `DTSTAMP:${nowStr}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${dateStr}`,
    `SUMMARY:${reminder.title.replace(/[\n\r]/g, ' ')}`,
    `DESCRIPTION:${(reminder.note || '').replace(/[\n\r]/g, '\\n')}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${reminder.title.replace(/[\n\r]/g, ' ')}`,
    'TRIGGER:-PT15M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${reminder.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
