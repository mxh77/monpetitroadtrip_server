import axios from 'axios';

const API_KEY = "CAP-2DBDEAE8E6C8674A29BE3A388FBE1F0D1D5BCD69ADA32F430B1423EEDBF4E401";
if (!API_KEY) {
  console.error('❌ La variable CAPSOLVER_API_KEY n’est pas définie');
  process.exit(1);
}

// const PROXY = 'http://brd-customer-hl_2aee87b2-zone-web_unlocker1:ho9etd4nazlg@brd.superproxy.io:33335';
// const PROXY = 'brd.superproxy.io:33335:brd-customer-hl_2aee87b2-zone-web_unlocker1:ho9etd4nazlg'
const PROXY = 'brd.superproxy.io:33335:brd-customer-hl_2aee87b2-zone-residential_proxy1:d2pq0oph9g6r'
async function testCapsolverAPI() {
    try {
      // 1) Création de la tâche avec proxy
      const { data: createData } = await axios.post(
        'https://api.capsolver.com/createTask',
        {
          clientKey: API_KEY,
          task: {
            type:      'DatadomeSliderTask',                                
            websiteURL:'https://www.alltrails.com/fr/randonnee/canada/alberta/lundbreck-falls-trail',                        
            captchaUrl:'https://geo.captcha-delivery.com/captcha/',        
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            proxy: PROXY                                               // <-- obligatoire :contentReference[oaicite:0]{index=0}
          }
        }
      );
  
      if (!createData.taskId) {
        console.error('❌ Échec de createTask :', createData);
        return;
      }
      console.log('✅ taskId obtenu :', createData.taskId);
  
      // 2) Polling du résultat
      const start = Date.now();
      while (true) {
        if (Date.now() - start > 2 * 60 * 1000) { 
          console.error('❌ Timeout sur getTaskResult');
          break;
        }
        await new Promise(r => setTimeout(r, 1000));
        const { data: resultData } = await axios.post(
          'https://api.capsolver.com/getTaskResult',
          { clientKey: API_KEY, taskId: createData.taskId }
        );
        if (resultData.status === 'ready') {
          console.log('🎉 Cookie Datadome reçu :', resultData.solution.cookie);
          break;
        }
        if (resultData.status === 'failed' || resultData.errorId) {
          console.error('❌ Erreur lors de la résolution :', resultData);
          break;
        }
      }
    } catch (err) {
      console.error('❌ Erreur Capsolver API :', err.response?.data || err.message);
    }
  }
  
  testCapsolverAPI();