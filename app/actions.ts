// app/actions.ts
"use server";
import { Config } from '@/lib/types';
import { configSchema, explanationsSchema, Result } from "@/lib/types";
import { openai } from "@ai-sdk/openai";
import { sql } from "@vercel/postgres";
import { generateObject } from "ai";
import { z } from "zod";

// Debug logging helper
const debug = (message: string, data?: any) => {
  console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// Type guard for PostgreSQL errors
const isPostgresError = (error: any): error is { code: string; message: string; detail?: string } => {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
};

// Centralized PostgreSQL error handling
const handlePostgresError = (error: any, query: string) => {
  if (isPostgresError(error)) {
    switch (error.code) {
      case '42601': // Syntax error
        debug("SQL Syntax Error:", {
          query,
          message: error.message,
          detail: error.detail || 'No additional details'
        });
        throw new Error("Invalid SQL syntax. Please try rephrasing your request.");
      
      case '42703': // Undefined column
        debug("Column Error:", {
          query,
          message: error.message,
          detail: error.detail || 'No additional details'
        });
        throw new Error("Invalid column reference. Please check column names.");
      
      case '42P01': // Undefined table
        return null; // Let the table creation logic handle this
      
      default:
        debug("Unexpected Postgres Error:", {
          code: error.code,
          query,
          message: error.message,
          detail: error.detail || 'No additional details'
        });
        throw error;
    }
  }
  throw error;
};

// Helper function to properly quote column identifiers
const fixColumnQuoting = (query: string): string => {
  // First fix any double-quoted identifiers
  let fixedQuery = query.replace(/""+([^"]+)""+/g, '"$1"');
  
  // Then ensure case-sensitive columns are properly quoted
  const sensitiveColumns = ['createdAt', 'systemMessage'];
  sensitiveColumns.forEach(column => {
    // Don't replace if it's already properly quoted
    const regex = new RegExp(`(?<!["'])\\b${column}\\b(?!["'])`, 'g');
    fixedQuery = fixedQuery.replace(regex, `"${column}"`);
  });
  
  return fixedQuery;
};

export const generateQuery = async (input: string) => {
  "use server";
  debug("Generating query for input:", input);
  
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      system: `You are a SQL (postgres) and data visualization expert. Your job is to help the user write a SQL query to retrieve the data they need.

      IMPORTANT: Case-sensitive column names must be properly quoted:
      - Use "createdAt" (with double quotes, not createdat or created_at)
      - Use "systemMessage" (with double quotes, not systemmessage)
      
      Table schema:
      legalprompt (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        prompt TEXT NOT NULL,
        category VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "systemMessage" TEXT
      );

      Important: Always use proper double quotes (") for case-sensitive column names, never use multiple quotes ("").`,
      prompt: input,
      schema: z.object({
        query: z.string(),
      }),
    });

    let generatedQuery = result.object.query;
    
    // Updated column mappings with proper quotes
    const columnMappings = {
      'createdat': '"createdAt"',
      'created_at': '"createdAt"', 
      'systemmessage': '"systemMessage"',
      'system_message': '"systemMessage"',
      '""createdAt""': '"createdAt"',
      '""systemMessage""': '"systemMessage"',
      '"\'createdAt\'"': '"createdAt"',
      '"\'systemMessage\'"': '"systemMessage"'
    };

    // Fix case and add quotes
    Object.entries(columnMappings).forEach(([incorrect, correct]) => {
      const regex = new RegExp(incorrect, 'gi');
      generatedQuery = generatedQuery.replace(regex, correct);
    });

    // Apply final fixes to ensure proper quoting
    generatedQuery = fixColumnQuoting(generatedQuery);

    debug("Raw query from AI:", result.object.query);
    debug("Final processed query:", generatedQuery);
    return generatedQuery;
  } catch (e) {
    debug("Error generating query:", { error: e });
    throw new Error("Failed to generate query. Please try rephrasing your request.");
  }
};

export const getLegalPrompts = async (query: string) => {
  "use server";
  debug("Executing query:", query);

  // Enhanced query validation
  const queryValidation = {
    isSelect: query.trim().toLowerCase().startsWith("select"),
    hasDrop: query.trim().toLowerCase().includes("drop"),
    hasDelete: query.trim().toLowerCase().includes("delete"),
    hasInsert: query.trim().toLowerCase().includes("insert")
  };

  debug("Query validation results:", queryValidation);

  if (!queryValidation.isSelect || queryValidation.hasDrop || 
      queryValidation.hasDelete || queryValidation.hasInsert) {
    throw new Error("Only SELECT queries are allowed");
  }

  // Ensure proper quoting before execution
  const sanitizedQuery = fixColumnQuoting(query);
  debug("Sanitized query:", sanitizedQuery);

  let data: any;
  try {
    // Log exact query being sent to database
    debug("Executing SQL query:", { 
      query: sanitizedQuery,
      timestamp: new Date().toISOString()
    });

    data = await sql.query(sanitizedQuery);
    debug("Query executed successfully", {
      rowCount: data.rowCount,
      fields: data.fields?.map((f: { name: string }) => f.name)
    });
  } catch (e: any) {
    const result = handlePostgresError(e, query);
    if (result === null) {
      debug("Table does not exist, creating and seeding");
      
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
      
      debug("Creating table with query:", createTableQuery);
      await sql.query(createTableQuery);

      const seedQuery = `
        INSERT INTO legalprompt (name, prompt, category, "systemMessage") VALUES
        ('Prompt 1', 'This is the first prompt', 'Category 1', 'System message 1'),
        ('Prompt 2', 'This is the second prompt', 'Category 2', 'System message 2'),
        ('Prompt 3', 'This is the third prompt', 'Category 3', NULL);
      `;
      
      debug("Seeding table with query:", seedQuery);
      await sql.query(seedQuery);
      
      try {
        // Retry original query
        debug("Retrying original query after table creation");
        data = await sql.query(sanitizedQuery);
        debug("Query executed successfully after table creation");
      } catch (retryError) {
        debug("Error executing query after table creation:", {
          error: retryError,
          query: sanitizedQuery
        });
        throw handlePostgresError(retryError, sanitizedQuery);
      }
    }
  }

  return data.rows as Result[];
};

export const explainQuery = async (input: string, sqlQuery: string) => {
  "use server";
  debug("Explaining query for input:", input);
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        explanations: explanationsSchema,
      }),
      system: `You are a SQL (postgres) expert. Your job is to explain to the user the SQL query you wrote to retrieve the data they asked for. The table schema is as follows:
    legalprompt (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      prompt TEXT NOT NULL,
      category VARCHAR(255) NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "systemMessage" TEXT
    );

    When you explain you must take a section of the query, and then explain it. Each "section" should be unique. So in a query like: "SELECT * FROM legalprompt limit 20", the sections could be "SELECT *", "FROM legalprompt", "LIMIT 20".
    If a section doesn't have any explanation, include it, but leave the explanation empty.
    `,
      prompt: `Explain the SQL query you generated to retrieve the data the user wanted. Assume the user is not an expert in SQL. Break down the query into steps. Be concise.

      User Query:
      ${input}

      Generated SQL Query:
      ${sqlQuery}`,
    });
    debug("Generated explanation:", result.object);
    return result.object;
  } catch (e) {
    debug("Error generating query explanation:", { error: e });
    throw new Error("Failed to generate query explanation");
  }
};

