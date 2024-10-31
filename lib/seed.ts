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
  throw Error();
}

async function seed() {
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

    await prisma.legalPrompt.create({
      data: {
        name: row.Name,
        prompt: row.Prompt,
        category: row.Category,
        createdAt: formattedDate,
        systemMessage: row['System Message'],
      },
    });
  }

  console.log(`Seeded ${results.length} legal prompts`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });