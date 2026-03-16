import { useState, useEffect, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Asset, CalendarEvent } from '@/types';
import { X, BookOpen, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrencyAmount, parseDbDate, parseNumericAmount } from '@/lib/utils';
import { DayContentProps } from 'react-day-picker';
import { resolveAssetColor } from '@/lib/assetColors';

interface CalendarViewProps {
  assets: Asset[];
  onClose: () => void;
}

export function CalendarView({ assets, onClose }: CalendarViewProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const assetIds = useMemo(() => assets.map((asset) => asset.id), [assets]);
  const assetColors = useMemo(
    () => new Map(assets.map((asset) => [asset.id, resolveAssetColor(asset)])),
    [assets]
  );

  // Load calendar events and reminders as calendar events
  useEffect(() => {
    async function loadEvents() {
      if (!user) {
        setEvents([]);
        setLoading(false);
        return;
      }

      if (assetIds.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Load asset activity entries stored in calendar_events
        const [
          { data: entries, error: entriesError },
          { data: reminders, error: remindersError },
        ] = await Promise.all([
          supabase
            .from('calendar_events')
            .select('*')
            .in('asset_id', assetIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('reminders')
            .select('*')
            .in('asset_id', assetIds)
            .order('reminder_at', { ascending: true }),
        ]);

        if (entriesError) {
          console.error('Error loading entries:', entriesError);
        }

        if (remindersError) {
          console.error('Error loading reminders:', remindersError);
        }

        const entryRows = (entries as Record<string, unknown>[] | null) ?? [];
        const entryIds = entryRows
          .map((entry) => (entry.event_id ?? entry.id) as string | undefined)
          .filter((entryId): entryId is string => Boolean(entryId));
        const expenseCostByEventId = new Map<string, number>();

        if (entryIds.length > 0) {
          const { data: expenseRows, error: expensesError } = await supabase
            .from('calendar_event_expenses')
            .select('event_id, cost')
            .in('event_id', entryIds);

          if (expensesError) {
            console.error('Error loading entry expenses:', expensesError);
          } else {
            ((expenseRows as Record<string, unknown>[] | null) ?? []).forEach((expense) => {
              const eventId = expense.event_id as string | undefined;
              const cost = parseNumericAmount(expense.cost);

              if (eventId && cost !== null) {
                expenseCostByEventId.set(eventId, cost);
              }
            });
          }
        }

        const calendarEvents: CalendarEvent[] = [];

        // Convert calendar_events rows to entry events
        if (entryRows.length > 0) {
          entryRows.forEach((entry) => {
            const entryId = (entry.event_id ?? entry.id) as string;
            const assetId = entry.asset_id as string;
            const content = (entry.tags ?? entry.content ?? '') as string;
            const assetColor = assetColors.get(assetId) ?? 'hsl(var(--primary))';
            calendarEvents.push({
              id: entryId,
              title: String(content).slice(0, 50) + (String(content).length > 50 ? '...' : ''),
              date: new Date((entry.created_at as string) ?? ''),
              type: 'entry',
              assetId,
              color: assetColor,
              cost: expenseCostByEventId.get(entryId) ?? null,
            });
          });
        }

        // Convert reminders to events (map reminder_id -> id, reminder_at -> date, description -> title)
        if (reminders) {
          reminders.forEach((reminder: Record<string, unknown>) => {
            const id = (reminder.reminder_id ?? reminder.id) as string;
            const title = (reminder.description ?? reminder.title ?? 'Reminder') as string;
            const dateStr = (reminder.reminder_at ?? reminder.due_date) as string;
            const assetId = reminder.asset_id as string | undefined;
            const assetColor = assetId ? assetColors.get(assetId) : undefined;
            calendarEvents.push({
              id,
              title: String(title).slice(0, 100),
              date: parseDbDate(dateStr),
              type: 'reminder',
              assetId,
              color: assetColor ?? 'hsl(var(--muted-foreground))',
            });
          });
        }

        setEvents(calendarEvents);
      } catch (error) {
        console.error('Error loading calendar events:', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [user, assetIds, assetColors]);

  const selectedDateEvents = events.filter(
    (event) =>
      selectedDate &&
      event.date.toDateString() === selectedDate.toDateString()
  );

  const eventMetaByDate = useMemo(() => {
    const meta = new Map<string, string[]>();

    events.forEach((event) => {
      const key = event.date.toDateString();
      const colors = meta.get(key) ?? [];

      if (!colors.includes(event.color)) {
        colors.push(event.color);
      }

      meta.set(key, colors);
    });

    return meta;
  }, [events]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-soft max-w-lg w-full max-h-[90vh] overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Ημερολόγιο Αγροκτήματος</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-lg"
            modifiers={{
              hasEvent: (date) => eventMetaByDate.has(date.toDateString()),
            }}
            modifiersStyles={{
              hasEvent: {
                fontWeight: 600,
              },
            }}
            components={{
              DayContent: ({ date }: DayContentProps) => {
                const dayColors = eventMetaByDate.get(date.toDateString()) ?? [];

                return (
                  <div className="relative flex h-full w-full flex-col items-center justify-center">
                    <span>{date.getDate()}</span>
                    {dayColors.length > 0 && (
                      <span className="pointer-events-none absolute bottom-1 flex items-center gap-0.5">
                        {dayColors.slice(0, 3).map((color) => (
                          <span
                            key={color}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        {dayColors.length > 3 && (
                          <span className="text-[8px] leading-none text-muted-foreground">+</span>
                        )}
                      </span>
                    )}
                  </div>
                );
              },
            }}
          />
        </div>

        {/* Legend */}
        <div className="px-4 pb-2 flex gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            <span>Καταχώρηση</span>
          </div>
          <div className="flex items-center gap-1">
            <Bell className="w-3 h-3" />
            <span>Υπενθύμιση</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="flex gap-0.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>Χρώματα στοιχείων</span>
          </div>
        </div>

        <div className="p-4 border-t border-border max-h-60 overflow-y-auto">
          <h3 className="text-sm font-medium mb-2">
            {selectedDate?.toLocaleDateString('el-GR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          
          {loading ? (
            <p className="text-sm text-muted-foreground">Φόρτωση...</p>
          ) : selectedDateEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Δεν υπάρχουν γεγονότα για αυτή την ημέρα</p>
          ) : (
            <div className="space-y-2">
              {selectedDateEvents.map((event) => {
                const asset = assets.find((a) => a.id === event.assetId);
                const assetColor = asset ? resolveAssetColor(asset) : event.color;
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 rounded-lg bg-muted/50 p-2"
                    style={{ boxShadow: `inset 3px 0 0 ${assetColor}` }}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: assetColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {event.type === 'entry' ? (
                          <BookOpen className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <Bell className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {event.type === 'entry' ? 'Καταχώρηση' : 'Υπενθύμιση'}
                        </span>
                      </div>
                      <div className="text-sm font-medium">{event.title}</div>
                      {asset && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: assetColor }}
                          />
                          <span>{asset.icon} {asset.name}</span>
                        </div>
                      )}
                      {event.type === 'entry' && event.cost != null && (
                        <div className="mt-1 text-xs font-medium text-foreground">
                          Κόστος: {formatCurrencyAmount(event.cost)}
                        </div>
                      )}
                      {(event.date.getHours() !== 0 || event.date.getMinutes() !== 0) && (
                        <div className="text-xs text-muted-foreground">
                          {event.date.toLocaleTimeString('el-GR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
