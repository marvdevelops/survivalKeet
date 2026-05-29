export interface EmergencyContact {
  id: number;
  name: string;
  phone: string;
  created_at: string;
}

export interface DmsConfig {
  id: 1;
  is_active: boolean;
  interval_hours: 4 | 6 | 12;
  grace_minutes: 30 | 60;
  owner_name: string;
  last_checkin_at: string | null;
  activated_at: string | null;
}

export interface EmergencyModeState {
  is_active: boolean;
  activated_at: string | null;
}

export interface MedicalInfo {
  member_id: number;
  blood_type: string;
  allergies: string;
  conditions: string;
  medications: string;
  medical_notes: string;
}

export type PreparednessItem = {
  key: string;
  label: string;
  completed: boolean;
  route: string;
};

export interface TutorialProgress {
  id: 1;
  lesson_1_done: boolean;
  lesson_2_done: boolean;
  lesson_3_done: boolean;
  lesson_4_done: boolean;
  lesson_5_done: boolean;
  welcome_shown: boolean;
}
