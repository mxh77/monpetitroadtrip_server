// fichier fetchAllTrails.js
import cloudscraper from 'cloudscraper';

(async () => {
  try {
    const html = await cloudscraper.get('https://www.alltrails.com/fr/explore?ref=header&b_br_lat=49.78371593436205&b_br_lng=-113.10531474514814&b_tl_lat=50.46838151883006&b_tl_lng=-114.10466736155692');
    console.log(html);  // votre contenu HTML
  } catch (err) {
    console.error('Erreur de récupération :', err);
  }
})();