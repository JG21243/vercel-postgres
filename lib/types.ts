import { z } from "zod";

// Represents a legal prompt with various attributes
export interface LegalPrompt {
  id: number;          // Unique identifier for the prompt
  name: string;        // Name of the prompt
  prompt: string;      // The actual prompt text
  category: string;    // Category to which the prompt belongs
  createdAt: Date;     // Date when the prompt was created
  systemMessage?: string; // Optional system message associated with the prompt
}

// Represents data for creating or updating a prompt
export interface PromptData {
  name: string;        // Name of the prompt
  prompt: string;      // The actual prompt text
  category: string;    // Category to which the prompt belongs
  createdAt?: Date;    // Optional date when the prompt was created
  systemMessage?: string; // Optional system message associated with the prompt
}

// Represents pagination information
export interface PaginationInfo {
  total: number;       // Total number of items
  page: number;        // Current page number
  limit: number;       // Number of items per page
  totalPages: number;  // Total number of pages
}

// Represents a generic API response
export interface ApiResponse<T> {
  data: T;             // Data returned by the API
  error?: string;      // Optional error message
  message?: string;    // Optional additional message
}

// Represents the response for prompts with pagination
export interface PromptsResponse {
  prompts: LegalPrompt[];  // Array of legal prompts
  pagination: PaginationInfo;  // Pagination information
}

// Represents a generic result type
export type Result = Record<string, string | number>;

// Schema for explaining sections of a query
export const explanationSchema = z.object({
  section: z.string(),
  explanation: z.string(),
});
export const explanationsSchema = z.array(explanationSchema);

// Define and export the QueryExplanation type
export type QueryExplanation = z.infer<typeof explanationSchema>;

// Schema for chart configuration
export const configSchema = z.object({
  type: z.string(),
  xKey: z.string(),
  yKeys: z.array(z.string()),
  colors: z.record(z.string(), z.string()).optional(),
  legend: z.boolean().optional(),
  multipleLines: z.boolean().optional(), // Add this line
  measurementColumn: z.string().optional(), // Add this line
});

// Define and export the Config type
export type Config = z.infer<typeof configSchema>;