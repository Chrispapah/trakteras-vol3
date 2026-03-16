import { Asset, AssetType } from '@/types';

export const ASSET_COLOR_PRESETS = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#a855f7',
  '#ef4444',
  '#14b8a6',
  '#eab308',
  '#ec4899',
] as const;

const DEFAULT_ASSET_COLORS_BY_TYPE: Record<AssetType, string> = {
  field: '#22c55e',
  tractor: '#f59e0b',
  machine: '#3b82f6',
};

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function getDefaultAssetColor(type: AssetType) {
  return DEFAULT_ASSET_COLORS_BY_TYPE[type] ?? ASSET_COLOR_PRESETS[0];
}

export function getAssetColorFromSeed(seed: string, type: AssetType) {
  if (!seed.trim()) {
    return getDefaultAssetColor(type);
  }

  return ASSET_COLOR_PRESETS[hashString(seed) % ASSET_COLOR_PRESETS.length];
}

export function resolveAssetColor(asset: Pick<Asset, 'id' | 'name' | 'type' | 'color'>) {
  const storedColor = asset.color?.trim();
  if (storedColor) {
    return storedColor;
  }

  return getAssetColorFromSeed(`${asset.type}:${asset.id}:${asset.name}`, asset.type);
}
