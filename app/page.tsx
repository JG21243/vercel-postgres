// app/page.tsx
"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateChartConfig, generateQuery, getLegalPrompts } from "./actions";
import { Config, Result } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProjectInfo } from "@/components/project-info";
import { LegalPromptSearch } from "@/components/legal-prompt-search";
import { LegalPromptTable } from "@/components/legal-prompt-table";
import { SuggestedQueries } from "@/components/suggested-queries";
import { QueryViewer } from "@/components/query-viewer";
import { Header } from "@/components/header";

// Add loading state type for better type safety
type LoadingStep = 1 | 2;

export default function Page() {
  // Group related state
  const [input, setInput] = useState({
    value: "",
    submitted: false
  });
  
  const [queryState, setQueryState] = useState({
    active: "",
    results: [] as Result[],
    columns: [] as string[],
    chartConfig: null as Config | null
  });
  
  const [loading, setLoading] = useState<{
    status: boolean;
    step: LoadingStep;
  }>({
    status: false,
    step: 1
  });

  // Enhanced error handling with retry capability
  const executeQuery = useCallback(async (question: string) => {
    try {
      const query = await generateQuery(question);
      if (!query) throw new Error("Failed to generate query");
      
      setQueryState(prev => ({ ...prev, active: query }));
      setLoading(prev => ({ ...prev, step: 2 }));
      
      const legalPrompts = await getLegalPrompts(query);
      const columns = legalPrompts.length > 0 ? Object.keys(legalPrompts[0]) : [];
      
      setQueryState(prev => ({
        ...prev,
        results: legalPrompts,
        columns
      }));
      
      // Generate chart config in parallel
      const generation = await generateChartConfig(legalPrompts, question);
      setQueryState(prev => ({
        ...prev,
        chartConfig: generation.config
      }));
      
      return true;
    } catch (error) {
      console.error("Query execution error:", error);
      return false;
    }
  }, []);

  const handleSubmit = useCallback(async (suggestion?: string) => {
    const question = suggestion ?? input.value;
    if (!suggestion && !input.value.trim()) return;

    // Clear existing data and set loading state
    setQueryState({
      active: "",
      results: [],
      columns: [],
      chartConfig: null
    });
    
    setLoading({ status: true, step: 1 });
    setInput(prev => ({ ...prev, submitted: true }));

    try {
      const success = await executeQuery(question);
      if (!success) {
        toast.error("Failed to process query. Please try again.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Submit error:", error);
    } finally {
      setLoading(prev => ({ ...prev, status: false }));
    }
  }, [input.value, executeQuery]);

  const handleSuggestionClick = useCallback(async (suggestion: string) => {
    setInput(prev => ({ ...prev, value: suggestion }));
    await handleSubmit(suggestion);
  }, [handleSubmit]);

  const handleClear = useCallback(() => {
    setInput({ value: "", submitted: false });
    setQueryState({
      active: "",
      results: [],
      columns: [],
      chartConfig: null
    });
  }, []);

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 flex items-start justify-center p-0 sm:p-8">
      <div className="w-full max-w-4xl min-h-dvh sm:min-h-0 flex flex-col">
        <motion.div
          className="bg-card rounded-xl sm:border sm:border-border flex-grow flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="p-6 sm:p-8 flex flex-col flex-grow">
            <Header handleClear={handleClear} />
            <LegalPromptSearch
              onSearch={handleSubmit}
              handleSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              inputValue={input.value}
              setInputValue={(value) => setInput(prev => ({ ...prev, value }))}
              submitted={input.submitted}
            />
            <div
              id="main-container"
              className="flex-grow flex flex-col sm:min-h-[420px]"
            >
              <div className="flex-grow h-full">
                <AnimatePresence mode="wait">
                  {!input.submitted ? (
                    <SuggestedQueries
                      handleSuggestionClick={handleSuggestionClick}
                    />
                  ) : (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      layout
                      className="sm:h-full min-h-[400px] flex flex-col"
                    >
                      <QueryViewer
                        activeQuery={queryState.active}
                        inputValue={input.value}
                      />
                      {loading.status ? (
                        <div className="h-full absolute bg-background/50 w-full flex flex-col items-center justify-center space-y-4">
                          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                          <p className="text-foreground">
                            {loading.step === 1
                              ? "Generating SQL query..."
                              : "Running SQL query..."}
                          </p>
                        </div>
                      ) : queryState.results.length === 0 ? (
                        <div className="flex-grow flex items-center justify-center">
                          <p className="text-center text-muted-foreground">
                            No results found.
                          </p>
                        </div>
                      ) : (
                        <LegalPromptTable
                          results={queryState.results}
                          chartConfig={queryState.chartConfig}
                          columns={queryState.columns}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <ProjectInfo />
        </motion.div>
      </div>
    </div>
  );
}