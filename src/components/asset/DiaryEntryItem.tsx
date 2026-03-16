import { useState } from 'react';
import { DiaryEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrencyAmount } from '@/lib/utils';
import { Calendar, Tag, Pencil, Trash2, Check, X } from 'lucide-react';
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

interface DiaryEntryItemProps {
  entry: DiaryEntry;
  onUpdate: (id: string, content: string, tags: string[]) => void;
  onDelete: (id: string) => void;
}

function extractTags(content: string): string[] {
  const tagRegex = /#(\w+)/g;
  const matches = content.match(tagRegex);
  return matches ? matches.map((tag) => tag.slice(1)) : [];
}

export function DiaryEntryItem({ entry, onUpdate, onDelete }: DiaryEntryItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);

  const handleSave = () => {
    if (editContent.trim()) {
      onUpdate(entry.id, editContent.trim(), extractTags(editContent));
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditContent(entry.content);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="p-3 rounded-lg bg-background border border-primary">
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="resize-none mb-2"
          rows={3}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            <X className="w-4 h-4 mr-1" />
            Ακύρωση
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!editContent.trim()}>
            <Check className="w-4 h-4 mr-1" />
            Αποθήκευση
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-background border border-border group">
      <div className="flex justify-between items-start gap-2">
        <div className="text-sm flex-1">{entry.content}</div>
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
                <AlertDialogTitle>Διαγραφή Καταχώρησης</AlertDialogTitle>
                <AlertDialogDescription>
                  Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την καταχώρηση; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete(entry.id)}
                >
                  Διαγραφή
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(entry.created_at).toLocaleDateString('el-GR')}
        </span>
        {entry.cost != null && (
          <span className="text-xs bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded-full">
            Κόστος {formatCurrencyAmount(entry.cost)}
          </span>
        )}
        {entry.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1"
          >
            <Tag className="w-3 h-3" />
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
