import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { StatsCard } from '@/components/StatsCard';
import { DataTable } from '@/components/DataTable';
import { FileData, FileType, MatchedRecord, Statistics } from '@/types';
import { processFile, matchData, calculateStatistics } from '@/utils/fileProcessor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';

const Index = () => {
  const [loadFile, setLoadFile] = useState<File>();
  const [salesFile, setSalesFile] = useState<File>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedData, setMatchedData] = useState<MatchedRecord[]>();
  const [filteredStats, setFilteredStats] = useState<Statistics>();
  const { toast } = useToast();

  const handleFileSelect = (file: File, type: FileType) => {
    if (type === 'load') {
      setLoadFile(file);
    } else {
      setSalesFile(file);
    }
  };

  const handleAnalyze = async () => {
    if (!loadFile || !salesFile) {
      toast({
        title: "Missing files",
        description: "Please upload both Load and Sales reports",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const loadData = await processFile(loadFile);
      const salesData = await processFile(salesFile);
      
      const matched = matchData(loadData, salesData);
      const stats = calculateStatistics(matched);
      
      setMatchedData(matched);
      setFilteredStats(stats);
      
      toast({
        title: "Analysis complete",
        description: `Matched ${stats.matchedCount} out of ${stats.totalRecords} records`,
      });
    } catch (error) {
      toast({
        title: "Error processing files",
        description: "Please check your file format and try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFilteredDataChange = (filteredData: MatchedRecord[]) => {
    const filteredStats = calculateStatistics(filteredData);
    setFilteredStats(filteredStats);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-black/90 py-16 mb-8">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501854140801-50d01698950b')] bg-cover bg-center opacity-20" />
        <div className="container relative z-10 mx-auto text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            Normat Farms
          </h1>
          <p className="text-2xl font-semibold text-primary mb-2">
            CORE
          </p>
          <p className="text-lg text-primary/80 max-w-2xl mx-auto">
            Advanced Data Analysis and Reporting System
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 space-y-8">
        {/* File Upload Section */}
        <div className="grid gap-6 md:grid-cols-2 bg-card rounded-lg p-6 shadow-lg">
          <FileUpload
            type="load"
            onFileSelect={handleFileSelect}
            isLoading={isProcessing}
          />
          <FileUpload
            type="sales"
            onFileSelect={handleFileSelect}
            isLoading={isProcessing}
          />
        </div>
        
        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleAnalyze}
            disabled={!loadFile || !salesFile || isProcessing}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg shadow-lg transition-all hover:scale-105"
          >
            {isProcessing ? "Processing..." : "Analyse Data"}
          </Button>
        </div>

        {/* Results Section */}
        <div className="space-y-8">
          {filteredStats && (
            <div className="transform hover:scale-[1.01] transition-transform">
              <StatsCard stats={filteredStats} />
            </div>
          )}
          {matchedData && (
            <div className="bg-card rounded-lg shadow-lg p-6">
              <DataTable 
                data={matchedData} 
                onFilteredDataChange={handleFilteredDataChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
