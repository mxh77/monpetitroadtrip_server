import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import chromium from 'chrome-aws-lambda';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, 'datadome_cache.json');
const COOKIE_TTL_MS = 1000 * 60 * 10; // 10 minutes

async function getDatadomeFromBrowser() {
  const isVercel = !!process.env.VERCEL; // Détecter si on est sur Vercel
  let browser;

  try {
    if (isVercel) {
      // Configuration pour Vercel
      browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
      });
    } else {
      // Configuration pour local
      browser = await puppeteer.launch({
        headless: true,
      });
    }

    const page = await browser.newPage();

    // Naviguer vers la page pour récupérer le cookie DataDome
    await page.goto('https://www.alltrails.com', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    await new Promise((resolve) => setTimeout(resolve, 3000)); // Attendre que DataDome s'exécute

    const cookies = await page.cookies();
    await browser.close();

    const datadome = cookies.find((c) => c.name === 'datadome');
    if (!datadome) throw new Error('Cookie datadome non trouvé');

    const cookieValue = `${datadome.name}=${datadome.value}`;

    // Sauvegarder le cookie dans le cache
    await fs.writeFile(
      CACHE_FILE,
      JSON.stringify({
        value: cookieValue,
        createdAt: Date.now(),
      }, null, 2)
    );

    return cookieValue;
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

async function getCachedDatadomeCookie() {
  try {
    const content = await fs.readFile(CACHE_FILE, 'utf-8');
    const { value, createdAt } = JSON.parse(content);

    const age = Date.now() - createdAt;
    if (age < COOKIE_TTL_MS) {
      return value; // Retourner le cookie si encore valide
    }

    // Cookie expiré → en récupérer un nouveau
    return await getDatadomeFromBrowser();
  } catch (err) {
    // Fichier manquant ou invalide → en récupérer un nouveau
    return await getDatadomeFromBrowser();
  }
}

export { getCachedDatadomeCookie };