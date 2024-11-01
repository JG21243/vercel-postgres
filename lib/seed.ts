import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import "dotenv/config";

const prisma = new PrismaClient();

function parseDate(dateString: string): Date {
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return new Date(`${year}-${month}-${day}`);
  }
  console.warn(`Could not parse date: ${dateString}`);
  throw new Error(`Invalid date format: ${dateString}`);
}

async function seed() {
  const results: any[] = [];
  const csvFilePath = path.join('/workspaces/natural-language-postgres', 'legal_prompts.csv');

  console.log(`Reading CSV file from: ${csvFilePath}`);

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Parsed ${results.length} rows from CSV file`);

  for (const row of results) {
    try {
      // Enhanced defensive column name handling
      const createdAtValue = row['createdAt'] || row['CreatedAt'] || row['Created At'];
      const systemMessage = row['systemMessage'] || row['SystemMessage'] || row['System Message'];
      
      if (!createdAtValue) {
        console.warn('Row data:', row);
        throw new Error('Missing createdAt value');
      }

      const formattedDate = parseDate(createdAtValue);
      console.log(`Processing row: ${row.Name}`);

      await prisma.legalprompt.create({
        data: {
          name: row.Name,
          prompt: row.Prompt,
          category: row.Category,
          createdAt: formattedDate,
          systemMessage: systemMessage,
        },
      });

      console.log(`Successfully seeded row: ${row.Name}`);
    } catch (error) {
      console.error(`Error seeding row:`, {
        row: JSON.stringify(row),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Continue with next row instead of failing entire process
    }
  }

  console.log(`Seeded ${results.length} legal prompts`);
}

seed()
  .catch((e) => {
    console.error('Error during seeding process:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });