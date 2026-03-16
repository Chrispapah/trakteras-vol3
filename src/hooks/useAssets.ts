import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Asset, AssetCreateInput, AssetDetailsData, AssetMessage, DiaryEntry, Reminder } from '@/types';
import { parseDbDate, parseNumericAmount } from '@/lib/utils';
import { resolveAssetColor } from '@/lib/assetColors';

const typeIcons: Record<string, string> = {
  field: '🌾',
  tractor: '🚜',
  machine: '⚙️',
};
const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const SUPABASE_URL = viteEnv?.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = viteEnv?.VITE_SUPABASE_PUBLISHABLE_KEY;
const db: Pick<typeof supabase, 'from'> = supabase;

function trimToUndefined(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseYear(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function yearToDate(value: string | null | undefined) {
  const year = parseYear(value);
  return year ? `${year}-01-01` : null;
}

function formatFieldNotes(description?: string, information?: string) {
  const sections = [
    description ? `Περιγραφή: ${description}` : null,
    information ? `Πληροφορίες: ${information}` : null,
  ].filter(Boolean);

  return sections.length > 0 ? sections.join('\n\n') : null;
}

function parseFieldNotes(notes: string | null | undefined) {
  if (!notes) return {};

  const descriptionMatch = notes.match(/Περιγραφή:\s*([\s\S]*?)(?:\n\nΠληροφορίες:|$)/);
  const informationMatch = notes.match(/Πληροφορίες:\s*([\s\S]*)$/);

  if (descriptionMatch || informationMatch) {
    return {
      description: trimToUndefined(descriptionMatch?.[1]),
      information: trimToUndefined(informationMatch?.[1]),
    };
  }

  return {
    information: trimToUndefined(notes),
  };
}

function getAssetDetails(
  type: Asset['type'],
  assetId: string,
  fieldRows: Map<string, Record<string, unknown>>,
  tractorRows: Map<string, Record<string, unknown>>,
  machineRows: Map<string, Record<string, unknown>>
): AssetDetailsData | undefined {
  if (type === 'field') {
    const row = fieldRows.get(assetId);
    if (!row) return undefined;
    const parsedNotes = parseFieldNotes(row.notes as string | null | undefined);
    return {
      description: parsedNotes.description,
      location: trimToUndefined(row.location as string | null | undefined),
      area: trimToUndefined(row.area as string | null | undefined),
      cropType: trimToUndefined(row.crop_type as string | null | undefined),
      plantingDate: trimToUndefined(row.planting_date as string | null | undefined),
      information: parsedNotes.information,
    };
  }

  if (type === 'tractor') {
    const row = tractorRows.get(assetId);
    if (!row) return undefined;
    return {
      brand: trimToUndefined(row.brand as string | null | undefined),
      model: trimToUndefined(row.model as string | null | undefined),
      year: row.year != null ? String(row.year) : undefined,
      information: trimToUndefined(row.type_of_tractor as string | null | undefined),
      vin: trimToUndefined(row.vin as string | null | undefined),
      nextService: trimToUndefined(row.next_service as string | null | undefined),
      notifications: typeof row.notifications === 'boolean' ? row.notifications : undefined,
    };
  }

  const row = machineRows.get(assetId);
  if (!row) return undefined;
  const machineDate = trimToUndefined(row.date as string | null | undefined);
  return {
    brand: trimToUndefined(row.brand as string | null | undefined),
    model: trimToUndefined(row.model as string | null | undefined),
    year: machineDate ? machineDate.slice(0, 4) : undefined,
    information: trimToUndefined(row.type as string | null | undefined),
  };
}

function buildAssetSummary(type: Asset['type'], details?: AssetDetailsData) {
  if (!details) return undefined;

  if (type === 'field') {
    const fallbackSummary = [details.location, details.area, details.cropType].filter(Boolean).join(' • ');
    return (details.description ?? fallbackSummary) || details.information;
  }

  return [details.brand, details.model, details.year].filter(Boolean).join(' • ') || details.information;
}

function extractTagsFromContent(content: string): string[] {
  const tagRegex = /#(\w+)/g;
  const matches = content.match(tagRegex);
  return matches ? matches.map((tag) => tag.slice(1)) : [];
}

function buildExpenseCostByEventId(rows: Record<string, unknown>[]) {
  return rows.reduce((costByEventId, row) => {
    const eventId = row.event_id as string | undefined;
    const cost = parseNumericAmount(row.cost);

    if (eventId && cost !== null) {
      costByEventId.set(eventId, cost);
    }

    return costByEventId;
  }, new Map<string, number>());
}

function mapCalendarEventToDiaryEntry(
  row: Record<string, unknown>,
  expenseCostByEventId = new Map<string, number>()
): DiaryEntry {
  const content = (row.tags as string) ?? '';
  const eventId = (row.event_id as string) ?? (row.id as string);

  return {
    id: eventId,
    asset_id: (row.asset_id as string) ?? '',
    content,
    tags: extractTagsFromContent(content),
    cost: expenseCostByEventId.get(eventId) ?? null,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
  };
}

export function useAssets() {
  const { user, isAuthenticated } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || null;
  const currentSelectedAssetIdRef = useRef<string | null>(null);
  currentSelectedAssetIdRef.current = selectedAssetId;

  // Load assets from database (schema: asset_id, asset_type, name, created_at, uuid)
  const loadAssets = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await db
        .from('assets')
        .select('*')
        .eq('uuid', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading assets:', error);
        return;
      }

      const rows = data || [];
      const assetIds = rows.map((row: Record<string, unknown>) => ((row.asset_id as string) ?? (row.id as string))).filter(Boolean);

      const [fieldsResult, tractorsResult, machineryResult] = assetIds.length > 0
        ? await Promise.all([
            db.from('Fields').select('*').in('asset_id', assetIds),
            db.from('Tractors').select('*').in('asset_id', assetIds),
            db.from('Machinery').select('*').in('asset_id', assetIds),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
          ];

      if (fieldsResult.error) {
        console.error('Error loading field assets:', fieldsResult.error);
      }
      if (tractorsResult.error) {
        console.error('Error loading tractor assets:', tractorsResult.error);
      }
      if (machineryResult.error) {
        console.error('Error loading machinery assets:', machineryResult.error);
      }

      const fieldRows = new Map(
        ((fieldsResult.data as Record<string, unknown>[] | null) ?? []).map((row) => [row.asset_id as string, row])
      );
      const tractorRows = new Map(
        ((tractorsResult.data as Record<string, unknown>[] | null) ?? []).map((row) => [row.asset_id as string, row])
      );
      const machineRows = new Map(
        ((machineryResult.data as Record<string, unknown>[] | null) ?? []).map((row) => [row.asset_id as string, row])
      );

      const mapped: Asset[] = rows.map((row: Record<string, unknown>) => {
        const assetId = (row.asset_id as string) ?? (row.id as string);
        const rawType = (row.asset_type as string) ?? (row.type as string) ?? 'field';
        const type: Asset['type'] = rawType === 'tractor' || rawType === 'machine' ? rawType : 'field';
        const details = getAssetDetails(type, assetId, fieldRows, tractorRows, machineRows);
        return {
          id: assetId,
          name: (row.name as string) ?? '',
          type,
          icon: (row.icon as string) ?? typeIcons[type] ?? '🌱',
          color: (row.color as string) ?? undefined,
          description: buildAssetSummary(type, details) ?? (row.description as string) ?? undefined,
          details,
          created_at: (row.created_at as string) ?? '',
          updated_at: (row.updated_at as string) ?? (row.created_at as string),
        };
      });
      setAssets(mapped);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const addAsset = useCallback(async (asset: AssetCreateInput) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await db
        .from('assets')
        .insert({
          name: asset.name.trim(),
          asset_type: asset.type,
          color: asset.color,
          uuid: user.id,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Error adding asset:', error);
        return null;
      }

      const row = data as Record<string, unknown>;
      const assetId = (row.asset_id as string) ?? (row.id as string);
      let details: AssetDetailsData | undefined;

      if (asset.type === 'field') {
        details = {
          description: asset.description,
          location: asset.location,
          area: asset.area,
          cropType: asset.cropType,
          information: asset.information,
        };
        const { error: fieldError } = await db.from('Fields').insert({
          asset_id: assetId,
          name: asset.name.trim(),
          area: asset.area ?? null,
          location: asset.location ?? null,
          crop_type: asset.cropType ?? null,
          notes: formatFieldNotes(asset.description, asset.information),
        });

        if (fieldError) {
          console.error('Error adding field asset details:', fieldError);
          await db.from('assets').delete().eq('asset_id', assetId);
          return null;
        }
      }

      if (asset.type === 'tractor') {
        details = {
          brand: asset.brand,
          model: asset.model,
          year: asset.year,
          information: asset.information,
        };
        const { error: tractorError } = await db.from('Tractors').insert({
          asset_id: assetId,
          name: asset.name.trim(),
          brand: asset.brand ?? null,
          model: asset.model ?? null,
          year: parseYear(asset.year),
          type_of_tractor: asset.information ?? null,
        });

        if (tractorError) {
          console.error('Error adding tractor asset details:', tractorError);
          await db.from('assets').delete().eq('asset_id', assetId);
          return null;
        }
      }

      if (asset.type === 'machine') {
        details = {
          brand: asset.brand,
          model: asset.model,
          year: asset.year,
          information: asset.information,
        };
        const { error: machineError } = await db.from('Machinery').insert({
          asset_id: assetId,
          name: asset.name.trim(),
          brand: asset.brand ?? null,
          model: asset.model ?? null,
          date: yearToDate(asset.year),
          type: asset.information ?? null,
        });

        if (machineError) {
          console.error('Error adding machinery asset details:', machineError);
          await db.from('assets').delete().eq('asset_id', assetId);
          return null;
        }
      }

      if (row.asset_id != null || row.id != null) {
        const newAsset: Asset = {
          id: assetId,
          name: (row.name as string) ?? asset.name,
          type: ((row.asset_type as string) ?? asset.type) as Asset['type'],
          icon: asset.icon ?? typeIcons[asset.type] ?? '🌱',
          color: (row.color as string) ?? asset.color,
          description: buildAssetSummary(asset.type, details) ?? (row.description as string) ?? undefined,
          details,
          created_at: (row.created_at as string) ?? new Date().toISOString(),
          updated_at: (row.updated_at as string) ?? (row.created_at as string),
        };
        setAssets((prev) => [newAsset, ...prev]);
        return newAsset;
      }

      loadAssets();
      return null;
    } catch (error) {
      console.error('Error adding asset:', error);
      return null;
    }
  }, [user, loadAssets]);

  const updateAsset = useCallback(async (id: string, updates: Partial<Asset>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.type !== undefined) dbUpdates.asset_type = updates.type;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      const { error } = await db
        .from('assets')
        .update(dbUpdates)
        .eq('asset_id', id);

      if (error) {
        console.error('Error updating asset:', error);
        return false;
      }

      setAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
      return true;
    } catch (error) {
      console.error('Error updating asset:', error);
      return false;
    }
  }, []);

  const deleteAsset = useCallback(async (id: string) => {
    try {
      const { data: relatedEvents, error: relatedEventsError } = await db
        .from('calendar_events')
        .select('event_id')
        .eq('asset_id', id);

      if (relatedEventsError) {
        console.error('Error loading related calendar events before asset delete:', relatedEventsError);
        return false;
      }

      const relatedEventIds = ((relatedEvents as { event_id?: string | null }[] | null) ?? [])
        .map((event) => event.event_id)
        .filter((eventId): eventId is string => Boolean(eventId));

      if (relatedEventIds.length > 0) {
        const { error: expensesError } = await db
          .from('calendar_event_expenses')
          .delete()
          .in('event_id', relatedEventIds);

        if (expensesError) {
          console.error('Error deleting calendar event expenses:', expensesError);
          return false;
        }
      }

      const childDeleteResults = await Promise.all([
        db.from('Fields').delete().eq('asset_id', id),
        db.from('Tractors').delete().eq('asset_id', id),
        db.from('Machinery').delete().eq('asset_id', id),
        db.from('messages').delete().eq('asset_id', id),
        db.from('reminders').delete().eq('asset_id', id),
        db.from('calendar_events').delete().eq('asset_id', id),
      ]);

      const childDeleteError = childDeleteResults.find((result) => result.error)?.error;
      if (childDeleteError) {
        console.error('Error deleting asset dependencies:', childDeleteError);
        return false;
      }

      const { error } = await db
        .from('assets')
        .delete()
        .eq('asset_id', id);

      if (error) {
        console.error('Error deleting asset:', error);
        return false;
      }

      setAssets((prev) => prev.filter((a) => a.id !== id));
      setEntries((prev) => prev.filter((entry) => entry.asset_id !== id));
      setReminders((prev) => prev.filter((reminder) => reminder.asset_id !== id));
      setAssetMessagesByAssetId((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      localStorage.removeItem(`asset_session_${id}`);
      if (selectedAssetId === id) {
        setSelectedAssetId(null);
      }
      return true;
    } catch (error) {
      console.error('Error deleting asset:', error);
      return false;
    }
  }, [selectedAssetId]);

  // Asset activity entries stored in calendar_events
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  const loadEntries = useCallback(async (assetId: string) => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading entries:', error);
        return;
      }

      const entryRows = (data as Record<string, unknown>[] | null) ?? [];
      const eventIds = entryRows
        .map((entry) => entry.event_id as string | undefined)
        .filter((eventId): eventId is string => Boolean(eventId));
      let expenseCostByEventId = new Map<string, number>();

      if (eventIds.length > 0) {
        const { data: expenseRows, error: expenseError } = await db
          .from('calendar_event_expenses')
          .select('event_id, cost')
          .in('event_id', eventIds);

        if (expenseError) {
          console.error('Error loading entry expenses:', expenseError);
        } else {
          expenseCostByEventId = buildExpenseCostByEventId(
            (expenseRows as Record<string, unknown>[] | null) ?? []
          );
        }
      }

      const mappedEntries: DiaryEntry[] = entryRows.map((entry) =>
        mapCalendarEventToDiaryEntry(entry, expenseCostByEventId)
      );

      setEntries(mappedEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  }, []);

  const addEntry = useCallback(async (assetId: string, entry: { content: string; tags?: string[] }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          asset_id: assetId,
          tags: entry.content,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding entry:', error);
        return null;
      }

      const newEntry = mapCalendarEventToDiaryEntry(data as Record<string, unknown>);

      setEntries((prev) => [newEntry, ...prev]);
      return newEntry;
    } catch (error) {
      console.error('Error adding entry:', error);
      return null;
    }
  }, [user]);

  const updateEntry = useCallback(async (entryId: string, updates: { content: string; tags: string[] }) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          tags: updates.content,
        })
        .eq('event_id', entryId);

      if (error) {
        console.error('Error updating entry:', error);
        return false;
      }

      setEntries((prev) =>
        prev.map((e) => (
          e.id === entryId
            ? { ...e, content: updates.content, tags: extractTagsFromContent(updates.content) }
            : e
        ))
      );
      return true;
    } catch (error) {
      console.error('Error updating entry:', error);
      return false;
    }
  }, []);

  const deleteEntry = useCallback(async (entryId: string) => {
    try {
      const { error: expenseDeleteError } = await db
        .from('calendar_event_expenses')
        .delete()
        .eq('event_id', entryId);

      if (expenseDeleteError) {
        console.error('Error deleting entry expenses:', expenseDeleteError);
        return false;
      }

      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('event_id', entryId);

      if (error) {
        console.error('Error deleting entry:', error);
        return false;
      }

      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      return true;
    } catch (error) {
      console.error('Error deleting entry:', error);
      return false;
    }
  }, []);

  // Reminders
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Schema: reminder_id, reminder_at, description, asset_id, is_completed, created_at
  // Reminders are scoped by user: only those whose asset_id belongs to current user's assets
  const loadReminders = useCallback(async (assetId?: string) => {
    if (!user?.id) return;

    try {
      const { data: userAssets, error: assetsError } = await db
        .from('assets')
        .select('asset_id')
        .eq('uuid', user.id);

      if (assetsError) {
        console.error('Error loading user assets for reminders:', assetsError);
        return;
      }

      const userAssetIds = (userAssets ?? []).map((a: { asset_id: string }) => a.asset_id);
      if (userAssetIds.length === 0) {
        setReminders([]);
        return;
      }

      let query = db
        .from('reminders')
        .select('*')
        .in('asset_id', userAssetIds)
        .order('reminder_at', { ascending: true });

      if (assetId) {
        query = query.eq('asset_id', assetId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading reminders:', error);
        return;
      }

      const rows = data || [];
      const mappedReminders: Reminder[] = rows.map((r: Record<string, unknown>) => {
        const desc = (r.description as string) ?? '';
        return {
          id: (r.reminder_id as string) ?? (r.id as string),
          asset_id: (r.asset_id as string) ?? undefined,
          title: (desc.slice(0, 100) || (r.title as string)) ?? 'Reminder',
          description: desc || undefined,
          due_date: (r.reminder_at as string) ?? (r.due_date as string) ?? '',
          priority: (r.priority as 'low' | 'medium' | 'high') ?? 'medium',
          completed: (r.is_completed as boolean) ?? (r.completed as boolean) ?? false,
          recurring: (r.recurring as Reminder['recurring']) ?? null,
          created_at: (r.created_at as string) ?? '',
        };
      });

      setReminders(mappedReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  }, [user]);

  const addReminder = useCallback(async (assetId: string, reminder: {
    title: string;
    description?: string;
    due_date: string;
    priority?: 'low' | 'medium' | 'high';
    recurring?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await db
        .from('reminders')
        .insert({
          asset_id: assetId,
          reminder_at: reminder.due_date,
          description: reminder.title || reminder.description || 'Reminder',
          is_completed: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding reminder:', error);
        return null;
      }

      const row = data as Record<string, unknown>;
      const newReminder: Reminder = {
        id: (row.reminder_id as string) ?? (row.id as string),
        asset_id: (row.asset_id as string) ?? assetId,
        title: (row.description as string)?.slice(0, 100) ?? reminder.title,
        description: (row.description as string) ?? reminder.description ?? undefined,
        due_date: (row.reminder_at as string) ?? reminder.due_date,
        priority: reminder.priority ?? 'medium',
        completed: (row.is_completed as boolean) ?? false,
        recurring: reminder.recurring ?? null,
        created_at: (row.created_at as string) ?? '',
      };

      setReminders((prev) => [...prev, newReminder]);
      return newReminder;
    } catch (error) {
      console.error('Error adding reminder:', error);
      return null;
    }
  }, [user]);

  const toggleReminder = useCallback(async (reminderId: string) => {
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder) return false;

    try {
      const { error } = await db
        .from('reminders')
        .update({ is_completed: !reminder.completed })
        .eq('reminder_id', reminderId);

      if (error) {
        console.error('Error toggling reminder:', error);
        return false;
      }

      setReminders((prev) =>
        prev.map((r) =>
          r.id === reminderId ? { ...r, completed: !r.completed } : r
        )
      );
      return true;
    } catch (error) {
      console.error('Error toggling reminder:', error);
      return false;
    }
  }, [reminders]);

  const updateReminder = useCallback(async (reminderId: string, updates: { title: string; due_date: string; priority: 'low' | 'medium' | 'high' }) => {
    try {
      const { error } = await db
        .from('reminders')
        .update({
          description: updates.title,
          reminder_at: updates.due_date,
        })
        .eq('reminder_id', reminderId);

      if (error) {
        console.error('Error updating reminder:', error);
        return false;
      }

      setReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, ...updates } : r))
      );
      return true;
    } catch (error) {
      console.error('Error updating reminder:', error);
      return false;
    }
  }, []);

  const deleteReminder = useCallback(async (reminderId: string) => {
    try {
      const { error } = await db
        .from('reminders')
        .delete()
        .eq('reminder_id', reminderId);

      if (error) {
        console.error('Error deleting reminder:', error);
        return false;
      }

      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
      return true;
    } catch (error) {
      console.error('Error deleting reminder:', error);
      return false;
    }
  }, []);

  const getUpcomingReminders = useCallback(() => {
    const now = new Date();
    return reminders
      .filter((r) => !r.completed && parseDbDate(r.due_date) >= now)
      .map((r) => {
        const asset = assets.find((a) => a.id === r.asset_id);
        return {
          ...r,
          assetName: asset?.name || 'Άγνωστο',
          assetColor: asset ? resolveAssetColor(asset) : undefined,
        };
      });
  }, [reminders, assets]);

  // Load all reminders on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadReminders();
    }
  }, [isAuthenticated, loadReminders]);

  // Load entries when asset is selected
  useEffect(() => {
    if (selectedAssetId) {
      loadEntries(selectedAssetId);
    }
  }, [selectedAssetId, loadEntries]);

  // Asset messages keyed by asset id (eliminates cross-asset overwrite/race issues)
  const [assetMessagesByAssetId, setAssetMessagesByAssetId] = useState<Record<string, AssetMessage[]>>({});
  const assetMessages = selectedAssetId ? assetMessagesByAssetId[selectedAssetId] ?? [] : [];
  const messageRequestSeqRef = useRef(0);

  const extractTextFromContent = useCallback((raw: unknown): string => {
    // Handle JSONB array returned as a JS array
    if (Array.isArray(raw)) {
      const parts = raw
        .filter((item) => item && typeof item === 'object' && (item as { type: string }).type === 'text')
        .map((item) => (item as { text?: string }).text ?? '')
        .join(' ');
      return parts || '';
    }
    if (typeof raw === 'string') {
      // Try to parse JSON arrays like [{"type":"text","text":"..."}]
      if (raw.trimStart().startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const parts = parsed
              .filter((item) => item && item.type === 'text' && item.text)
              .map((item: { text: string }) => item.text)
              .join(' ');
            if (parts) return parts;
          }
        } catch {
          // not valid JSON, use as-is
        }
      }
      return raw;
    }
    return String(raw ?? '');
  }, []);

  const mapMessageRows = useCallback((rows: Record<string, unknown>[], assetId: string): AssetMessage[] => {
    return rows.map((row, index) => {
      const createdAt = (row.created_at as string) ?? '';
      const rawContent =
        row.text !== undefined && row.text !== null ? row.text :
        row.content !== undefined && row.content !== null ? row.content :
        row.message !== undefined && row.message !== null ? row.message :
        '';
      const text = extractTextFromContent(rawContent);
      const rawRole = (row.role as string) ?? (row.sender as string) ?? (row.type as string);
      const role: AssetMessage['role'] =
        rawRole === 'assistant' || rawRole === 'agent' ? 'assistant' : 'user';
      return {
        id:
          (row.message_id as string) ??
          (row.id as string) ??
          `${assetId}-${createdAt || 'no-created-at'}-${index}`,
        asset_id: (row.asset_id as string) ?? null,
        text,
        role,
        created_at: createdAt,
      };
    });
  }, [extractTextFromContent]);

  const loadAssetMessages = useCallback(async (assetId: string) => {
    const seq = ++messageRequestSeqRef.current;
    try {
      const { data, error } = await db
        .from('messages')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading asset messages:', error);
        const isLatestRequest = seq === messageRequestSeqRef.current;
        const isCurrentSelectedAsset = currentSelectedAssetIdRef.current === assetId;
        const shouldApply = isLatestRequest || isCurrentSelectedAsset;
        console.debug('[useAssets] loadAssetMessages', {
          selectedAssetId: currentSelectedAssetIdRef.current,
          requestedAssetId: assetId,
          rowsReturned: 0,
          seq,
          latestSeq: messageRequestSeqRef.current,
          updateStatus: shouldApply ? 'applied-empty-on-error' : 'dropped-stale-seq',
        });
        if (shouldApply) {
          setAssetMessagesByAssetId((prev) => ({
            ...prev,
            [assetId]: [],
          }));
        }
        return;
      }

      let rows = (data || []) as Record<string, unknown>[];
      let source: 'supabase-js' | 'rest-fallback' = 'supabase-js';

      // Fallback: if supabase-js returned nothing, retry via raw REST using the
      // user's current session token (avoids anon-vs-authenticated context mismatch).
      if (rows.length === 0 && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
        try {
          const session = (await supabase.auth.getSession()).data.session;
          const authToken = session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;
          const url = `${SUPABASE_URL}/rest/v1/messages?select=message_id,asset_id,text,created_at&asset_id=eq.${encodeURIComponent(assetId)}&order=created_at.asc`;
          const response = await fetch(url, {
            headers: {
              apikey: SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${authToken}`,
            },
          });
          if (response.ok) {
            const fallbackRows = (await response.json()) as Record<string, unknown>[];
            if (Array.isArray(fallbackRows) && fallbackRows.length > 0) {
              rows = fallbackRows;
              source = 'rest-fallback';
            }
          }
        } catch (fallbackError) {
          console.debug('[useAssets] loadAssetMessages fallback failed', {
            requestedAssetId: assetId,
            error: fallbackError,
          });
        }
      }

      const mapped = mapMessageRows(rows, assetId);
      const isLatestRequest = seq === messageRequestSeqRef.current;
      const isCurrentSelectedAsset = currentSelectedAssetIdRef.current === assetId;
      const shouldApply = isLatestRequest || isCurrentSelectedAsset;
      const firstRow = rows[0];
      console.debug('[useAssets] loadAssetMessages', {
        selectedAssetId: currentSelectedAssetIdRef.current,
        requestedAssetId: assetId,
        rowsReturned: mapped.length,
        source,
        firstRowKeys: firstRow ? Object.keys(firstRow) : [],
        seq,
        latestSeq: messageRequestSeqRef.current,
        updateStatus: shouldApply ? (isLatestRequest ? 'applied' : 'applied-current-asset') : 'dropped-stale-seq',
      });
      if (!shouldApply) return;
      setAssetMessagesByAssetId((prev) => ({
        ...prev,
        [assetId]: mapped,
      }));
    } catch (error) {
      console.error('Error loading asset messages:', error);
      const isLatestRequest = seq === messageRequestSeqRef.current;
      const isCurrentSelectedAsset = currentSelectedAssetIdRef.current === assetId;
      const shouldApply = isLatestRequest || isCurrentSelectedAsset;
      console.debug('[useAssets] loadAssetMessages', {
        selectedAssetId: currentSelectedAssetIdRef.current,
        requestedAssetId: assetId,
        rowsReturned: 0,
        seq,
        latestSeq: messageRequestSeqRef.current,
        updateStatus: shouldApply ? 'applied-empty-on-error' : 'dropped-stale-seq',
      });
      if (shouldApply) {
        setAssetMessagesByAssetId((prev) => ({
          ...prev,
          [assetId]: [],
        }));
      }
    }
  }, [mapMessageRows]);

  useEffect(() => {
    // Invalidate any in-flight message load tied to older selection.
    messageRequestSeqRef.current += 1;
    if (!selectedAssetId) {
      return;
    }
    loadAssetMessages(selectedAssetId);
  }, [selectedAssetId, loadAssetMessages]);

  // Supabase Realtime: subscribe to postgres_changes for assets/reminders/entries.
  // JWT auth is handled automatically via the accessToken callback in client.ts.
  // The messages table has its own dedicated channel below (with asset_id filter).
  useEffect(() => {
    if (!isAuthenticated) return;

    const channelName = `realtime-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        loadAssets();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => {
        loadReminders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => {
        if (selectedAssetId) loadEntries(selectedAssetId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_event_expenses' }, () => {
        if (selectedAssetId) loadEntries(selectedAssetId);
      })
      .subscribe((status, err) => {
        console.debug('[useAssets] realtime channel status:', status, err ?? '');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, loadAssets, loadReminders, loadEntries, selectedAssetId]);

  // Supabase Realtime: dedicated channel for the messages table, filtered by
  // asset_id so only rows relevant to the selected asset trigger a reload.
  // Falls back to 5-second polling when the WebSocket cannot be established
  // (e.g. non-JWT publishable key or network issue).
  const messagesPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const selectedAssetIdRef = useRef<string | null>(null);
  selectedAssetIdRef.current = selectedAssetId;

  useEffect(() => {
    // Tear down previous channel and polling before setting up new ones
    if (messagesChannelRef.current) {
      supabase.removeChannel(messagesChannelRef.current);
      messagesChannelRef.current = null;
    }
    if (messagesPollRef.current) {
      clearInterval(messagesPollRef.current);
      messagesPollRef.current = null;
    }

    if (!isAuthenticated || !selectedAssetId) return;

    let realtimeConnected = false;

    const startPolling = () => {
      if (messagesPollRef.current) return;
      messagesPollRef.current = setInterval(() => {
        const id = selectedAssetIdRef.current;
        if (id) loadAssetMessages(id);
      }, 5000);
    };

    const channel = supabase
      .channel(`messages:asset:${selectedAssetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `asset_id=eq.${selectedAssetId}`,
        },
        () => {
          const id = selectedAssetIdRef.current;
          if (id) loadAssetMessages(id);
        }
      )
      .subscribe((status, err) => {
        console.debug('[useAssets] messages channel status:', status, err ?? '');
        if (status === 'SUBSCRIBED') {
          realtimeConnected = true;
          // Realtime is working — stop polling if it was running
          if (messagesPollRef.current) {
            clearInterval(messagesPollRef.current);
            messagesPollRef.current = null;
          }
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          realtimeConnected = false;
          startPolling();
        }
      });

    messagesChannelRef.current = channel;

    // If realtime hasn't confirmed SUBSCRIBED within 3 s, start polling as fallback
    const fallbackTimer = setTimeout(() => {
      if (!realtimeConnected) startPolling();
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
      if (messagesPollRef.current) {
        clearInterval(messagesPollRef.current);
        messagesPollRef.current = null;
      }
    };
  }, [isAuthenticated, selectedAssetId, loadAssetMessages]);

  const [isAssetMessageLoading, setIsAssetMessageLoading] = useState(false);

  const getSessionId = useCallback((assetId: string): string | null => {
    return localStorage.getItem(`asset_session_${assetId}`);
  }, []);

  const saveSessionId = useCallback((assetId: string, sessionId: string) => {
    localStorage.setItem(`asset_session_${assetId}`, sessionId);
  }, []);

  const sendAssetVoiceMessage = useCallback(async (assetId: string, audioBlob: Blob) => {
    if (!assetId || !audioBlob.size) return;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('Supabase environment variables are missing.');
    }

    setIsAssetMessageLoading(true);

    try {
      const sessionId = getSessionId(assetId);
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;
      const formData = new FormData();

      formData.append('file', audioBlob, 'speech.webm');
      formData.append('assetid', assetId);

      if (sessionId) {
        formData.append('session_id', sessionId);
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/speech_to_text`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const payload = await response.json().catch(() => null) as { error?: string; session_id?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || `Speech-to-text failed with status ${response.status}`);
      }

      if (payload?.session_id) {
        saveSessionId(assetId, payload.session_id);
      }

      await loadAssetMessages(assetId);
    } catch (error) {
      console.error('Error sending asset voice message:', error);
      const errMsg: AssetMessage = {
        id: `error-${Date.now()}`,
        asset_id: assetId,
        text: 'Συγγνώμη, παρουσιάστηκε σφάλμα στη φωνητική αποστολή. Παρακαλώ δοκίμασε ξανά.',
        role: 'assistant',
        created_at: new Date().toISOString(),
      };
      setAssetMessagesByAssetId((prev) => ({
        ...prev,
        [assetId]: [...(prev[assetId] ?? []), errMsg],
      }));
      throw error;
    } finally {
      setIsAssetMessageLoading(false);
    }
  }, [getSessionId, loadAssetMessages, saveSessionId]);

  const sendAssetMessage = useCallback(async (assetId: string, text: string, images?: string[]) => {
    if (!assetId || !text.trim()) return;

    setIsAssetMessageLoading(true);

    // Optimistic: show the user message immediately while waiting for the agent
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: AssetMessage = {
      id: optimisticId,
      asset_id: assetId,
      text: text.trim(),
      role: 'user',
      created_at: new Date().toISOString(),
    };
    setAssetMessagesByAssetId((prev) => ({
      ...prev,
      [assetId]: [...(prev[assetId] ?? []), optimisticMsg],
    }));

    try {
      const contentItems: { type: string; text?: string; image_url?: { url: string } }[] = [
        { type: 'text', text: text.trim() },
      ];
      if (images && images.length > 0) {
        images.forEach((img) => {
          contentItems.push({ type: 'image_url', image_url: { url: img } });
        });
      }

      const sessionId = getSessionId(assetId);
      const requestBody: Record<string, unknown> = {
        assetid: assetId,
        message: {
          role: 'user',
          content: contentItems,
        },
        current_time: new Date().toISOString(),
      };
      if (sessionId) {
        requestBody.session_id = sessionId;
      }

      const { data, error } = await supabase.functions.invoke('message_instert', {
        body: requestBody,
      });

      if (data?.session_id) {
        saveSessionId(assetId, data.session_id);
      }

      if (error) {
        console.error('Error sending asset message:', error);
        const errMsg: AssetMessage = {
          id: `error-${Date.now()}`,
          asset_id: assetId,
          text: 'Συγγνώμη, παρουσιάστηκε σφάλμα. Παρακαλώ δοκίμασε ξανά.',
          role: 'assistant',
          created_at: new Date().toISOString(),
        };
        setAssetMessagesByAssetId((prev) => ({
          ...prev,
          [assetId]: [...(prev[assetId] ?? []).filter((m) => m.id !== optimisticId), errMsg],
        }));
      } else {
        // Reload to get actual DB state (realtime subscription will also do this)
        await loadAssetMessages(assetId);
      }
    } catch (err) {
      console.error('Error sending asset message:', err);
      const errMsg: AssetMessage = {
        id: `error-${Date.now()}`,
        asset_id: assetId,
        text: 'Συγγνώμη, παρουσιάστηκε σφάλμα. Παρακαλώ δοκίμασε ξανά.',
        role: 'assistant',
        created_at: new Date().toISOString(),
      };
      setAssetMessagesByAssetId((prev) => ({
        ...prev,
        [assetId]: [...(prev[assetId] ?? []).filter((m) => m.id !== optimisticId), errMsg],
      }));
    } finally {
      setIsAssetMessageLoading(false);
    }
  }, [loadAssetMessages, getSessionId, saveSessionId]);

  return {
    assets,
    selectedAsset,
    selectedAssetId,
    setSelectedAssetId,
    addAsset,
    updateAsset,
    deleteAsset,
    loading,
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleReminder,
    getUpcomingReminders,
    loadAssets,
    assetMessages,
    loadAssetMessages,
    sendAssetVoiceMessage,
    sendAssetMessage,
    isAssetMessageLoading,
  };
}
