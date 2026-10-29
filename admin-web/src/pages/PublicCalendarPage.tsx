import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Bell,
  BellRing,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileDown,
  Image as ImageIcon,
  Plus,
  Share2,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import type { CalendarMonth, CalendarProject, CalendarReminder, ReminderTag } from '../types/calendar';
import { getAllCalendars, getCalendar } from '../lib/calendarStorage';
import { CalendarSheet } from '../components/calendar/CalendarSheet';
import {
  deleteReminder,
  downloadIcsCalendarFile,
  getDueRemindersToday,
  getGoogleCalendarUrl,
  getRemindersForCalendar,
  requestNotificationPermission,
  saveReminder,
  toggleReminderComplete,
  triggerBrowserNotification,
} from '../lib/calendarReminders';
import {
  exportCalendarMonthAsImage,
  exportCalendarMonthAsPdf,
} from '../lib/calendarExport';

const TAG_STYLES: Record<ReminderTag, { bg: string; text: string; label: string }> = {
  important: { bg: 'bg-red-100 border-red-300', text: 'text-red-700', label: 'Important' },
  festival: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800', label: 'Festival' },
  personal: { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800', label: 'Personal' },
  meeting: { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-800', label: 'Meeting' },
  reminder: { bg: 'bg-purple-100 border-purple-300', text: 'text-purple-800', label: 'Reminder' },
};

export const PublicCalendarPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [calendars, setCalendars] = useState<CalendarProject[]>([]);
  const [activeCalendar, setActiveCalendar] = useState<CalendarProject | null>(null);
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Reminders State (Saved Locally on Device)
  const [reminders, setReminders] = useState<CalendarReminder[]>([]);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isReminderPanelOpen, setIsReminderPanelOpen] = useState(true);

  // Notification & Alarm Preferences (Option 1 & Option 2)
  const [notificationPermitted, setNotificationPermitted] = useState<boolean>(
    () => typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [dismissTodayAlert, setDismissTodayAlert] = useState(false);
  const [opt1Browser, setOpt1Browser] = useState(true); // Option 1: Browser Desktop/Mobile Push
  const [opt2GoogleCalendar, setOpt2GoogleCalendar] = useState(true); // Option 2: Phone Alarm via Google Calendar

  // New Reminder Form
  const [newDay, setNewDay] = useState<number>(1);
  const [newTime, setNewTime] = useState<string>('');
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState<ReminderTag>('personal');

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Load Calendars
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const list = await getAllCalendars();
        setCalendars(list);

        if (id) {
          const specific = await getCalendar(id);
          if (specific) {
            setActiveCalendar(specific);
          } else if (list.length > 0) {
            setActiveCalendar(list[0]);
          }
        } else if (list.length > 0) {
          setActiveCalendar(list[0]);
        }
      } catch (err) {
        console.error('Failed to load public calendar:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [id]);

  // Sync Month from URL query or default
  useEffect(() => {
    const qMonth = searchParams.get('month');
    if (qMonth !== null) {
      const idx = parseInt(qMonth, 10);
      if (!isNaN(idx) && idx >= 0 && idx < 12) {
        setActiveMonthIndex(idx);
      }
    }
  }, [searchParams]);

  // Load Device-Local Reminders
  useEffect(() => {
    if (!activeCalendar) return;
    const items = getRemindersForCalendar(activeCalendar.id);
    setReminders(items);
  }, [activeCalendar]);

  const refreshReminders = () => {
    if (!activeCalendar) return;
    setReminders(getRemindersForCalendar(activeCalendar.id));
  };

  const handleSelectMonth = (idx: number) => {
    setActiveMonthIndex(idx);
    setSearchParams({ month: idx.toString() });
  };

  const handlePrevMonth = () => {
    const nextIdx = (activeMonthIndex - 1 + 12) % 12;
    handleSelectMonth(nextIdx);
  };

  const handleNextMonth = () => {
    const nextIdx = (activeMonthIndex + 1) % 12;
    handleSelectMonth(nextIdx);
  };

  const handleEnableBrowserNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermitted(granted);
    if (granted) {
      triggerBrowserNotification(
        'NewsApp Calendar Alerts Enabled',
        'You will receive popup notifications on your device for scheduled calendar reminders.'
      );
    } else {
      alert('Notification permission was blocked or denied in your browser settings.');
    }
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCalendar || !newTitle.trim()) return;

    const reminder: CalendarReminder = {
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      calendarId: activeCalendar.id,
      year: activeCalendar.year || 2026,
      monthIndex: activeMonthIndex,
      day: Number(newDay) || 1,
      time: newTime.trim() || undefined,
      title: newTitle.trim(),
      note: newNote.trim() || undefined,
      tag: newTag,
      completed: false,
      createdAt: Date.now(),
      notifyBrowser: opt1Browser,
      notifyGoogleCalendar: opt2GoogleCalendar,
    };

    saveReminder(reminder);
    refreshReminders();

    // Option 2: Phone Alarm via Google Calendar Sync
    if (opt2GoogleCalendar) {
      window.open(getGoogleCalendarUrl(reminder), '_blank', 'noopener,noreferrer');
    }

    // Option 1: Browser Desktop & Mobile Push Notification
    if (opt1Browser) {
      if (notificationPermitted) {
        triggerBrowserNotification(
          `🔔 Reminder Set: ${reminder.title}`,
          `Scheduled for ${currentMonth?.monthName || 'Month'} ${reminder.day}${reminder.time ? ` at ${reminder.time}` : ''}`
        );
      } else {
        void requestNotificationPermission().then((granted) => {
          setNotificationPermitted(granted);
          if (granted) {
            triggerBrowserNotification(
              `🔔 Reminder Set: ${reminder.title}`,
              `Scheduled for ${currentMonth?.monthName || 'Month'} ${reminder.day}${reminder.time ? ` at ${reminder.time}` : ''}`
            );
          }
        });
      }
    }

    setNewTitle('');
    setNewNote('');
    setNewTime('');
    setIsReminderModalOpen(false);
  };

  const handleToggleComplete = (remId: string) => {
    toggleReminderComplete(remId);
    refreshReminders();
  };

  const handleDeleteReminder = (remId: string) => {
    deleteReminder(remId);
    refreshReminders();
  };

  const handleShareCalendar = () => {
    const url = window.location.href;
    void navigator.clipboard.writeText(url);
    alert(`Public calendar link copied to clipboard!\n${url}`);
  };

  const handleExportMonthPng = async () => {
    const el = document.getElementById('public-calendar-sheet-container');
    if (!el || !currentMonth) return;
    try {
      setIsExporting(true);
      await exportCalendarMonthAsImage(el, `${activeCalendar?.title || 'Calendar'}-${currentMonth.monthName}.png`);
    } catch (err) {
      console.error('Export PNG failed:', err);
      alert('Failed to export calendar image.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMonthPdf = async () => {
    const el = document.getElementById('public-calendar-sheet-container');
    if (!el || !currentMonth) return;
    try {
      setIsExporting(true);
      await exportCalendarMonthAsPdf(el, `${activeCalendar?.title || 'Calendar'}-${currentMonth.monthName}.pdf`);
    } catch (err) {
      console.error('Export PDF failed:', err);
      alert('Failed to export calendar PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const currentMonth: CalendarMonth | null = activeCalendar?.months[activeMonthIndex] || null;
  const monthReminders = reminders.filter((r) => r.monthIndex === activeMonthIndex);
  const todayDueReminders = getDueRemindersToday(reminders);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-stone-600">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-stone-800">Loading Calendar...</h2>
        <p className="text-xs text-stone-500">Preparing high-resolution calendar sheets</p>
      </div>
    );
  }

  if (!activeCalendar) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center">
        <CalendarDays size={48} className="text-stone-400 mb-3" />
        <h2 className="text-lg font-bold text-stone-800">Calendar Not Found</h2>
        <p className="text-xs text-stone-500 max-w-sm mb-4">
          The requested calendar could not be loaded or has not been published yet.
        </p>
        <a href="/" className="pub-btn pub-btn-primary text-xs">
          Return to Home
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-200/90 flex flex-col">
      {/* ========================================================
          PUBLIC TOP BAR
          ======================================================== */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-xs px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs font-bold shrink-0">
            <CalendarDays size={20} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-stone-900 m-0">
                {activeCalendar.title}
              </h1>
              <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                {activeCalendar.year || 2026}
              </span>
            </div>
            <span className="text-[11px] text-stone-500 hidden sm:block">
              Public 12-Month Calendar with device-local reminder notes
            </span>
          </div>
        </div>

        {/* Calendar Switcher (if multiple available) & Actions */}
        <div className="flex items-center gap-2">
          {calendars.length > 1 && (
            <select
              value={activeCalendar.id}
              onChange={(e) => {
                const found = calendars.find((c) => c.id === e.target.value);
                if (found) setActiveCalendar(found);
              }}
              className="text-xs bg-stone-100 border border-stone-300 rounded-lg px-2.5 py-1.5 font-semibold text-stone-700 hidden md:block"
            >
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="pub-btn pub-btn-secondary text-xs"
            onClick={handleShareCalendar}
            title="Share Public Link"
          >
            <Share2 size={14} /> <span className="hidden sm:inline">Share</span>
          </button>

          <button
            type="button"
            className="pub-btn pub-btn-secondary text-xs"
            onClick={handleExportMonthPng}
            disabled={isExporting}
            title="Download this month as image"
          >
            <ImageIcon size={14} /> <span className="hidden sm:inline">Image</span>
          </button>

          <button
            type="button"
            className="pub-btn pub-btn-secondary text-xs"
            onClick={handleExportMonthPdf}
            disabled={isExporting}
            title="Download this month as PDF"
          >
            <FileDown size={14} /> <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            type="button"
            className={`pub-btn text-xs ${
              isReminderPanelOpen ? 'pub-btn-primary' : 'pub-btn-secondary'
            }`}
            onClick={() => setIsReminderPanelOpen((prev) => !prev)}
            title="Toggle Reminders Panel"
          >
            <Bell size={14} />
            <span className="hidden sm:inline">Reminders</span>
            {monthReminders.length > 0 && (
              <span className="bg-white/30 text-white px-1.5 py-0.2 rounded-full font-bold text-[10px]">
                {monthReminders.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ========================================================
          TODAY'S DUE REMINDERS ALERT BANNER
          ======================================================== */}
      {todayDueReminders.length > 0 && !dismissTodayAlert && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between text-xs shadow-md z-30 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <BellRing size={16} className="text-yellow-300 animate-bounce shrink-0" />
            <span className="font-extrabold tracking-wide uppercase text-[10px] bg-red-800 px-2 py-0.5 rounded text-white shrink-0">
              Today's Alert
            </span>
            <span
              className="font-medium underline cursor-pointer truncate hover:text-red-100"
              onClick={() => setIsReminderPanelOpen(true)}
            >
              {todayDueReminders.map((r) => `${r.title} (Day ${r.day})`).join(' • ')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDismissTodayAlert(true)}
            className="p-1 hover:bg-red-700 rounded text-red-200 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
            title="Dismiss banner"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ========================================================
          MONTH SELECTOR TABS (12 MONTHS)
          ======================================================== */}
      <nav className="bg-white border-b border-stone-200 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0 shadow-2xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {activeCalendar.months.map((month, idx) => {
              const isActive = activeMonthIndex === idx;
              const count = reminders.filter((r) => r.monthIndex === idx).length;

              return (
                <button
                  key={month.id}
                  type="button"
                  onClick={() => handleSelectMonth(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <span>{month.monthName}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isActive ? 'bg-white/30 text-white' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors"
            title="Next Month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <button
          type="button"
          className="pub-btn pub-btn-primary text-xs shrink-0"
          onClick={() => {
            setNewDay(1);
            setIsReminderModalOpen(true);
          }}
        >
          <Plus size={14} /> Add Reminder Note
        </button>
      </nav>

      {/* ========================================================
          PAGE BODY: CENTER CALENDAR SHEET + SIDE REMINDER PANEL
          ======================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Calendar View Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center justify-start">
          {currentMonth ? (
            <div
              id="public-calendar-sheet-container"
              className="relative shadow-2xl rounded-sm transition-transform duration-100 mb-12"
            >
              <CalendarSheet
                month={currentMonth}
                scale={0.95}
                interactive={false}
              />
            </div>
          ) : (
            <div className="text-stone-400 text-sm mt-12">No month data available.</div>
          )}
        </div>

        {/* Right Side: Device-Local Reminders & Notes Panel */}
        {isReminderPanelOpen && (
          <aside className="w-80 md:w-96 bg-white border-l border-stone-200 flex flex-col shrink-0 shadow-lg z-30 h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-1.5">
                  <Bell size={15} className="text-red-600" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-stone-800 m-0">
                    {currentMonth?.monthName} Reminders
                  </h2>
                </div>
                <span className="text-[11px] text-stone-500 block mt-0.5">
                  🔒 Saved locally on your device
                </span>
              </div>
              <button
                type="button"
                className="pub-btn pub-btn-primary text-xs"
                onClick={() => {
                  setNewDay(1);
                  setIsReminderModalOpen(true);
                }}
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {/* Browser Push / Device Notification Status Box */}
            <div className="p-3 bg-stone-50 border-b border-stone-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-stone-700">
                  <Bell size={13} className={notificationPermitted ? 'text-emerald-600' : 'text-amber-600'} />
                  <span>Device Popups</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    notificationPermitted ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {notificationPermitted ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1 mb-2 leading-tight">
                Receive browser alerts on your screen when reminders are due.
              </p>
              {!notificationPermitted ? (
                <button
                  type="button"
                  onClick={handleEnableBrowserNotifications}
                  className="w-full py-1 text-center text-xs font-bold bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-stone-800 shadow-2xs transition-colors cursor-pointer"
                >
                  🔔 Enable Browser Notifications
                </button>
              ) : (
                <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                  <Check size={12} /> Active for this browser session
                </div>
              )}
            </div>

            {/* List of Reminders */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0 pb-16">
              {monthReminders.length === 0 ? (
                <div className="py-12 text-center text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200 p-6">
                  <Bell size={32} className="mx-auto mb-2 opacity-40 text-stone-500" />
                  <h3 className="text-xs font-bold text-stone-700 m-0">No Reminders for {currentMonth?.monthName}</h3>
                  <p className="text-[11px] text-stone-500 mt-1 mb-3">
                    Add doctor appointments, festivals, birthdays, or bill dues!
                  </p>
                  <button
                    type="button"
                    className="pub-btn pub-btn-secondary text-xs inline-flex items-center gap-1"
                    onClick={() => {
                      setNewDay(1);
                      setIsReminderModalOpen(true);
                    }}
                  >
                    <Plus size={13} /> Add Note for this Month
                  </button>
                </div>
              ) : (
                monthReminders.map((rem) => {
                  const tagStyle = TAG_STYLES[rem.tag] || TAG_STYLES.personal;

                  return (
                    <div
                      key={rem.id}
                      className={`p-3 rounded-xl border transition-all ${
                        rem.completed
                          ? 'bg-stone-50 border-stone-200 opacity-60'
                          : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(rem.id)}
                            className={`w-5 h-5 rounded flex items-center justify-center border mt-0.5 transition-colors cursor-pointer ${
                              rem.completed
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-stone-300 hover:border-emerald-500 bg-white'
                            }`}
                            title={rem.completed ? 'Mark pending' : 'Mark completed'}
                          >
                            {rem.completed && <Check size={13} />}
                          </button>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-xs text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded font-mono">
                                Day {rem.day}
                              </span>
                              {rem.time && (
                                <span className="font-bold text-[10px] text-stone-700 bg-stone-100 border border-stone-200 px-1.5 py-0.2 rounded font-mono">
                                  ⏰ {rem.time}
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${tagStyle.bg} ${tagStyle.text}`}
                              >
                                {tagStyle.label}
                              </span>
                            </div>

                            <h4
                              className={`text-xs font-bold text-stone-900 mt-1 mb-0.5 ${
                                rem.completed ? 'line-through text-stone-500' : ''
                              }`}
                            >
                              {rem.title}
                            </h4>

                            {rem.note && (
                              <p className="text-[11px] text-stone-600 m-0 mt-0.5 whitespace-pre-wrap">
                                {rem.note}
                              </p>
                            )}

                            {/* Direct Alarm / Notification Sync Actions: Option 1 & Option 2 */}
                            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-stone-100 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  if (notificationPermitted) {
                                    triggerBrowserNotification(
                                      `🔔 ${rem.title}`,
                                      `Day ${rem.day}${rem.time ? ` at ${rem.time}` : ''} - ${rem.note || 'Scheduled reminder'}`
                                    );
                                  } else {
                                    void handleEnableBrowserNotifications();
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                                title="Option 1: Test or trigger browser push alert"
                              >
                                <BellRing size={10} /> Opt 1: Browser Alert
                              </button>

                              <a
                                href={getGoogleCalendarUrl(rem)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold transition-colors"
                                title="Option 2: Open and sync with phone Google Calendar alarm"
                              >
                                <ExternalLink size={10} /> Opt 2: Google Alarm
                              </a>

                              <button
                                type="button"
                                onClick={() => downloadIcsCalendarFile(rem)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded text-[10px] font-medium transition-colors cursor-pointer"
                                title="Download phone alarm calendar file (.ics) for Apple/Android"
                              >
                                <Smartphone size={10} /> .ics
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteReminder(rem.id)}
                          className="text-stone-400 hover:text-red-600 p-1 transition-colors"
                          title="Delete note"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ========================================================
          ADD REMINDER NOTE MODAL
          ======================================================== */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-red-600" />
                <h3 className="text-sm font-bold text-stone-800 m-0">
                  Add Reminder Note for {currentMonth?.monthName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReminderModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-stone-200 flex items-center justify-center text-stone-500"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="p-5 space-y-3.5">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Day
                  </label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(Number(e.target.value))}
                    className="pub-input text-xs w-full"
                    required
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Day {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="pub-input text-xs w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Category Tag
                  </label>
                  <select
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value as ReminderTag)}
                    className="pub-input text-xs w-full"
                  >
                    <option value="important">🔴 Important</option>
                    <option value="festival">🟣 Festival</option>
                    <option value="personal">🟢 Personal</option>
                    <option value="meeting">🔵 Meeting</option>
                    <option value="reminder">🟡 General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Reminder Title / Event
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Electricity bill due / Puja / Doctor visit"
                  className="pub-input text-xs w-full"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Description / Note (Optional)
                </label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Any details, contact phone, or items to remember..."
                  rows={2}
                  className="pub-input text-xs w-full resize-none"
                />
              </div>

              {/* Notification & Alarm Options: Option 1 & Option 2 */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <BellRing size={14} className="text-red-600" />
                    <span>How do you want to be notified?</span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">Select 1 or both</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Browser Desktop / Mobile Push Notification */}
                  <div
                    onClick={async () => {
                      if (!opt1Browser && !notificationPermitted) {
                        const granted = await requestNotificationPermission();
                        setNotificationPermitted(granted);
                      }
                      setOpt1Browser((prev) => !prev);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      opt1Browser
                        ? 'bg-red-50/80 border-red-300 ring-2 ring-red-500/20 shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-red-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                          1
                        </span>
                        <span className="text-xs font-bold text-stone-900">
                          Browser Push Alert
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={opt1Browser}
                        onChange={() => {}}
                        className="rounded accent-red-600 text-red-600 mt-0.5 pointer-events-none"
                      />
                    </div>
                    <p className="text-[11px] text-stone-600 mt-1.5 leading-snug">
                      Desktop or mobile browser pop-up alert on this screen when due.
                    </p>
                    {opt1Browser && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.2 rounded mt-2">
                        ✓ Enabled
                      </span>
                    )}
                  </div>

                  {/* Option 2: Phone Alarm via Google Calendar Sync */}
                  <div
                    onClick={() => setOpt2GoogleCalendar((prev) => !prev)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      opt2GoogleCalendar
                        ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                          2
                        </span>
                        <span className="text-xs font-bold text-stone-900">
                          Google Calendar Alarm
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={opt2GoogleCalendar}
                        onChange={() => {}}
                        className="rounded accent-blue-600 text-blue-600 mt-0.5 pointer-events-none"
                      />
                    </div>
                    <p className="text-[11px] text-stone-600 mt-1.5 leading-snug">
                      Syncs to your Android / iPhone so your phone rings an audible alarm.
                    </p>
                    {opt2GoogleCalendar && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded mt-2">
                        ✓ Syncs on Save
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                <span>🔒</span>
                <span>This note will be saved privately in your device browser storage.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  className="pub-btn pub-btn-secondary text-xs"
                  onClick={() => setIsReminderModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="pub-btn pub-btn-primary text-xs">
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
