// app/actions.ts
"use server";

import { Config } from '@/lib/types';
import { configSchema, explanationsSchema, Result } from "@/lib/types";
import { openai } from "@ai-sdk/openai";
import { sql } from "@vercel/postgres";
import { generateObject } from "ai";
import { z } from "zod";

// Types
interface PostgresError extends Error {
  code: string;
  message: string;
  detail?: string;
}

interface QueryValidationResult {
  isValid: boolean;
  error?: string;
}

// Constants
const SENSITIVE_COLUMNS = ['createdAt', 'systemMessage'] as const;
const FORBIDDEN_KEYWORDS = ['drop', 'delete', 'insert', 'update', 'truncate', 'alter'] as const;
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Enhanced debug logging with trace ID and timing
const debug = (message: string, data?: any, traceId?: string) => {
  const timestamp = new Date().toISOString();
  console.log(
    `[DEBUG${traceId ? ` - ${traceId}` : ''}][${timestamp}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ''
  );
};

// Type guards
const isPostgresError = (error: unknown): error is PostgresError => {
  return error instanceof Error && 
         'code' in error && 
         typeof (error as any).code === 'string';
};

// SQL Sanitization and Validation
const sanitizeSQL = (query: string): string => {
  return query
    .replace(/--/g, '') // Remove SQL comments
    .replace(/;/g, '') // Remove semicolons
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .trim();
};

const fixColumnQuoting = (query: string): string => {
  let fixedQuery = query;
  
  // Remove malformed quotes
  fixedQuery = fixedQuery.replace(/"{2,}/g, '"');
  
  // Ensure case-sensitive columns are properly quoted
  SENSITIVE_COLUMNS.forEach(column => {
    const regex = new RegExp(`(?<!["'])\\b${column}\\b(?!["'])`, 'gi');
    fixedQuery = fixedQuery.replace(regex, `"${column}"`);
  });
  
  return fixedQuery;
};

const validateQuery = (query: string): QueryValidationResult => {
  const sanitized = query.toLowerCase().trim();
  
  if (!sanitized.startsWith('select')) {
    return { 
      isValid: false, 
      error: 'Only SELECT queries are allowed' 
    };
  }
  
  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (sanitized.includes(keyword)) {
      return { 
        isValid: false, 
        error: `Query contains forbidden keyword: ${keyword}` 
      };
    }
  }
  
  // Check for basic SQL injection patterns
  const suspicious = [
    '--',
    '/*',
    'union',
    'exec',
    'xp_',
    'waitfor'
  ];
  
  for (const pattern of suspicious) {
    if (sanitized.includes(pattern)) {
      return {
        isValid: false,
        error: 'Query contains suspicious patterns'
      };
    }
  }
  
  return { isValid: true };
};

// Error Handling
const handlePostgresError = (error: unknown, query: string): never => {
  if (!isPostgresError(error)) {
    throw new Error('Unknown database error occurred');
  }

  const errorMap: Record<string, string> = {
    '42601': 'Invalid SQL syntax. Please check your query.',
    '42703': 'Invalid column reference. Please verify column names.',
    '42P01': 'Table does not exist.',
    '23505': 'Duplicate key violation.',
    '23503': 'Foreign key violation.',
    '57014': 'Query cancelled due to timeout.',
    '53400': 'Out of memory.',
    '42883': 'Undefined function.',
    '42P02': 'Undefined parameter.',
    '23502': 'Not null violation.',
    '22001': 'String data right truncation.',
    '22003': 'Numeric value out of range.',
    '22007': 'Invalid datetime format.',
    '22P02': 'Invalid text representation.'
  };

  const errorMessage = errorMap[error.code] || 'An unexpected database error occurred';
  
  debug('Database Error:', {
    code: error.code,
    message: error.message,
    detail: error.detail,
    query
  });

  throw new Error(`${errorMessage}${error.detail ? `: ${error.detail}` : ''}`);
};

// Main Functions
export const generateQuery = async (input: string) => {
  const traceId = Math.random().toString(36).substring(7);
  debug("Generating query for input", { input }, traceId);
  
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      system: `You are a SQL (postgres) and data visualization expert. Generate safe, 
      efficient SQL queries following these rules:
      1. Always use proper double quotes (") for case-sensitive columns
      2. Never use multiple quotes ("")
      3. Only generate SELECT queries
      4. Properly handle NULL values
      5. Use appropriate date/time functions
      6. Include appropriate WHERE clauses for filtering
      
      Table schema:
      legalprompt (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        prompt TEXT NOT NULL,
        category VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "systemMessage" TEXT
      );`,
      prompt: input,
      schema: z.object({
        query: z.string(),
      }),
      temperature: 0.0, // Lower temperature for more consistent queries
    });

    let generatedQuery = result.object.query;
    debug("Raw query from AI", { query: generatedQuery }, traceId);
    
    // Sanitize and validate
    generatedQuery = sanitizeSQL(generatedQuery);
    const validation = validateQuery(generatedQuery);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid query generated');
    }
    
    // Fix column quoting
    generatedQuery = fixColumnQuoting(generatedQuery);
    debug("Final processed query", { query: generatedQuery }, traceId);
    
    return generatedQuery;
  } catch (e) {
    debug("Error generating query", { error: e }, traceId);
    throw new Error(
      e instanceof Error 
        ? `Failed to generate query: ${e.message}` 
        : "Failed to generate query"
    );
  }
};

