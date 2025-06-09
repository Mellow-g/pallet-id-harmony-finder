
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MatchedRecord, Statistics } from "@/types";
import { formatNumber, generateExcel } from "@/utils/fileProcessor";
import { useState, useMemo, useEffect } from "react";
import { Download, Check, X } from "lucide-react";

interface DataTableProps {
  data: MatchedRecord[];
  onFilteredDataChange?: (filteredData: MatchedRecord[]) => void;
}

export const DataTable = ({ data, onFilteredDataChange }: DataTableProps) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [varietyFilter, setVarietyFilter] = useState<string>("all");
  const [reconciledFilter, setReconciledFilter] = useState<string>("all");

  const varieties = useMemo(() => {
    const uniqueVarieties = new Set(data.map(record => record.variety));
    return Array.from(uniqueVarieties).filter(Boolean);
  }, [data]);

  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter(record => {
      const matchesStatus = statusFilter === "all" || record.status === (statusFilter === "matched" ? "Matched" : "Unmatched");
      const matchesVariety = varietyFilter === "all" || record.variety === varietyFilter;
      const matchesReconciled = reconciledFilter === "all" || 
        (reconciledFilter === "reconciled" ? record.reconciled : !record.reconciled);
      return matchesStatus && matchesVariety && matchesReconciled;
    });

    const reconciled: MatchedRecord[] = [];
    const matched: MatchedRecord[] = [];
    const unmatched: MatchedRecord[] = [];
    const incomplete: MatchedRecord[] = [];

    filtered.forEach(record => {
      if (record.reconciled) {
        reconciled.push(record);
      } else if (!record.formattedPalletId && !record.supplierRef) {
        incomplete.push(record);
      } else if (record.status === 'Matched') {
        matched.push(record);
      } else {
        unmatched.push(record);
      }
    });

    return [...reconciled, ...matched, ...unmatched, ...incomplete];
  }, [data, statusFilter, varietyFilter, reconciledFilter]);

  // Use useEffect to update parent component with filtered data for statistics
  useEffect(() => {
    onFilteredDataChange?.(filteredAndSortedData);
  }, [filteredAndSortedData, onFilteredDataChange]);

  const handleExport = () => {
    generateExcel(filteredAndSortedData);
  };

  const getRowClassName = (record: MatchedRecord) => {
    if (!record.formattedPalletId && !record.supplierRef) {
      return 'bg-orange-900/30 hover:bg-orange-900/40';
    }
    if (record.status === 'Unmatched') {
      return 'bg-destructive/10 hover:bg-destructive/20';
    }
    return 'hover:bg-card/50';
  };

  // Define column classes with exact pixel widths and consistent alignment
  const columnClasses = {
    palletId: "w-[140px] px-4",
    exportPltId: "w-[160px] px-4",
    status: "w-[100px] px-4",
    variety: "w-[80px] px-4",
    cartonType: "w-[100px] px-4",
    numbers: "w-[100px] px-4 text-right",
    deviation: "w-[140px] px-4 text-right",
    value: "w-[120px] px-4 text-right",
    reconciled: "w-[100px] px-4 text-center"
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between bg-card p-4 rounded-lg">
        <div className="flex flex-wrap gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-background text-foreground">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="unmatched">Unmatched</SelectItem>
            </SelectContent>
          </Select>

          <Select value={varietyFilter} onValueChange={setVarietyFilter}>
            <SelectTrigger className="w-[180px] bg-background text-foreground">
              <SelectValue placeholder="Filter by variety" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Varieties</SelectItem>
              {varieties.map((variety) => (
                <SelectItem key={variety} value={variety}>
                  {variety}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={reconciledFilter} onValueChange={setReconciledFilter}>
            <SelectTrigger className="w-[180px] bg-background text-foreground">
              <SelectValue placeholder="Filter by reconciliation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="reconciled">Reconciled</SelectItem>
              <SelectItem value="not-reconciled">Not Reconciled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleExport}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      <div className="rounded-md border border-primary/20 max-h-[70vh] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-[#1A1F2C] border-b border-primary/20">
              <TableHead className={`${columnClasses.palletId} text-primary font-semibold`}>Formatted Pallet ID</TableHead>
              <TableHead className={`${columnClasses.exportPltId} text-primary font-semibold`}>Export Plt ID</TableHead>
              <TableHead className={`${columnClasses.status} text-primary font-semibold`}>Status</TableHead>
              <TableHead className={`${columnClasses.variety} text-primary font-semibold`}>Variety</TableHead>
              <TableHead className={`${columnClasses.cartonType} text-primary font-semibold`}>Carton Type</TableHead>
              <TableHead className={`${columnClasses.numbers} text-primary font-semibold`}>Cartons Sent</TableHead>
              <TableHead className={`${columnClasses.numbers} text-primary font-semibold`}>Cartons Received</TableHead>
              <TableHead className={`${columnClasses.deviation} text-primary font-semibold`}>Deviation Sent/Received</TableHead>
              <TableHead className={`${columnClasses.numbers} text-primary font-semibold`}>Cartons Sold</TableHead>
              <TableHead className={`${columnClasses.deviation} text-primary font-semibold`}>Deviation Received/Sold</TableHead>
              <TableHead className={`${columnClasses.value} text-primary font-semibold`}>Total Value</TableHead>
              <TableHead className={`${columnClasses.reconciled} text-primary font-semibold`}>Reconciled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedData.map((record, index) => (
              <TableRow
                key={index}
                className={`${getRowClassName(record)} transition-colors`}
              >
                <TableCell className={columnClasses.palletId}>{record.formattedPalletId}</TableCell>
                <TableCell className={columnClasses.exportPltId}>{record.supplierRef}</TableCell>
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
                <TableCell className={columnClasses.numbers}>{formatNumber(record.cartonsSent)}</TableCell>
                <TableCell className={columnClasses.numbers}>{formatNumber(record.received)}</TableCell>
                <TableCell className={columnClasses.deviation}>{formatNumber(record.deviationSentReceived)}</TableCell>
                <TableCell className={columnClasses.numbers}>{formatNumber(record.soldOnMarket)}</TableCell>
                <TableCell className={columnClasses.deviation}>{formatNumber(record.deviationReceivedSold)}</TableCell>
                <TableCell className={columnClasses.value}>{formatNumber(record.totalValue, 'currency')}</TableCell>
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
