import * as XLSX from 'xlsx';
import { FileData, MatchedRecord, Statistics } from '@/types';

export function formatNumber(value: number, type: 'number' | 'currency' | 'percent' = 'number'): string {
  if (type === 'currency') {
    return new Intl.NumberFormat('en-ZA', { 
      style: 'currency', 
      currency: 'ZAR' 
    }).format(value);
  }
  if (type === 'percent') {
    return new Intl.NumberFormat('en-AU', { 
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }
  return new Intl.NumberFormat('en-AU').format(value);
}

export async function processFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!e.target?.result) throw new Error('Failed to read file');
        const workbook = XLSX.read(e.target.result, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { 
          raw: true,
          defval: ''
        });
        console.log('Processed file data:', data);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function getLast4Digits(ref: string | number): string {
  if (!ref) return '';
  const numbers = ref.toString().replace(/\D/g, '');
  return numbers.slice(-4);
}

function isValidExportPltId(ref: string | undefined): boolean {
  if (!ref) return false;
  if (ref.includes('DESTINATION:') || ref.includes('(Pre)')) return false;
  return /\d/.test(ref);
}

export function matchData(loadData: any[], salesData: any[]): MatchedRecord[] {
  console.log('Load data columns:', loadData[0] ? Object.keys(loadData[0]) : 'No data');
  console.log('Sales data columns:', salesData[0] ? Object.keys(salesData[0]) : 'No data');
  
  const loadDataMap = new Map();
  const processedPalletIds = new Set();
  
  loadData.forEach(load => {
    const formattedPalletId = load['Formatted Pallet ID']?.toString() || '';
    const cartonsSent = Number(load['# Ctns']) || 0;
    
    console.log('Processing load record:', { formattedPalletId, cartonsSent });
    
    const last4 = getLast4Digits(formattedPalletId);
    if (last4) {
      if (!loadDataMap.has(last4)) {
        loadDataMap.set(last4, []);
      }
      loadDataMap.get(last4).push({
        formattedPalletId,
        variety: load['Variety'] || '',
        cartonType: load['Ctn Type'] || '',
        cartonsSent
      });
    }
  });

  const matchedRecords: MatchedRecord[] = salesData
    .filter(sale => {
      const exportPltId = sale['export_plt_id']?.toString().trim();
      return isValidExportPltId(exportPltId);
    })
    .map(sale => {
      const exportPltId = sale['export_plt_id'];
      const last4 = getLast4Digits(exportPltId);
      const loadRecords = loadDataMap.get(last4) || [];
      
      const soldOnMarket = Number(sale['ctn_qty']) || 0;
      
      const loadInfo = loadRecords.find(record => 
        record.cartonsSent === soldOnMarket
      ) || loadRecords[0];

      if (loadInfo) {
        processedPalletIds.add(loadInfo.formattedPalletId);
      }

      console.log('Processing sales record:', { exportPltId, soldOnMarket, loadInfo });

      return {
        formattedPalletId: loadInfo ? loadInfo.formattedPalletId : '',
        exportPltId: exportPltId || '',
        status: loadInfo ? 'Matched' as const : 'Unmatched' as const,
        variety: loadInfo ? loadInfo.variety : '',
        cartonType: loadInfo ? loadInfo.cartonType : '',
        cartonsSent: loadInfo ? loadInfo.cartonsSent : 0,
        soldOnMarket,
        deviationSentSold: loadInfo ? loadInfo.cartonsSent - soldOnMarket : 0,
        totalValue: Number(sale['Total Value']) || 0,
        reconciled: loadInfo ? (loadInfo.cartonsSent === soldOnMarket) : false
      };
    });

  loadData.forEach(load => {
    const formattedPalletId = load['Formatted Pallet ID']?.toString() || '';
    if (!processedPalletIds.has(formattedPalletId)) {
      matchedRecords.push({
        formattedPalletId,
        exportPltId: '',
        status: 'Unmatched' as const,
        variety: load['Variety'] || '',
        cartonType: load['Ctn Type'] || '',
        cartonsSent: Number(load['# Ctns']) || 0,
        soldOnMarket: 0,
        deviationSentSold: Number(load['# Ctns']) || 0,
        totalValue: 0,
        reconciled: false
      });
    }
  });

  console.log('Final matched records:', matchedRecords);
  return matchedRecords;
}

export function calculateStatistics(data: MatchedRecord[]): Statistics {
  const matchedRecords = data.filter(record => record.status === 'Matched');
  const totalValue = data.reduce((sum, record) => sum + record.totalValue, 0);
  
  return {
    totalRecords: data.length,
    matchedCount: matchedRecords.length,
    unmatchedCount: data.length - matchedRecords.length,
    totalValue,
    averageValue: data.length > 0 ? totalValue / data.length : 0,
    matchRate: data.length > 0 ? (matchedRecords.length / data.length) * 100 : 0
  };
}

export function generateExcel(data: MatchedRecord[]): void {
  const exportData = data.map(item => ({
    'Formatted Pallet ID': item.formattedPalletId,
    'Export Plt ID': item.exportPltId,
    'Status': item.status,
    'Variety': item.variety,
    'Carton Type': item.cartonType,
    '# Ctns Sent': item.cartonsSent,
    'Sold on market': item.soldOnMarket,
    'Deviation Sent/Sold': item.deviationSentSold,
    'Total Value': item.totalValue,
    'Reconciled': item.reconciled ? 'Yes' : 'No'
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const totalValueCol = 'I';
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const cell = totalValueCol + (row + 1);
    if (ws[cell]) {
      ws[cell].z = '$#,##0.00';
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Matching Report');
  XLSX.writeFile(wb, 'matching_report.xlsx');
}
