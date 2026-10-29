import React from 'react';
import {
  CalendarDays,
  Copy,
  ExternalLink,
  Plus,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import type { CalendarProject } from '../../types/calendar';

interface CalendarListModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendars: CalendarProject[];
  activeCalendarId: string | null;
  onSelectCalendar: (calendar: CalendarProject) => void;
  onCreateNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const CalendarListModal: React.FC<CalendarListModalProps> = ({
  isOpen,
  onClose,
  calendars,
  activeCalendarId,
  onSelectCalendar,
  onCreateNew,
  onDuplicate,
  onDelete,
}) => {
  if (!isOpen) return null;

  const handleCopyPublicLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/calendar/${id}`;
    void navigator.clipboard.writeText(url);
    alert(`Public calendar link copied to clipboard:\n${url}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm">
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 m-0">Saved Calendar Projects</h2>
              <p className="text-xs text-stone-500 m-0">
                Switch between your previously created calendars or share them publicly.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-6 py-3 bg-white border-b border-stone-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-600">
            {calendars.length} {calendars.length === 1 ? 'Calendar' : 'Calendars'} Available
          </span>
          <button
            type="button"
            className="pub-btn pub-btn-primary text-xs"
            onClick={() => {
              onCreateNew();
              onClose();
            }}
          >
            <Plus size={14} /> Create New Calendar
          </button>
        </div>

        {/* List of Calendars */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {calendars.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <CalendarDays size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No calendars found. Create your first calendar project!</p>
            </div>
          ) : (
            calendars.map((cal) => {
              const isActive = cal.id === activeCalendarId;
              const monthsWithBg = cal.months.filter((m) => Boolean(m.backgroundImageUrl)).length;
              const totalAds = cal.months.reduce((acc, m) => acc + m.ads.length, 0);

              return (
                <div
                  key={cal.id}
                  onClick={() => {
                    onSelectCalendar(cal);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-red-50/50 border-red-500 shadow-xs ring-1 ring-red-500'
                      : 'bg-white border-stone-200 hover:border-stone-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0 font-bold ${
                        isActive
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-stone-100 text-stone-700 border border-stone-200'
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider opacity-80">Year</span>
                      <span className="text-sm leading-tight">{cal.year || 2026}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-stone-900 truncate m-0">
                          {cal.title}
                        </h3>
                        {isActive && (
                          <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-200 shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                        <span>🗓️ {monthsWithBg}/12 Months Uploaded</span>
                        <span>•</span>
                        <span>🏷️ {totalAds} Ads Placed</span>
                        <span>•</span>
                        <span>{new Date(cal.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="pub-thumb-btn"
                      title="Copy Public Link"
                      onClick={(e) => handleCopyPublicLink(cal.id, e)}
                    >
                      <Share2 size={15} />
                    </button>
                    <a
                      href={`/calendar/${cal.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pub-thumb-btn"
                      title="Open Public Viewer"
                    >
                      <ExternalLink size={15} />
                    </a>
                    <button
                      type="button"
                      className="pub-thumb-btn"
                      title="Duplicate Calendar"
                      onClick={() => onDuplicate(cal.id)}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      type="button"
                      className="pub-thumb-btn danger"
                      title="Delete Calendar"
                      onClick={() => onDelete(cal.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button type="button" className="pub-btn pub-btn-secondary text-xs" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
