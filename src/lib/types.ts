export type SettingsData = {
  display_name: string;
  birth_date: string;
  gender: string;
  bio: string;
  orientation: string;
  interested_in: string[];
  age_min: number;
  age_max: number;
  photos: { id: string; url: string; position: number }[];
};

export const GENDERS = ["man", "woman", "non-binary", "trans-man", "trans-woman", "other"] as const;
export const ORIENTATIONS = ["straight", "gay", "lesbian", "bisexual", "pansexual", "asexual", "other"] as const;
