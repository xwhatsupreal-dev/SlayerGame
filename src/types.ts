export interface User {
  id: number;
  username: string;
}

export interface Player {
  id: number;
  name: string;
  gender: string;
  level: number;
  exp: number;
  hp: number;
  max_hp: number;
  gold: number;
  gems: number;
  weapon: string;
  str: number;
  dex: number;
  vit: number;
  stat_points: number;
  last_save?: string;
  language?: Language;
  created_at?: string;
  theme_color?: string;
}

export type Language = 'EN' | 'TH';

export interface Achievement {
  id: string;
  title_en: string;
  title_th: string;
  description_en: string;
  description_th: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
}

export interface Translation {
  dashboard: string;
  training: string;
  logout: string;
  level: string;
  exp: string;
  hp: string;
  gold: string;
  gems: string;
  weapon: string;
  strength: string;
  dexterity: string;
  vitality: string;
  statPoints: string;
  train: string;
  confirm: string;
  cancel: string;
  damage: string;
  maxHp: string;
  login: string;
  register: string;
  username: string;
  password: string;
  gender: string;
  male: string;
  female: string;
  discordLogin: string;
  noAccount: string;
  hasAccount: string;
  save: string;
  saving: string;
  saved: string;
  profile: string;
  joined: string;
  stats: string;
  equipment: string;
  achievements: string;
  edit: string;
  update: string;
  unlocked: string;
  locked: string;
  newAchievement: string;
  theme: string;
  selectTheme: string;
  betaTester: string;
  settings: string;
  customColor: string;
}
