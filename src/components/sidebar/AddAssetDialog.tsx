import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { Asset, AssetCreateInput } from '@/types';
import { ASSET_COLOR_PRESETS, getDefaultAssetColor } from '@/lib/assetColors';

const assetTypes: { type: Asset['type']; icon: string; label: string }[] = [
  { type: 'field', icon: '🌾', label: 'Χωράφι' },
  { type: 'tractor', icon: '🚜', label: 'Τρακτέρ' },
  { type: 'machine', icon: '⚙️', label: 'Μηχάνημα' },
];

const namePlaceholders: Record<Asset['type'], string> = {
  field: 'π.χ. Βόρειο Χωράφι - Καλαμπόκι',
  tractor: 'π.χ. John Deere 6155M',
  machine: 'π.χ. Amazone ZA-M 1500',
};

interface AddAssetDialogProps {
  onAdd: (asset: AssetCreateInput) => void;
}

export function AddAssetDialog({ onAdd }: AddAssetDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<Asset['type']>('field');
  const [selectedColor, setSelectedColor] = useState(getDefaultAssetColor('field'));
  const [fieldDescription, setFieldDescription] = useState('');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState('');
  const [cropType, setCropType] = useState('');
  const [fieldInformation, setFieldInformation] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [equipmentInformation, setEquipmentInformation] = useState('');

  const trimOptional = (value: string) => value.trim() || undefined;

  const resetForm = () => {
    setName('');
    setSelectedType('field');
    setSelectedColor(getDefaultAssetColor('field'));
    setFieldDescription('');
    setLocation('');
    setArea('');
    setCropType('');
    setFieldInformation('');
    setBrand('');
    setModel('');
    setYear('');
    setEquipmentInformation('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      const typeInfo = assetTypes.find((t) => t.type === selectedType)!;
      if (selectedType === 'field') {
        onAdd({
          name: name.trim(),
          type: 'field',
          icon: typeInfo.icon,
          color: selectedColor,
          description: trimOptional(fieldDescription),
          location: trimOptional(location),
          area: trimOptional(area),
          cropType: trimOptional(cropType),
          information: trimOptional(fieldInformation),
        });
      } else {
        onAdd({
          name: name.trim(),
          type: selectedType,
          icon: typeInfo.icon,
          color: selectedColor,
          brand: trimOptional(brand),
          model: trimOptional(model),
          year: trimOptional(year),
          information: trimOptional(equipmentInformation),
        });
      }
      resetForm();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Προσθήκη Στοιχείου
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl overflow-hidden rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>Νέο Περιουσιακό Στοιχείο</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(100dvh-5rem)] overflow-y-auto px-4 py-4 space-y-4 sm:max-h-[min(42rem,calc(100dvh-8rem))] sm:px-6 sm:pb-6"
        >
          {/* Asset Type Selection */}
          <div className="space-y-2">
            <Label>Τύπος</Label>
            <div className="grid grid-cols-3 gap-2">
              {assetTypes.map((type) => (
                <button
                  key={type.type}
                  type="button"
                  onClick={() => {
                    setSelectedType(type.type);
                    setSelectedColor(getDefaultAssetColor(type.type));
                  }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                    selectedType === type.type
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span className="text-xs">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Χρώμα Στοιχείου</Label>
            <div className="flex items-center gap-3">
              <label
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border shadow-sm"
                style={{ backgroundColor: selectedColor }}
              >
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="sr-only"
                  aria-label="Επιλογή χρώματος στοιχείου"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {ASSET_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Χρώμα ${color}`}
                    onClick={() => setSelectedColor(color)}
                    className={`h-7 w-7 rounded-full border transition-transform ${
                      selectedColor === color ? 'scale-110 border-foreground' : 'border-border/70'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Όνομα</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={namePlaceholders[selectedType]}
              required
            />
          </div>

          {selectedType === 'field' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="field-description">Περιγραφή</Label>
                <Textarea
                  id="field-description"
                  value={fieldDescription}
                  onChange={(e) => setFieldDescription(e.target.value)}
                  placeholder="π.χ. Βόρειο τεμάχιο κοντά στο αρδευτικό κανάλι"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Τοποθεσία</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="π.χ. Λάρισα"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Έκταση</Label>
                <Input
                  id="area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="π.χ. 30 στρέμματα"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cropType">Καλλιέργεια</Label>
                <Input
                  id="cropType"
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  placeholder="π.χ. Βαμβάκι"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-information">Πληροφορίες</Label>
                <Textarea
                  id="field-information"
                  value={fieldInformation}
                  onChange={(e) => setFieldInformation(e.target.value)}
                  placeholder="Επιπλέον πληροφορίες για το χωράφι"
                  rows={2}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="brand">Μάρκα</Label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="π.χ. John Deere"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Μοντέλο</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="π.χ. 6155M"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Χρονολογία</Label>
                <Input
                  id="year"
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                  inputMode="numeric"
                  placeholder="π.χ. 2020"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment-information">Πληροφορίες</Label>
                <Textarea
                  id="equipment-information"
                  value={equipmentInformation}
                  onChange={(e) => setEquipmentInformation(e.target.value)}
                  placeholder="Επιπλέον πληροφορίες για το τρακτέρ ή το μηχάνημα"
                  rows={2}
                />
              </div>
            </>
          )}

          <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 pt-3 pb-1 backdrop-blur sm:-mx-6 sm:px-6 sm:pb-0">
            <Button type="submit" className="w-full">
              Δημιουργία
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}