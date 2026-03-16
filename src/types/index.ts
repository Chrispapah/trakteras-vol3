export type AssetType = 'field' | 'tractor' | 'machine';

export interface AssetDetailsData {
  description?: string;
  location?: string;
  area?: string;
  cropType?: string;
  information?: string;
  brand?: string;
  model?: string;
  year?: string;
  plantingDate?: string;
  vin?: string;
  nextService?: string;
  notifications?: boolean;
}

interface BaseAssetCreateInput {
  name: string;
  type: AssetType;
  icon: string;
  color: string;
}

export interface FieldAssetCreateInput extends BaseAssetCreateInput {
  type: 'field';
  description?: string;
  location?: string;
  area?: string;
  cropType?: string;
  information?: string;
}

export interface TractorAssetCreateInput extends BaseAssetCreateInput {
  type: 'tractor';
  brand?: string;
  model?: string;
  year?: string;
  information?: string;
}

export interface MachineAssetCreateInput extends BaseAssetCreateInput {
  type: 'machine';
  brand?: string;
  model?: string;
  year?: string;
  information?: string;
}

export type AssetCreateInput =
  | FieldAssetCreateInput
  | TractorAssetCreateInput
  | MachineAssetCreateInput;

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  icon: string;
  color?: string;
  description?: string;
  details?: AssetDetailsData;
  created_at: string;
  updated_at?: string;
}

export interface DiaryEntry {
  id: string;
  asset_id: string;
  content: string;
  tags: string[];
  cost?: number | null;
  images?: string[];
  weather_data?: Record<string, unknown> | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  asset_id: string;
  title: string;
  description?: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  recurring?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  created_at: string;
}

export interface AssetMessage {
  id: string;
  asset_id: string | null;
  text: string;
  role?: 'user' | 'assistant';
  created_at: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
  icon: string;
  windSpeed: number;
  precipitation: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: string[];
  assetContext?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'reminder' | 'entry' | 'weather';
  assetId?: string;
  color: string;
  cost?: number | null;
}