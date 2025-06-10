
export type FileType = 'load' | 'sales';

export interface FileData {
  [key: string]: any;
}

export interface MatchedRecord {
  formattedPalletId: string;
  exportPltId: string;
  status: 'Matched' | 'Unmatched';
  variety: string;
  cartonType: string;
  cartonsSent: number;
  soldOnMarket: number;
  deviationSentSold: number;
  totalValue: number;
  reconciled: boolean;
}

export interface Statistics {
  totalRecords: number;
  matchedCount: number;
  unmatchedCount: number;
  totalValue: number;
  averageValue: number;
  matchRate: number;
}