export const getLegalPrompts = async (query: string) => {
  const traceId = Math.random().toString(36).substring(7);
  debug("Executing query", { query }, traceId);

  // Validate query
  const validation = validateQuery(query);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid query');
  }

  // Sanitize query
  const sanitizedQuery = fixColumnQuoting(sanitizeSQL(query));
  debug("Sanitized query", { query: sanitizedQuery }, traceId);

  try {
    const queryResult = await Promise.race([
      sql.query(sanitizedQuery),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), DEFAULT_TIMEOUT)
      )
    ]) as { rowCount: number; fields: { name: string }[]; rows: Result[] };

    debug("Query executed successfully", {
      rowCount: queryResult.rowCount,
      fields: queryResult.fields?.map(f => f.name)
    }, traceId);

    return queryResult.rows as Result[];
  } catch (error) {
    if ((error as Error).message === 'Query timeout') {
      throw new Error('Query timed out. Please simplify your query.');
    }

    if (isPostgresError(error) && error.code === '42P01') {
      debug("Table does not exist, creating and seeding", {}, traceId);
      
      try {
        await createAndSeedTable();
        const retryResult = await sql.query(sanitizedQuery);
        return retryResult.rows as Result[];
      } catch (retryError) {
        handlePostgresError(retryError, sanitizedQuery);
      }
    }

    handlePostgresError(error, sanitizedQuery);
  }
};

export const explainQuery = async (input: string, sqlQuery: string) => {
  const traceId = Math.random().toString(36).substring(7);
  debug("Explaining query", { input, sqlQuery }, traceId);

  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        explanations: explanationsSchema,
      }),
      system: `You are a SQL expert explaining queries to users. Break down complex
      SQL concepts into simple terms. Focus on:
      1. What data is being retrieved
      2. How the data is being filtered/sorted
      3. Any calculations or transformations
      4. The expected results`,
      prompt: `Explain this SQL query in simple terms:
      User Query: ${input}
      SQL Query: ${sqlQuery}`,
      temperature: 0.3,
    });

    debug("Generated explanation", result.object, traceId);
    return result.object;
  } catch (e) {
    debug("Error generating explanation", { error: e }, traceId);
    throw new Error("Failed to generate query explanation");
  }
};

export const generateChartConfig = async (
  results: Result[],
  userQuery: string,
): Promise<{ config: Config }> => {
  const traceId = Math.random().toString(36).substring(7);
  
  if (!results?.length) {
    throw new Error('No data available for visualization');
  }

  debug("Generating chart config", { 
    userQuery, 
    resultCount: results.length,
    sampleData: results.slice(0, 2)
  }, traceId);

  try {
    const { object: config } = await generateObject({
      model: openai("gpt-4o"),
      system: `You are a data visualization expert. Generate appropriate chart 
      configurations based on data structure and query intent. Consider:
      1. Data type of each column
      2. Number of data points
      3. Relationships between variables
      4. User's analytical goals`,
      prompt: `Create a chart configuration for:
      Sample Data: ${JSON.stringify(results.slice(0, 5))}
      User Query: ${userQuery}
      Total Rows: ${results.length}`,
      schema: configSchema,
      temperature: 0.2,
    });

    if (!config.yKeys?.length) {
      throw new Error('Invalid chart configuration: missing yKeys');
    }

    // Generate color scheme
    const colors: Record<string, string> = {};
    config.yKeys.forEach((key, index) => {
      colors[key] = `hsl(var(--chart-${(index % 12) + 1}))`;
    });

    const finalConfig: Config = { 
      ...config, 
      colors,
      legend: config.yKeys.length > 1 // Show legend for multiple series
    };

    debug("Generated chart config", finalConfig, traceId);
    return { config: finalConfig };
  } catch (error) {
    debug("Chart generation error", { error }, traceId);
    throw new Error(
      error instanceof Error 
        ? `Failed to generate chart: ${error.message}`
        : 'Failed to generate chart configuration'
    );
  }
};

// Helper function for table creation and seeding
async function createAndSeedTable() {
  const createTableQuery = `
    CREATE TABLE legalprompt (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      prompt TEXT NOT NULL,
      category VARCHAR(255) NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "systemMessage" TEXT
    );
  `;
  
  const seedQuery = `
    INSERT INTO legalprompt (name, prompt, category, "systemMessage")
    VALUES 
      ('Prompt 1', 'This is the first prompt', 'Category 1', 'System message 1'),
      ('Prompt 2', 'This is the second prompt', 'Category 2', 'System message 2'),
      ('Prompt 3', 'This is the third prompt', 'Category 3', NULL);
  `;
  
  await sql.query(createTableQuery);
  await sql.query(seedQuery);
}

const actions = {
  generateQuery,
  getLegalPrompts,
  explainQuery,
  generateChartConfig
};

export default actions;