import { sql } from '@vercel/postgres';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import "dotenv/config"

function parseDate(dateString: string): string {
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  console.warn(`Could not parse date: ${dateString}`);
  throw Error();
}

export async function seed() {
  const createTable = await sql`
    CREATE TABLE IF NOT EXISTS LegalPrompt (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      prompt TEXT NOT NULL,
      category VARCHAR(255) NOT NULL,
      createdAt TIMESTAMP DEFAULT NOW(),
      systemMessage TEXT
    );
  `;

  console.log(`Created "LegalPrompt" table`);

  const results: any[] = [];
  const csvFilePath = path.join(process.cwd(), 'legal_prompts.csv');

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  for (const row of results) {
    const formattedDate = parseDate(row['Created At']);

    await sql`
      INSERT INTO LegalPrompt (name, prompt, category, createdAt, systemMessage)
      VALUES (
        ${row.Name},
        ${row.Prompt},
        ${row.Category},
        ${formattedDate},
        ${row['System Message']}
      )
      ON CONFLICT (id) DO NOTHING;
    `;
  }

  console.log(`Seeded ${results.length} legal prompts`);

  return {
    createTable,
    legalPrompts: results,
  };
}

seed().catch(console.error);