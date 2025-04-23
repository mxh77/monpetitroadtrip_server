import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, 'datadome_cache.json');
const COOKIE_TTL_MS = 1000 * 2; // 10 secondes

async function getDatadomeFromBrowser() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto('https://www.alltrails.com', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  const cookies = await page.cookies();
  await browser.close();

  const datadome = cookies.find(c => c.name === 'datadome');
  if (!datadome) throw new Error('Cookie datadome non trouvé');

  const cookieValue = `${datadome.name}=${datadome.value}`;

  // Save to cache
  await fs.writeFile(CACHE_FILE, JSON.stringify({
    value: cookieValue,
    createdAt: Date.now()
  }, null, 2));

  return cookieValue;
}

async function getCachedDatadomeCookie() {
  try {
    const content = await fs.readFile(CACHE_FILE, 'utf-8');
    const { value, createdAt } = JSON.parse(content);

    const age = Date.now() - createdAt;
    if (age < COOKIE_TTL_MS) {
      return value;
    }

    // Cookie expiré → on en récupère un nouveau
    return await getDatadomeFromBrowser();
  } catch (err) {
    // Fichier manquant ou invalide → on en récupère un nouveau
    return await getDatadomeFromBrowser();
  }
}

export { getCachedDatadomeCookie };
