
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MatchedRecord } from "@/types";
import { formatNumber, generateExcel } from "@/utils/fileProcessor";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Check, X } from "lucide-react";
import { FilterControls } from "./FilterControls";

interface DataTableProps {
  data: MatchedRecord[];
  onFilteredDataChange?: (filteredData: MatchedRecord[]) => void;
}

export const DataTable = ({ data, onFilteredDataChange }: DataTableProps) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [varietyFilter, setVarietyFilter] = useState<string>("all");
  const [reconciledFilter, setReconciledFilter] = useState<string>("all");

  const varieties = useMemo(() => {
    const uniqueVarieties = new Set(data.map(record => record.variety).filter(Boolean));
    return Array.from(uniqueVarieties);
  }, [data]);

  const handleStatusChange = useCallback((value: string) => {
    console.log('Status filter changed to:', value);
    setStatusFilter(value);
  }, []);

  const handleVarietyChange = useCallback((value: string) => {
    console.log('Variety filter changed to:', value);
    setVarietyFilter(value);
  }, []);

  const handleReconciledChange = useCallback((value: string) => {
    console.log('Reconciled filter changed to:', value);
    setReconciledFilter(value);
  }, []);

  const filteredData = useMemo(() => {
    console.log('Applying filters:', { statusFilter, varietyFilter, reconciledFilter });
    
    if (!data || data.length === 0) {
      return [];
    }

    return data.filter(record => {
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "matched" && record.status !== "Matched") return false;
        if (statusFilter === "unmatched" && record.status !== "Unmatched") return false;
      }
      
      // Variety filter
      if (varietyFilter !== "all" && record.variety !== varietyFilter) return false;
      
      // Reconciled filter
      if (reconciledFilter !== "all") {
        if (reconciledFilter === "reconciled" && !record.reconciled) return false;
        if (reconciledFilter === "not-reconciled" && record.reconciled) return false;
      }
      
      return true;
    });
  }, [data, statusFilter, varietyFilter, reconciledFilter]);

  const sortedData = useMemo(() => {
    console.log('Sorting filtered data:', filteredData.length, 'records');
    
    if (!filteredData || filteredData.length === 0) {
      return [];
    }

    const reconciled: MatchedRecord[] = [];
    const matched: MatchedRecord[] = [];
    const unmatched: MatchedRecord[] = [];
    const incomplete: MatchedRecord[] = [];

    filteredData.forEach(record => {
      if (record.reconciled) {
        reconciled.push(record);
      } else if (!record.formattedPalletId && !record.exportPltId) {
        incomplete.push(record);
      } else if (record.status === 'Matched') {
        matched.push(record);
      } else {
        unmatched.push(record);
      }
    });

    return [...reconciled, ...matched, ...unmatched, ...incomplete];
  }, [filteredData]);

  // Update parent component with filtered data for statistics
  useEffect(() => {
    if (onFilteredDataChange && sortedData) {
      onFilteredDataChange(sortedData);
    }
  }, [sortedData, onFilteredDataChange]);

  const handleExport = useCallback(() => {
    if (sortedData && sortedData.length > 0) {
      generateExcel(sortedData);
    }
  }, [sortedData]);

  const getRowClassName = useCallback((record: MatchedRecord) => {
    if (!record.formattedPalletId && !record.exportPltId) {
      return 'bg-orange-900/30 hover:bg-orange-900/40';
    }
    if (record.status === 'Unmatched') {
      return 'bg-destructive/10 hover:bg-destructive/20';
    }
    return 'hover:bg-card/50';
  }, []);

  // Define column classes with exact pixel widths and consistent alignment
  const columnClasses = {
    palletId: "w-[140px] px-4",
    exportId: "w-[160px] px-4",
    status: "w-[100px] px-4",
    variety: "w-[80px] px-4",
    cartonType: "w-[100px] px-4",
    orchard: "w-[100px] px-4",
    numbers: "w-[100px] px-4 text-right",
    deviation: "w-[140px] px-4 text-right",
    value: "w-[120px] px-4 text-right",
    agent: "w-[120px] px-4",
    reconciled: "w-[100px] px-4 text-center"
  };

  return (
    <div className="space-y-4">
      <FilterControls
        statusFilter={statusFilter}
        varietyFilter={varietyFilter}
        reconciledFilter={reconciledFilter}
        varieties={varieties}
        onStatusChange={handleStatusChange}
        onVarietyChange={handleVarietyChange}
        onReconciledChange={handleReconciledChange}
        onExport={handleExport}
      />

      <div className="rounded-md border border-primary/20 max-h-[70vh] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-[#1A1F2C] border-b border-primary/20">
              <TableHead className={`${columnClasses.palletId} text-primary font-semibold`}>Formatted Pallet ID</TableHead>
              <TableHead className={`${columnClasses.exportId} text-primary font-semibold`}>Export Plt ID</TableHead>
              <TableHead className={`${columnClasses.status} text-primary font-semibold`}>Status</TableHead>
              <TableHead className={`${columnClasses.variety} text-primary font-semibold`}>Variety</TableHead>
              <TableHead className={`${columnClasses.cartonType} text-primary font-semibold`}>Carton Type</TableHead>
              <TableHead className={`${columnClasses.orchard} text-primary font-semibold`}>Orchard</TableHead>
              <TableHead className={`${columnClasses.numbers} text-primary font-semibold`}>Cartons Sent</TableHead>
              <TableHead className={`${columnClasses.numbers} text-primary font-semibold`}>Cartons Sold</TableHead>
              <TableHead className={`${columnClasses.deviation} text-primary font-semibold`}>Deviation Sent/Sold</TableHead>
              <TableHead className={`${columnClasses.value} text-primary font-semibold`}>Total Value</TableHead>
              <TableHead className={`${columnClasses.agent} text-primary font-semibold`}>Agent</TableHead>
              <TableHead className={`${columnClasses.reconciled} text-primary font-semibold`}>Reconciled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((record, index) => (
              <TableRow
                key={`${record.formattedPalletId || 'empty'}-${record.exportPltId || 'empty'}-${index}`}
                className={`${getRowClassName(record)} transition-colors`}
              >
                <TableCell className={columnClasses.palletId}>{record.formattedPalletId}</TableCell>
                <TableCell className={columnClasses.exportId}>{record.exportPltId}</TableCell>
                <TableCell className={columnClasses.status}>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${record.status === 'Matched' ? 'bg-green-500/20 text-green-500' : 'bg-destructive/20 text-destructive'}`
                    }
                  >
                    {record.status}
                  </span>
                </TableCell>
                <TableCell className={columnClasses.variety}>{record.variety}</TableCell>
                <TableCell className={columnClasses.cartonType}>{record.cartonType}</TableCell>
                <TableCell className={columnClasses.orchard}>{record.orchard}</TableCell>
                <TableCell className={columnClasses.numbers}>{formatNumber(record.cartonsSent)}</TableCell>
                <TableCell className={columnClasses.numbers}>{formatNumber(record.soldOnMarket)}</TableCell>
                <TableCell className={columnClasses.deviation}>{formatNumber(record.deviationSentSold)}</TableCell>
                <TableCell className={columnClasses.value}>{formatNumber(record.totalValue, 'currency')}</TableCell>
                <TableCell className={columnClasses.agent}>{record.agent}</TableCell>
                <TableCell className={columnClasses.reconciled}>
                  {record.reconciled ? (
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  ) : (
                    <X className="h-5 w-5 text-destructive mx-auto" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
