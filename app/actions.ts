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

export const generateQuery = async (input: string) => {
  "use server";
  debug("Generating query for input:", input);
  
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      system: `You are a SQL (postgres) and data visualization expert. Your job is to help the user write a SQL query to retrieve the data they need.

      IMPORTANT: Column names are case-sensitive. Always use exact casing:
      - createdAt (not createdat or created_at)
      - systemMessage (not systemmessage)
      
      Table schema:
      legalprompt (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        prompt TEXT NOT NULL,
        category VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
        systemMessage TEXT
      );

      Only retrieval queries are allowed.
      [Previous system instructions...]`,
      prompt: `Generate the query necessary to retrieve the data the user wants: ${input}`,
      schema: z.object({
        query: z.string(),
      }),
    });

    // Log raw query before processing
    debug("Raw query from AI:", result.object.query);
    
    // Enhanced post-processing for case-sensitive accuracy
    let generatedQuery = result.object.query;
    
    // Fix common case variations
    const columnMappings = {
      'createdat': 'createdAt',
      'created_at': 'createdAt', 
      'systemmessage': 'systemMessage',
      'system_message': 'systemMessage'
    };

    // Log each transformation
    Object.entries(columnMappings).forEach(([incorrect, correct]) => {
      const regex = new RegExp(incorrect, 'gi');
      const beforeReplace = generatedQuery;
      generatedQuery = generatedQuery.replace(regex, correct);
      if (beforeReplace !== generatedQuery) {
        debug(`Replaced "${incorrect}" with "${correct}"`);
      }
    });

    // Validate final query contains correct column names
    const requiredColumns = ['createdAt', 'systemMessage'];
    const lowerCaseQuery = generatedQuery.toLowerCase();
    requiredColumns.forEach(column => {
      if (lowerCaseQuery.includes(column.toLowerCase()) && !generatedQuery.includes(column)) {
        debug(`Warning: Query may have incorrect casing for column "${column}"`);
      }
    });

    debug("Final processed query:", generatedQuery);
    return generatedQuery;
  } catch (e) {
    console.error("Error generating query:", e);
    throw new Error("Failed to generate query");
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

  let data: any;
  try {
    // Log exact query being sent to database
    debug("Executing SQL query:", { 
      query,
      timestamp: new Date().toISOString()
    });

    data = await sql.query(query);
    debug("Query executed successfully", {
      rowCount: data.rowCount,
      fields: data.fields?.map((f: { name: string }) => f.name)
    });
  } catch (e: any) {
    if (e.message.includes('relation "legalprompt" does not exist')) {
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
      
      // Retry original query
      debug("Retrying original query after table creation");
      data = await sql.query(query);
      debug("Query executed successfully after table creation");
    } else {
      console.error("Error executing query:", {
        error: e,
        query,
        message: e.message,
        code: e.code,
        detail: e.detail,
        hint: e.hint
      });
      throw e;
    }
  }

  return data.rows as Result[];
};

// [Rest of the file remains unchanged...]

export const explainQuery = async (input: string, sqlQuery: string) => {
  "use server";
  console.log("Explaining query for input:", input);
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
      createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
      systemMessage TEXT
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
    console.log("Generated explanation:", result.object);
    return result.object;
  } catch (e) {
    console.error("Error generating query explanation:", e);
    throw new Error("Failed to generate query explanation");
  }
};

export const generateChartConfig = async (
  results: Result[],
  userQuery: string,
) => {
  "use server";
  console.log("Generating chart config for user query:", userQuery);
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
    console.log("Generated chart config:", updatedConfig);
    return { config: updatedConfig };
  } catch (e) {
    if (e instanceof Error) {
      console.error("Error generating chart config:", e.message);
    } else {
      console.error("Error generating chart config:", e);
    }
    throw new Error("Failed to generate chart suggestion");
  }
};