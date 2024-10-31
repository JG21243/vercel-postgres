import { Config, Result, LegalPrompt } from "@/lib/types";
import { DynamicChart } from "./dynamic-chart";
import { SkeletonCard } from "./skeleton-card";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export const LegalPromptTable = ({
  results,
  columns,
  chartConfig,
}: {
  results: Result[];
  columns: string[];
  chartConfig: Config | null;
}) => {
  const formatColumnTitle = (title: string) => {
    return title
      .split("_")
      .map((word, index) =>
        index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
      )
      .join(" ");
  };

  const formatCellValue = (column: string, value: any) => {
    if (column.toLowerCase().includes("createdat")) {
      return new Date(value).toLocaleString();
    }
    return value;
  };

  return (
    <div>
      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>
        <TabsContent value="table" className="flex-grow">
          <div className="sm:min-h-[10px] relative">
            <Table className="min-w-full divide-y divide-border">
              <TableHeader className="bg-secondary sticky top-0 shadow-sm">
                <TableRow>
                  {columns.map((column, index) => (
                    <TableHead
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      {formatColumnTitle(column)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="bg-card divide-y divide-border">
                {results.map((prompt, index) => (
                  <TableRow key={index} className="hover:bg-muted">
                    {columns.map((column, cellIndex) => (
                      <TableCell
                        key={cellIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-foreground"
                      >
                        {formatCellValue(
                          column,
                          prompt[column as keyof LegalPrompt],
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="charts" className="flex-grow overflow-auto">
          <div className="mt-4">
            {chartConfig && results.length > 0 ? (
              <DynamicChart chartData={results} chartConfig={chartConfig} />
            ) : (
              <SkeletonCard />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};