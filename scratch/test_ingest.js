import { ingestionAgent } from '../agents/ingestionAgent.js';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

const envPath = './.env';
dotenv.config({ path: envPath });

async function test() {
  try {
    console.log('Running ingestionAgent for https://kahfe.square.site/ ...');
    const result = await ingestionAgent('https://kahfe.square.site/', ['instagram.com/kahfecoffee']);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
