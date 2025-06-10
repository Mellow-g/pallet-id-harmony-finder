
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface FilterControlsProps {
  statusFilter: string;
  varietyFilter: string;
  reconciledFilter: string;
  varieties: string[];
  onStatusChange: (value: string) => void;
  onVarietyChange: (value: string) => void;
  onReconciledChange: (value: string) => void;
  onExport: () => void;
}

export const FilterControls = ({
  statusFilter,
  varietyFilter,
  reconciledFilter,
  varieties,
  onStatusChange,
  onVarietyChange,
  onReconciledChange,
  onExport
}: FilterControlsProps) => {
  return (
    <div className="flex flex-wrap gap-4 items-center justify-between bg-card p-4 rounded-lg">
      <div className="flex flex-wrap gap-4">
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[180px] bg-background text-foreground">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="matched">Matched</SelectItem>
            <SelectItem value="unmatched">Unmatched</SelectItem>
          </SelectContent>
        </Select>

        <Select value={varietyFilter} onValueChange={onVarietyChange}>
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

        <Select value={reconciledFilter} onValueChange={onReconciledChange}>
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
        onClick={onExport}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Download className="mr-2 h-4 w-4" />
        Export to Excel
      </Button>
    </div>
  );
};
