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
  /** Set to false to keep the tool's standalone route live while hiding it from the home page grid. Defaults to true. */
  homeVisible?: boolean;
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
