import { useState } from 'react';
import { Asset, DiaryEntry, Reminder } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Bell, Plus } from 'lucide-react';
import { DiaryEntryItem } from './DiaryEntryItem';
import { ReminderItem } from './ReminderItem';
import { inputValueToDbDate } from '@/lib/utils';
import { resolveAssetColor } from '@/lib/assetColors';

interface AssetDetailsProps {
  asset: Asset;
  entries: DiaryEntry[];
  reminders: Reminder[];
  onAddEntry: (entry: { content: string; tags: string[] }) => void;
  onUpdateEntry: (id: string, content: string, tags: string[]) => void;
  onDeleteEntry: (id: string) => void;
  onAddReminder: (reminder: { title: string; due_date: string; priority: 'low' | 'medium' | 'high' }) => void;
  onUpdateReminder: (id: string, updates: { title: string; due_date: string; priority: 'low' | 'medium' | 'high' }) => void;
  onDeleteReminder: (id: string) => void;
  onToggleReminder: (reminderId: string) => void;
}

export function AssetDetails({
  asset,
  entries,
  reminders,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onAddReminder,
  onUpdateReminder,
  onDeleteReminder,
  onToggleReminder,
}: AssetDetailsProps) {
  const [newEntry, setNewEntry] = useState('');
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const assetColor = resolveAssetColor(asset);

  const handleAddEntry = () => {
    if (newEntry.trim()) {
      onAddEntry({
        content: newEntry.trim(),
        tags: extractTags(newEntry),
      });
      setNewEntry('');
    }
  };

  const handleAddReminder = () => {
    if (newReminderTitle.trim() && newReminderDate) {
      onAddReminder({
        title: newReminderTitle.trim(),
        due_date: inputValueToDbDate(newReminderDate),
        priority: 'medium',
      });
      setNewReminderTitle('');
      setNewReminderDate('');
    }
  };

  const detailRows = getDetailRows(asset);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card/50 lg:border-l lg:border-border">
      {/* Asset Header */}
      <div className="shrink-0 border-b border-border p-4">
        <div className="flex items-start gap-3 pr-8">
          <span className="text-3xl">{asset.icon}</span>
          <div className="min-w-0">
            <h2 className="font-semibold text-lg">{asset.name}</h2>
            {asset.description && (
              <p className="text-sm text-muted-foreground">{asset.description}</p>
            )}
          </div>
        </div>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: assetColor }}
          />
          Χρώμα στοιχείου
        </div>

        {detailRows.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {detailRows.map((detail) => (
              <div key={detail.label} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">{detail.label}</p>
                <p className="text-sm">{detail.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="diary" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-2 grid w-[calc(100%-2rem)] grid-cols-2">
          <TabsTrigger value="diary" className="flex-1 gap-1">
            <BookOpen className="w-4 h-4" />
            Ημερολόγιο
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex-1 gap-1">
            <Bell className="w-4 h-4" />
            Υπενθυμίσεις
          </TabsTrigger>
        </TabsList>

        {/* Diary Tab */}
        <TabsContent value="diary" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden p-4">
          {/* New Entry Form */}
          <div className="space-y-2 mb-4">
            <Textarea
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              placeholder="Τι έκανες σήμερα; Χρησιμοποίησε #ετικέτες..."
              className="resize-none"
              rows={2}
            />
            <Button
              size="sm"
              onClick={handleAddEntry}
              disabled={!newEntry.trim()}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-1" />
              Προσθήκη Καταχώρησης
            </Button>
          </div>

          {/* Entries List */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Δεν υπάρχουν καταχωρήσεις. Ξεκίνα να καταγράφεις τις δραστηριότητές σου!
              </p>
            ) : (
              entries.map((entry) => (
                <DiaryEntryItem
                  key={entry.id}
                  entry={entry}
                  onUpdate={onUpdateEntry}
                  onDelete={onDeleteEntry}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden p-4">
          {/* New Reminder Form */}
          <div className="space-y-2 mb-4">
            <Input
              value={newReminderTitle}
              onChange={(e) => setNewReminderTitle(e.target.value)}
              placeholder="Τίτλος υπενθύμισης..."
            />
            <Input
              type="datetime-local"
              value={newReminderDate}
              onChange={(e) => setNewReminderDate(e.target.value)}
            />
            <Button
              size="sm"
              onClick={handleAddReminder}
              disabled={!newReminderTitle.trim() || !newReminderDate}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-1" />
              Προσθήκη Υπενθύμισης
            </Button>
          </div>

          {/* Reminders List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Δεν υπάρχουν υπενθυμίσεις. Πρόσθεσε σημαντικές ημερομηνίες!
              </p>
            ) : (
              reminders.map((reminder) => (
                <ReminderItem
                  key={reminder.id}
                  reminder={reminder}
                  accentColor={assetColor}
                  onToggle={onToggleReminder}
                  onUpdate={onUpdateReminder}
                  onDelete={onDeleteReminder}
                />
              ))
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

function extractTags(content: string): string[] {
  const tagRegex = /#(\w+)/g;
  const matches = content.match(tagRegex);
  return matches ? matches.map((tag) => tag.slice(1)) : [];
}

function getDetailRows(asset: Asset) {
  const details = asset.details;
  if (!details) return [];

  if (asset.type === 'field') {
    return [
      { label: 'Περιγραφή', value: details.description },
      { label: 'Τοποθεσία', value: details.location },
      { label: 'Έκταση', value: details.area },
      { label: 'Καλλιέργεια', value: details.cropType },
      { label: 'Πληροφορίες', value: details.information },
    ].filter((detail): detail is { label: string; value: string } => Boolean(detail.value));
  }

  return [
    { label: 'Μάρκα', value: details.brand },
    { label: 'Μοντέλο', value: details.model },
    { label: 'Χρονολογία', value: details.year },
    { label: 'Πληροφορίες', value: details.information },
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail.value));
}
