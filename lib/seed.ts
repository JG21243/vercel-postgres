import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import "dotenv/config";

const prisma = new PrismaClient();

// Add TypeScript interface for CSV row
interface LegalPromptRow {
  name: string;
  prompt: string;
  category: string;
  createdAt: string;
  systemMessage?: string;
  [key: string]: string | undefined; // Allow for additional columns
}

function parseDate(dateString: string): Date {
  try {
    // First try the existing format (DD/MM/YYYY)
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) return date;
    }

    // Try parsing as MM/DD/YYYY
    const usParts = dateString.split('/');
    if (usParts.length === 3) {
      const month = usParts[0].padStart(2, '0');
      const day = usParts[1].padStart(2, '0');
      const year = usParts[2].length === 2 ? `20${usParts[2]}` : usParts[2];
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) return date;
    }

    // Try parsing as ISO format
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) return isoDate;

    throw new Error(`Unsupported date format: ${dateString}`);
  } catch (error) {
    console.warn(`Could not parse date: ${dateString}`);
    throw new Error(`Invalid date format: ${dateString}`);
  }
}

function normalizeColumnName(row: LegalPromptRow, columnName: string): string {
  const variations = [
    columnName,
    columnName.charAt(0).toUpperCase() + columnName.slice(1),
    columnName.split(/(?=[A-Z])/).join(' '),
    // Add common CSV column variations
    columnName.toLowerCase(),
    columnName.toUpperCase(),
    columnName.split(/(?=[A-Z])/).join('_').toLowerCase() // camelCase to snake_case
  ];
  
  for (const variation of variations) {
    if (row[variation]) {
      const value = row[variation]?.trim();
      if (value) return value;
    }
  }
  return '';
}

async function readCsvFile(filePath: string): Promise<LegalPromptRow[]> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found at: ${filePath}`);
  }

  return new Promise((resolve, reject) => {
    const results: LegalPromptRow[] = [];
    fs.createReadStream(filePath)
      .pipe(csv({
        skipLines: 0,
        headers: true,
        mapHeaders: ({ header }) => header.trim()
      }))
      .on('data', (data) => results.push(data as LegalPromptRow))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function processRow(row: LegalPromptRow, rowIndex: number): Promise<boolean> {
  try {
    const createdAtValue = normalizeColumnName(row, 'createdAt');
    const systemMessage = normalizeColumnName(row, 'systemMessage');
    const name = normalizeColumnName(row, 'name');
    const prompt = normalizeColumnName(row, 'prompt');
    const category = normalizeColumnName(row, 'category');

    // Validate required fields
    const missingFields = {
      name: !name,
      prompt: !prompt,
      category: !category,
      createdAt: !createdAtValue
    };

    if (Object.values(missingFields).some(missing => missing)) {
      throw new Error(`Missing required fields: ${JSON.stringify(missingFields)}`);
    }

    const formattedDate = parseDate(createdAtValue);
    
    console.log(`Processing row ${rowIndex + 1}: ${name}`);
    
    await prisma.legalprompt.create({
      data: {
        name,
        prompt,
        category,
        createdAt: formattedDate,
        systemMessage: systemMessage || null,
      },
    });
    
    console.log(`Successfully seeded row ${rowIndex + 1}: ${name}`);
    return true;
  } catch (error) {
    console.error(`Error seeding row ${rowIndex + 1}:`, {
      row: JSON.stringify(row),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

async function seed() {
  const csvFilePath = path.join('/workspaces/natural-language-postgres', 'legal_prompts.csv');
  console.log(`Reading CSV file from: ${csvFilePath}`);
  
  try {
    const results = await readCsvFile(csvFilePath);
    console.log(`Parsed ${results.length} rows from CSV file`);
    
    const processPromises = results.map((row, index) => processRow(row, index));
    const outcomes = await Promise.all(processPromises);
    
    const successCount = outcomes.filter(success => success).length;
    const errorCount = outcomes.filter(success => !success).length;

    console.log(`
Seeding completed:
  Total rows: ${results.length}
  Successful: ${successCount}
  Failed: ${errorCount}
    `);
  } catch (error) {
    console.error('Fatal error during seeding:', error);
    throw error;
  }
}

async function main() {
  try {
    await seed();
  } catch (e) {
    console.error('Error during seeding process:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();