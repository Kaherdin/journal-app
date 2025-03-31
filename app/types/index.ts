export interface JournalEntry {
  id?: string;
  date: string;
  mit: string;
  content: string;
  prompt?: string;
  gratitude?: any; // Changé de string[] à any pour supporter le format jsonb
  notes?: {
    productivite: number;
    sport: number;
    energie: number;
    proprete: number;
    art: number;
  };
  embedding?: number[];
  created_at?: string;
}

export interface AskQuestion {
  question: string;
}

export interface Database {
  public: {
    Tables: {
      journal_entries: {
        Row: JournalEntry;
        Insert: Omit<JournalEntry, 'id' | 'created_at'>;
        Update: Partial<Omit<JournalEntry, 'id' | 'created_at'>>;
      };
    };
  };
}
