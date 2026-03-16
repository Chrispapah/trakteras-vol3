import { useState } from 'react';
import { Reminder } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { parseDbDate, dbDateToInputValue, inputValueToDbDate } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReminderItemProps {
  reminder: Reminder;
  accentColor?: string;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: { title: string; due_date: string; priority: 'low' | 'medium' | 'high' }) => void;
  onDelete: (id: string) => void;
}

const priorityLabels = {
  low: 'Χαμηλή',
  medium: 'Μεσαία',
  high: 'Υψηλή',
};

export function ReminderItem({ reminder, accentColor, onToggle, onUpdate, onDelete }: ReminderItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(reminder.title);
  const [editDate, setEditDate] = useState(dbDateToInputValue(reminder.due_date));
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>(reminder.priority);

  const handleSave = () => {
    if (editTitle.trim() && editDate) {
      onUpdate(reminder.id, {
        title: editTitle.trim(),
        due_date: inputValueToDbDate(editDate),
        priority: editPriority,
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(reminder.title);
    setEditDate(dbDateToInputValue(reminder.due_date));
    setEditPriority(reminder.priority);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="p-3 rounded-lg border border-primary bg-background space-y-2">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Τίτλος υπενθύμισης..."
          autoFocus
        />
        <div className="flex gap-2">
          <Input
            type="datetime-local"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="flex-1"
          />
          <Select value={editPriority} onValueChange={(v) => setEditPriority(v as 'low' | 'medium' | 'high')}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Χαμηλή</SelectItem>
              <SelectItem value="medium">Μεσαία</SelectItem>
              <SelectItem value="high">Υψηλή</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            <X className="w-4 h-4 mr-1" />
            Ακύρωση
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!editTitle.trim() || !editDate}>
            <Check className="w-4 h-4 mr-1" />
            Αποθήκευση
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all group ${
        reminder.completed
          ? 'bg-muted/50 border-border'
          : 'bg-background border-border'
      }`}
      style={accentColor ? { boxShadow: `inset 3px 0 0 ${accentColor}` } : undefined}
    >
      <button
        onClick={() => onToggle(reminder.id)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          reminder.completed
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-muted-foreground hover:border-primary'
        }`}
      >
        {reminder.completed && <Check className="w-3 h-3" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {accentColor && (
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          )}
          <div
            className={`text-sm ${
              reminder.completed ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {reminder.title}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {parseDbDate(reminder.due_date).toLocaleDateString('el-GR')}
          {' '}
          {parseDbDate(reminder.due_date).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <span
        className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
          reminder.priority === 'high'
            ? 'bg-destructive/10 text-destructive'
            : reminder.priority === 'medium'
            ? 'bg-accent/20 text-accent-foreground'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {priorityLabels[reminder.priority]}
      </span>
      <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:h-7 sm:w-7"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Διαγραφή Υπενθύμισης</AlertDialogTitle>
              <AlertDialogDescription>
                Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την υπενθύμιση; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDelete(reminder.id)}
              >
                Διαγραφή
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
