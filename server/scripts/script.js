import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';
import { HttpsProxyAgent } from 'https-proxy-agent'; // Correctement importer HttpsProxyAgent
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config();
puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, 'datadome_cache.json');
const COOKIE_TTL_MS = 1000 * 60 * 10; // 10 minutes

async function getDatadomeFromBrowser() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });

    const [page] = await browser.pages();

    console.log('⏳ Ouverture de la page AllTrails...');
    try {
      await page.goto('https://www.alltrails.com', {
        waitUntil: 'domcontentloaded', // Moins strict que 'networkidle0'
        timeout: 90000,                // 90 secondes
      });
    } catch (navErr) {
      throw new Error(`Échec du chargement de la page AllTrails : ${navErr.message}`);
    }

    // Simuler un comportement utilisateur
    await page.mouse.move(200, 200);
    await page.mouse.wheel({ deltaY: 300 });
    await page.keyboard.press('ArrowDown');
    await new Promise(r => setTimeout(r, 7000));
    
    console.log('⌛ Attente du cookie datadome...');
    await page.waitForFunction(() => {
      return document.cookie.includes('datadome=');
    }, { timeout: 10000 });

    const cookies = await page.cookies();
    const datadome = cookies.find((c) => c.name === 'datadome');
    if (!datadome) throw new Error('Cookie datadome non trouvé');

    const cookieValue = `${datadome.name}=${datadome.value}`;
    await fs.writeFile(
      CACHE_FILE,
      JSON.stringify({ value: cookieValue, createdAt: Date.now() }, null, 2)
    );

    console.log('✅ Cookie datadome récupéré et enregistré');
    return cookieValue;

  } catch (error) {
    console.error('❌ Erreur dans getDatadomeFromBrowser:', error.message);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}


async function getCachedDatadomeCookie() {
  try {
    const content = await fs.readFile(CACHE_FILE, 'utf-8');
    const { value, createdAt } = JSON.parse(content);
    const age = Date.now() - createdAt;
    if (age < COOKIE_TTL_MS) return value;
    return await getDatadomeFromBrowser();
  } catch (err) {
    return await getDatadomeFromBrowser();
  }
}

async function fetchTrailsFromAlgoliaAPI(coordinates, radius = 5000, limit = 50) {
  const { lat, lng } = coordinates;

  const payload = {
    facets: ["type", "difficulty_rating"],
    clickAnalytics: true,
    attributesToRetrieve: [
      "ID",
      "popularity",
      "length",
      "elevation_gain",
      "avg_rating",
      "duration_minutes",
      "name",
      "description",
      "_geoloc"
    ],
    hitsPerPage: limit,
    facetFilters: [["type:trail"]],
    aroundLatLng: `${lat}, ${lng}`,
    aroundRadius: radius,
    attributesToHighlight: ["name"],
    responseFields: ["hits", "hitsPerPage", "nbHits"]
  };

  const response = await axios.post(
    'https://9ioacg5nhe-3.algolianet.com/1/indexes/alltrails_primary_fr-FR/query',
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID
      }
    }
  );

  const allHits = response.data.hits;
  const trailsOnly = allHits.filter(hit => hit.objectID && hit.objectID.startsWith('trail-'));
  
  console.log(`🔍 Filtrage trails dans script.js: ${allHits.length} → ${trailsOnly.length} résultats (objectID commence par "trail-")`);

  return trailsOnly.sort((a, b) => b.popularity - a.popularity).slice(0, 10);
}

async function fetchTrailDetails(trailId) {
  const datadomeCookie = await getCachedDatadomeCookie();

  // const proxyUrl = 'http://brd-customer-hl_2aee87b2-zone-residential_proxy1:d2pq0oph9g6r@brd.superproxy.io:33335';  // Remplacez par votre proxy : 'http://myUser:myPass@123.456.789.101:8080'
  const proxyUrl = 'http://brd-customer-hl_2aee87b2-zone-web_unlocker1:ho9etd4nazlg@brd.superproxy.io:33335';  // Remplacez par votre proxy : 'http://myUser:myPass@123.456.789.101:8080'
  const agent = new HttpsProxyAgent(proxyUrl);

  const headers = {
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'X-AT-CALLER': 'Mugen',
    'X-AT-KEY': process.env.ALLTRAILS_API_KEY,
    'X-CSRF-TOKEN': 'undefined',
    'X-Language-Locale': 'fr-FR',
    'Origin': 'https://www.alltrails.com',
    'Host': 'www.alltrails.com',
    'Cookie': datadomeCookie,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'TE': 'trailers',
  };

  try {
    const response = await axios.get(
      `https://www.alltrails.com/api/alltrails/trails/${trailId}`,
      {
        headers,
        httpsAgent: agent,  // Ajout du proxy avec httpsAgent
      }
    );

    const trail = response.data.trails[0];
    return {
      id: trail.id,
      name: trail.name,
      overview: trail.overview,
      routeType: trail.routeType?.name || 'Type de route inconnu',
      popularity: trail.popularity,
      location: trail.location,
    };
  } catch (err) {
    console.error('Erreur lors de la récupération des détails du trail:', err.message);
    throw err;
  }
}

// Test simple
(async () => {
  try {
    const coordinates = { lat: 48.8584, lng: 2.2945 }; // Exemple : Paris
    const trails = await fetchTrailsFromAlgoliaAPI(coordinates);
    console.log('Top trails:', trails.map(t => t.name));

    const details = await fetchTrailDetails(trails[0].ID);
    console.log('Détails du trail:', details);

  } catch (err) {
    console.error('Erreur pendant l\'exécution du script:', err);
  }
})();
