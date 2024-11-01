// suggested-queries.tsx
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { 
  Clock, PieChart, MessageSquare, Calendar, Search, 
  Grid, XCircle, Hash, FilterX, Calculator, CalendarRange,
  BarChart, LineChart, ListFilter 
} from "lucide-react";

// Enhance interface to match expected query patterns
interface QuerySuggestion {
  desktop: string;
  mobile: string;
  category: 'temporal' | 'analytics' | 'filters' | 'search' | 'grouping';
  icon: JSX.Element;
  description: string;
  expectedVisualization?: 'pie' | 'bar' | 'line' | 'table'; // Match your chart types
  complexity: 'simple' | 'moderate' | 'complex';
}

// Optimized suggestions aligned with your SQL generation capabilities
const SUGGESTION_QUERIES: QuerySuggestion[] = [
  {
    desktop: "Show legal prompts created in the last month",
    mobile: "Recent prompts",
    category: "temporal",
    icon: <Clock className="h-4 w-4 mr-2" />,
    description: "Prompts from the last 30 days",
    expectedVisualization: "table",
    complexity: "simple"
  },
  {
    desktop: "Display count of legal prompts by category",
    mobile: "Category stats",
    category: "analytics",
    icon: <PieChart className="h-4 w-4 mr-2" />,
    description: "Category distribution",
    expectedVisualization: "pie",
    complexity: "simple"
  },
  {
    desktop: "Count prompts by creation date this week",
    mobile: "Weekly trend",
    category: "analytics",
    icon: <LineChart className="h-4 w-4 mr-2" />,
    description: "Daily creation trend",
    expectedVisualization: "line",
    complexity: "moderate"
  },
  {
    desktop: "Compare prompts with and without system messages",
    mobile: "System msg stats",
    category: "analytics",
    icon: <BarChart className="h-4 w-4 mr-2" />,
    description: "System message distribution",
    expectedVisualization: "bar",
    complexity: "moderate"
  },
  {
    desktop: "List prompts grouped by category with counts",
    mobile: "Category groups",
    category: "grouping",
    icon: <Grid className="h-4 w-4 mr-2" />,
    description: "Categorized listing",
    expectedVisualization: "table",
    complexity: "moderate"
  },
  {
    desktop: "Find prompts without system messages",
    mobile: "No system msg",
    category: "filters",
    icon: <FilterX className="h-4 w-4 mr-2" />,
    description: "Missing system messages",
    expectedVisualization: "table",
    complexity: "simple"
  },
  {
    desktop: "Show daily prompt creation counts",
    mobile: "Daily stats",
    category: "analytics",
    icon: <Calculator className="h-4 w-4 mr-2" />,
    description: "Creation frequency",
    expectedVisualization: "line",
    complexity: "complex"
  },
  {
    desktop: "List categories with their latest prompts",
    mobile: "Latest by cat.",
    category: "grouping",
    icon: <ListFilter className="h-4 w-4 mr-2" />,
    description: "Recent by category",
    expectedVisualization: "table",
    complexity: "complex"
  }
];

interface SuggestedQueriesProps {
  handleSuggestionClick: (suggestion: string) => void;
}

export const SuggestedQueries = ({
  handleSuggestionClick,
}: SuggestedQueriesProps) => {
  return (
    <motion.div
      key="suggestions"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      layout
      className="h-full overflow-y-auto"
    >
      <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
        Try these queries:
      </h2>
      <div className="flex flex-wrap gap-2">
        {SUGGESTION_QUERIES.map((suggestion, index) => (
          <motion.div
            key={`query-${index}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.2,
              delay: index * 0.05,
              ease: "easeOut"
            }}
          >
            <Button
              className={`
                group relative
                ${index > 5 ? "hidden sm:inline-flex" : ""}
                hover:bg-primary/10
                transition-all
                duration-200
                ${suggestion.complexity === 'complex' ? 'border-orange-200/50' : ''}
                ${suggestion.complexity === 'moderate' ? 'border-blue-200/50' : ''}
              `}
              type="button"
              variant="outline"
              onClick={() => handleSuggestionClick(suggestion.desktop)}
              title={`${suggestion.description} (${suggestion.complexity} query)`}
            >
              <span className="flex items-center">
                {suggestion.icon}
                <span className="sm:hidden">{suggestion.mobile}</span>
                <span className="hidden sm:inline">{suggestion.desktop}</span>
              </span>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};