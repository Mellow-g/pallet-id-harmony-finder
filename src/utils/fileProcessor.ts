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
        
        // Get raw data with header information
        const data = XLSX.utils.sheet_to_json(firstSheet, { 
          raw: true,
          defval: '',
          header: 1 // This will give us an array of arrays instead of objects
        });
        
        console.log('Raw sheet data (first 10 rows):', data.slice(0, 10));
        console.log('Total rows in sheet:', data.length);
        
        // Convert back to objects for compatibility
        if (data.length > 0) {
          const headers = data[0] as string[];
          console.log('Headers found:', headers);
          
          const objectData = data.slice(1).map((row: any[], index) => {
            const obj: any = { __rowNum__: index + 2 };
            headers.forEach((header, colIndex) => {
              obj[header || `__EMPTY_${colIndex}`] = row[colIndex] || '';
            });
            // Also add Column G specifically for load reports
            if (row[6] !== undefined) { // Column G is index 6
              obj['Column_G'] = row[6];
            }
            return obj;
          });
          
          console.log('Processed object data (first 5 rows):', objectData.slice(0, 5));
          resolve(objectData);
        } else {
          resolve([]);
        }
      } catch (err) {
        console.error('Error processing file:', err);
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function normalizePalletId(palletId: string | number): string {
  if (!palletId) return '';
  return palletId.toString().trim().toUpperCase();
}

function isValidPalletId(palletId: string | undefined): boolean {
  if (!palletId) return false;
  const normalized = normalizePalletId(palletId);
  // Check if it's not empty and doesn't contain common invalid indicators
  if (normalized.includes('DESTINATION:') || normalized.includes('(Pre)')) return false;
  return normalized.length > 0;
}

export function matchData(loadData: any[], salesData: any[]): MatchedRecord[] {
  console.log('Load data sample:', loadData.slice(0, 2));
  console.log('Sales data sample:', salesData.slice(0, 2));
  
  const loadDataMap = new Map();
  const processedPallets = new Set();
  
  // Build a map of Formatted Pallet IDs from load data
  loadData.forEach((load, index) => {
    // Extract Formatted Pallet ID from the load data
    const formattedPalletId = normalizePalletId(
      load['Formatted Pallet ID'] || 
      load['Column_G'] ||
      load['formatted_pallet_id'] || 
      load['FormattedPalletID'] || 
      ''
    );
    
    if (formattedPalletId && isValidPalletId(formattedPalletId)) {
      console.log(`Load record ${index}: Formatted Pallet ID = ${formattedPalletId}`);
      
      // Extract other required fields from load data
      const variety = load['Variety'] || load['variety'] || '';
      const cartonType = load['Ctn Type'] || load['ctn_type'] || load['carton_type'] || '';
      const cartonsSent = Number(load['# Ctns'] || load['sum_of_ctns'] || load['Sum of # Ctns'] || 0);
      
      console.log(`Load record ${index}: Variety = ${variety}, Carton Type = ${cartonType}, Cartons Sent = ${cartonsSent}`);
      
      loadDataMap.set(formattedPalletId, {
        formattedPalletId,
        variety,
        cartonType,
        cartonsSent
      });
    } else if (index < 10) {
      console.log(`Load record ${index}: No valid pallet ID found. Formatted Pallet ID = ${load['Formatted Pallet ID']}, Column_G = ${load['Column_G']}`);
    }
  });

  console.log('Load data map size:', loadDataMap.size);
  console.log('Load data map entries:', Array.from(loadDataMap.entries()).slice(0, 5));

  // Match sales data with load data using Export Plt ID
  const matchedRecords: MatchedRecord[] = salesData
    .filter((sale, index) => {
      // Extract Export Plt ID from sales data
      const exportPltId = (
        sale['Export Plt ID'] ||
        sale['export_plt_id'] || 
        sale['Export_Plt_ID'] || 
        sale['ExportPltId'] || 
        ''
      )?.toString().trim();
      
      const isValid = isValidPalletId(exportPltId);
      if (index < 5) { // Log first 5 for debugging
        console.log(`Sales record ${index}: Export Plt ID = ${exportPltId}, valid = ${isValid}`);
      }
      return isValid;
    })
    .map((sale, index) => {
      const exportPltId = normalizePalletId(
        sale['Export Plt ID'] ||
        sale['export_plt_id'] || 
        sale['Export_Plt_ID'] || 
        sale['ExportPltId'] || 
        ''
      );
      
      const loadInfo = loadDataMap.get(exportPltId);

      if (loadInfo) {
        processedPallets.add(loadInfo.formattedPalletId);
        console.log(`Match found! Export Plt ID ${exportPltId} matches Formatted Pallet ID ${loadInfo.formattedPalletId}`);
      } else if (index < 5) {
        console.log(`No match found for Export Plt ID: ${exportPltId}`);
      }

      // Extract sales data fields
      const received = Number(
        sale['ctn_qty'] ||
        sale['Received'] || 
        sale['received'] || 
        sale['qty_received'] ||
        0
      );
      
      const soldOnMarket = Number(
        sale['Sold'] || 
        sale['sold'] || 
        sale['qty_sold'] || 
        0
      );

      const totalValue = Number(
        sale['total_income'] ||
        sale['Total Value'] || 
        sale['total_value'] || 
        sale['value'] || 
        0
      );

      return {
        formattedPalletId: loadInfo ? loadInfo.formattedPalletId : '',
        supplierRef: exportPltId || '',
        status: loadInfo ? 'Matched' as const : 'Unmatched' as const,
        variety: loadInfo ? loadInfo.variety : (sale['variety'] || sale['Variety'] || ''),
        cartonType: loadInfo ? loadInfo.cartonType : (sale['carton_type'] || sale['Carton Type'] || ''),
        cartonsSent: loadInfo ? loadInfo.cartonsSent : 0,
        received,
        deviationSentReceived: loadInfo ? loadInfo.cartonsSent - received : 0,
        soldOnMarket,
        deviationReceivedSold: received - soldOnMarket,
        totalValue,
        reconciled: loadInfo ? (loadInfo.cartonsSent === received && received === soldOnMarket) : false
      };
    });

  // Add unmatched load records (those not found in sales data)
  loadData.forEach(load => {
    const formattedPalletId = normalizePalletId(
      load['Formatted Pallet ID'] ||
      load['Column_G'] ||
      load['formatted_pallet_id'] || 
      load['FormattedPalletID'] || 
      ''
    );
    
    if (formattedPalletId && isValidPalletId(formattedPalletId) && !processedPallets.has(formattedPalletId)) {
      console.log(`Adding unmatched load record: ${formattedPalletId}`);
      
      const variety = load['Variety'] || load['variety'] || '';
      const cartonType = load['Ctn Type'] || load['ctn_type'] || load['carton_type'] || '';
      const cartonsSent = Number(load['# Ctns'] || load['sum_of_ctns'] || load['Sum of # Ctns'] || 0);
      
      matchedRecords.push({
        formattedPalletId,
        supplierRef: '',
        status: 'Unmatched' as const,
        variety,
        cartonType,
        cartonsSent,
        received: 0,
        deviationSentReceived: cartonsSent,
        soldOnMarket: 0,
        deviationReceivedSold: 0,
        totalValue: 0,
        reconciled: false
      });
    }
  });

  console.log('Total matched records:', matchedRecords.length);
  console.log('Sample matched records:', matchedRecords.slice(0, 3));

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
    'Export Plt ID': item.supplierRef,
    'Status': item.status,
    'Variety': item.variety,
    'Carton Type': item.cartonType,
    '# Ctns Sent': item.cartonsSent,
    'Received': item.received,
    'Deviation Sent/Received': item.deviationSentReceived,
    'Sold on market': item.soldOnMarket,
    'Deviation Received/Sold': item.deviationReceivedSold,
    'Total Value': item.totalValue,
    'Reconciled': item.reconciled ? 'Yes' : 'No'
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const totalValueCol = 'K';
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
