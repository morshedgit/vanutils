export type ToolCategory = 'outdoors' | 'transit' | 'daily_living' | 'civic';

export type ToolStatus = 'active' | 'beta' | 'planned';

export interface ToolMeta {
  id: string;
  name: string;
  shortDescription: string;
  path: string;
  icon: string;
  category: ToolCategory;
  status: ToolStatus;
  badgeText?: string;
  previewStat?: {
    value: string;
    label: string;
    statusType?: 'safe' | 'caution' | 'advisory' | 'info';
  };
  features?: string[];
}

export interface GeoCoord {
  latitude: number;
  longitude: number;
}

export interface VancouverLocationPreset {
  id: string;
  name: string;
  neighborhood: string;
  coords: GeoCoord;
}