export const generateChartConfig = async (
  results: Result[],
  userQuery: string,
) => {
  "use server";
  debug("Generating chart config for user query:", userQuery);
  const system = `You are a data visualization expert. `;

  try {
    const { object: config } = await generateObject({
      model: openai("gpt-4o"),
      system,
      prompt: `Given the following data from a SQL query result, generate the chart config that best visualizes the data and answers the user's query.
      For multiple groups use multi-lines.

      Here is an example complete config:
      export const chartConfig = {
        type: "pie",
        xKey: "month",
        yKeys: ["sales", "profit", "expenses"],
        colors: {
          sales: "#4CAF50",    // Green for sales
          profit: "#2196F3",   // Blue for profit
          expenses: "#F44336"  // Red for expenses
        },
        legend: true
      }

      User Query:
      ${userQuery}

      Data:
      ${JSON.stringify(results, null, 2)}`,
      schema: configSchema,
    });

    const colors: Record<string, string> = {};
    config.yKeys.forEach((key, index) => {
      colors[key] = `hsl(var(--chart-${index + 1}))`;
    });

    const updatedConfig: Config = { ...config, colors };
    debug("Generated chart config:", updatedConfig);
    return { config: updatedConfig };
  } catch (e) {
    debug("Error generating chart config:", { 
      error: e instanceof Error ? e.message : e 
    });
    throw new Error("Failed to generate chart suggestion");
  }
};