"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateChartConfig, generateQuery, getLegalPrompts } from "./actions";
import { Config, Result, LegalPrompt, QueryExplanation } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProjectInfo } from "@/components/project-info";
import { LegalPromptSearch } from "@/components/legal-prompt-search";
import { LegalPromptTable } from "@/components/legal-prompt-table";
import { SuggestedQueries } from "@/components/suggested-queries";
import { QueryViewer } from "@/components/query-viewer";
import { Header } from "@/components/header";

// Enhanced types using your type definitions
type LoadingStep = 1 | 2;

interface InputState {
  value: string;
  submitted: boolean;
}

interface QueryState {
  active: string;
  results: Result[];
  columns: string[];
  chartConfig: Config | null;
  explanations?: QueryExplanation[];
}

interface LoadingState {
  status: boolean;
  step: LoadingStep;
  error?: string;
}

export default function Page() {
  // State with your type definitions
  const [input, setInput] = useState<InputState>({
    value: "",
    submitted: false
  });
  
  const [queryState, setQueryState] = useState<QueryState>({
    active: "",
    results: [],
    columns: [],
    chartConfig: null,
    explanations: []
  });
  
  const [loading, setLoading] = useState<LoadingState>({
    status: false,
    step: 1,
    error: undefined
  });

  const executeQuery = useCallback(async (question: string) => {
    try {
      const query = await generateQuery(question);
      if (!query) {
        toast.error("Could not generate a valid SQL query. Please try rephrasing your question.");
        return false;
      }
      
      setQueryState(prev => ({ ...prev, active: query }));
      setLoading(prev => ({ ...prev, step: 2 }));
      
      const legalPrompts = await getLegalPrompts(query);
      
      // Ensure we have valid results
      if (!Array.isArray(legalPrompts)) {
        throw new Error("Invalid response format from server");
      }
      
      const columns = legalPrompts.length > 0 ? Object.keys(legalPrompts[0]) : [];
      
      setQueryState(prev => ({
        ...prev,
        results: legalPrompts,
        columns
      }));
      
      // Generate chart config with proper typing
      try {
        const generation = await generateChartConfig(legalPrompts, question);
        if (!generation?.config) {
          throw new Error("Invalid chart configuration received");
        }
        
        setQueryState(prev => ({
          ...prev,
          chartConfig: {
            ...generation.config,
            // Ensure required properties are present
            type: generation.config.type,
            xKey: generation.config.xKey,
            yKeys: generation.config.yKeys,
            // Optional properties with defaults
            colors: generation.config.colors ?? {},
            legend: generation.config.legend ?? false,
            multipleLines: generation.config.multipleLines ?? false,
            measurementColumn: generation.config.measurementColumn
          }
        }));
      } catch (chartError) {
        console.error("Chart generation error:", chartError);
        toast.error("Could not generate visualization, but data is available in table form.");
      }
      
      return true;
    } catch (error) {
      console.error("Query execution error:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred while processing your query.");
      }
      return false;
    }
  }, []);

  const handleSubmit = useCallback(async (suggestion?: string) => {
    const question = suggestion ?? input.value;
    if (!suggestion && !input.value.trim()) {
      toast.error("Please enter a query first");
      return;
    }

    // Reset state with proper typing
    setQueryState({
      active: "",
      results: [],
      columns: [],
      chartConfig: null,
      explanations: []
    });
    
    setLoading({ status: true, step: 1, error: undefined });
    setInput(prev => ({ ...prev, submitted: true }));

    try {
      const success = await executeQuery(question);
      if (!success) {
        setInput(prev => ({ ...prev, submitted: false }));
        setLoading(prev => ({ ...prev, error: "Query execution failed" }));
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("An unexpected error occurred. Please try again.");
      setInput(prev => ({ ...prev, submitted: false }));
      setLoading(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }));
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
      chartConfig: null,
      explanations: []
    });
    setLoading({ status: false, step: 1, error: undefined });
    toast.success("Cleared all results");
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
                          {loading.error && (
                            <p className="text-destructive text-sm">
                              Error: {loading.error}
                            </p>
                          )}
                        </div>
                      ) : queryState.results.length === 0 ? (
                        <div className="flex-grow flex items-center justify-center">
                          <p className="text-center text-muted-foreground">
                            No results found. Try rephrasing your query.
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