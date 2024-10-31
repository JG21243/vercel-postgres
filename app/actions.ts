// app/actions.ts
"use server";
import { Config } from '@/lib/types';
import { configSchema, explanationsSchema, Result } from "@/lib/types";
import { openai } from "@ai-sdk/openai";
import { sql } from "@vercel/postgres";
import { generateObject } from "ai";
import { z } from "zod";

export const generateQuery = async (input: string) => {
  "use server";
  console.log("Generating query for input:", input);
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      system: `You are a SQL (postgres) and data visualization expert. Your job is to help the user write a SQL query to retrieve the data they need. The table schema is as follows:

      legalPrompt (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      prompt TEXT NOT NULL,
      category VARCHAR(255) NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
      systemMessage TEXT
    );

    Only retrieval queries are allowed.

    For things like category, name and other string fields, use the ILIKE operator and convert both the search term and the field to lowercase using LOWER() function. For example: LOWER(category) ILIKE LOWER('%search_term%').

    Note: systemMessage is an optional field and may be null.
    When answering questions about a specific field, ensure you are selecting the identifying column (ie. what is the prompt for a specific name would select name and prompt).

    If the user asks for a rate, return it as a decimal. For example, 0.1 would be 10%.

    If the user asks for 'over time' data, return by year.

    EVERY QUERY SHOULD RETURN QUANTITATIVE DATA THAT CAN BE PLOTTED ON A CHART! There should always be at least two columns. If the user asks for a single column, return the column and the count of the column. If the user asks for a rate, return the rate as a decimal. For example, 0.1 would be 10%.
    `,
      prompt: `Generate the query necessary to retrieve the data the user wants: ${input}`,
      schema: z.object({
        query: z.string(),
      }),
    });
    console.log("Generated query:", result.object.query);
    return result.object.query;
  } catch (e) {
    console.error("Error generating query:", e);
    throw new Error("Failed to generate query");
  }
};

export const getLegalPrompts = async (query: string) => {
  "use server";
  console.log("Executing query:", query);
  if (
    !query.trim().toLowerCase().startsWith("select") ||
    query.trim().toLowerCase().includes("drop") ||
    query.trim().toLowerCase().includes("delete") ||
    query.trim().toLowerCase().includes("insert")
  ) {
    throw new Error("Only SELECT queries are allowed");
  }

  let data: any;
  try {
    data = await sql.query(query);
    console.log("Query executed successfully:", data);
  } catch (e: any) {
    if (e.message.includes('relation "legalprompt" does not exist')) {
      console.log(
        "Table does not exist, creating and seeding it with dummy data now...",
      );
      await sql.query(`
        CREATE TABLE legalprompt (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          prompt TEXT NOT NULL,
          category VARCHAR(255) NOT NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
          systemMessage TEXT
        );
        INSERT INTO legalprompt (name, prompt, category, systemMessage) VALUES
        ('Prompt 1', 'This is the first prompt', 'Category 1', 'System message 1'),
        ('Prompt 2', 'This is the second prompt', 'Category 2', 'System message 2'),
        ('Prompt 3', 'This is the third prompt', 'Category 3', NULL);
      `);
      data = await sql.query(query);
      console.log("Table created and seeded successfully:", data);
    } else {
      console.error("Error executing query:", e);
      throw e;
    }
  }

  return data.rows as Result[];
};

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