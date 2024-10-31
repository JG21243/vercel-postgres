import { motion } from "framer-motion";
import { Button } from "./ui/button";

export const SuggestedQueries = ({
  handleSuggestionClick,
}: {
  handleSuggestionClick: (suggestion: string) => void;
}) => {
  const suggestionQueries = [
    {
      desktop: "List all legal prompts created in the last month",
      mobile: "Recent prompts",
    },
    {
      desktop: "Show the count of legal prompts by category",
      mobile: "Prompts by category",
    },
    {
      desktop: "Find legal prompts with a specific system message",
      mobile: "Specific system message",
    },
    {
      desktop: "Display legal prompts sorted by creation date",
      mobile: "Sorted by date",
    },
    {
      desktop: "Show the latest legal prompt added",
      mobile: "Latest prompt",
    },
    {
      desktop: "Count of legal prompts created each day for the past week",
      mobile: "Weekly count",
    },
    {
      desktop: "List all legal prompts with a specific keyword in the name",
      mobile: "Keyword search",
    },
    {
      desktop: "Show legal prompts grouped by category",
      mobile: "Grouped by category",
    },
    {
      desktop: "Find legal prompts without a system message",
      mobile: "No system message",
    },
    {
      desktop: "Display the total number of legal prompts",
      mobile: "Total prompts",
    },
    {
      desktop: "Show legal prompts created before a specific date",
      mobile: "Before date",
    },
  ];

  return (
    <motion.div
      key="suggestions"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      layout
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto"
    >
      <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
        Try these queries:
      </h2>
      <div className="flex flex-wrap gap-2">
        {suggestionQueries.map((suggestion, index) => (
          <Button
            key={index}
            className={index > 5 ? "hidden sm:inline-block" : ""}
            type="button"
            variant="outline"
            onClick={() => handleSuggestionClick(suggestion.desktop)}
          >
            <span className="sm:hidden">{suggestion.mobile}</span>
            <span className="hidden sm:inline">{suggestion.desktop}</span>
          </Button>
        ))}
      </div>
    </motion.div>
  );
};