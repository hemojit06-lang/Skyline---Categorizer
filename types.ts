
export interface RawTransaction {
  item: string;
  value: number;
  type: 'credit' | 'debit' | 'income' | 'expense';
  originalText: string;
  involvedPerson?: string; // Name of person if it's a loan/debt
  isOwed?: boolean;        // Whether this money is owed back to the user
}

export interface BuildingData {
  category: string;
  total: number;
  floors: {
    value: number;
    description: string;
    type: string;
  }[];
  color: string;
}

export interface DebtSummary {
  person: string;
  amount: number;
  color: string;
}

export interface TimelinePoint {
  time: string;
  balance: number;
  change: number;
  label: string;
}

export type ParseResponse = {
  transactions: RawTransaction[];
};
