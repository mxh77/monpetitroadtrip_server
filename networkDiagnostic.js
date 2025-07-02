/**
 * Script de diagnostic réseau pour vérifier la connectivité front/back
 */

import express from 'express';

// Test simple d'un serveur sur différentes interfaces
const testServer = (port, host = '0.0.0.0') => {
    return new Promise((resolve) => {
        const app = express();
        
        app.get('/', (req, res) => {
            res.json({
                message: 'Serveur de test accessible!',
                host: req.hostname,
                ip: req.ip,
                headers: req.headers,
                timestamp: new Date().toISOString()
            });
        });
        
        const server = app.listen(port, host, () => {
            const address = server.address();
            console.log(`✅ Serveur de test démarré sur ${host}:${port}`);
            console.log(`   Adresse: ${address.address}:${address.port}`);
            resolve(server);
        }).on('error', (err) => {
            console.log(`❌ Impossible de démarrer le serveur sur ${host}:${port}`);
            console.log(`   Erreur: ${err.message}`);
            resolve(null);
        });
    });
};

// Fonction pour obtenir les IP locales
const getNetworkInterfaces = async () => {
    try {
        const os = await import('os');
        const interfaces = os.networkInterfaces();
        const addresses = [];
        
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    addresses.push({
                        interface: name,
                        address: iface.address,
                        netmask: iface.netmask
                    });
                }
            }
        }
        
        return addresses;
    } catch (error) {
        console.error('Erreur lors de la récupération des interfaces:', error);
        return [];
    }
};

// Test de connectivité vers le serveur principal
const testConnection = async (url) => {
    try {
        const response = await fetch(url);
        if (response.ok) {
            console.log(`✅ ${url} - Accessible`);
            return true;
        } else {
            console.log(`⚠️  ${url} - Réponse ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${url} - ${error.message}`);
        return false;
    }
};

// Fonction principale de diagnostic
const runDiagnostic = async () => {
    console.log('🚀 DIAGNOSTIC RÉSEAU FRONT/BACK');
    console.log('=' .repeat(50));
    
    // 1. Afficher les interfaces réseau
    console.log('\n📡 Interfaces réseau détectées:');
    const interfaces = await getNetworkInterfaces();
    
    if (interfaces.length === 0) {
        console.log('   Aucune interface réseau trouvée');
    } else {
        interfaces.forEach((iface, index) => {
            console.log(`   ${index + 1}. ${iface.interface}: ${iface.address}/${iface.netmask}`);
        });
    }
    
    // 2. Tester la disponibilité des ports
    console.log('\n🔌 Test de disponibilité des ports:');
    const testPorts = [3000, 3001];
    const testHosts = ['localhost', '0.0.0.0'];
    
    for (const port of testPorts) {
        for (const host of testHosts) {
            const server = await testServer(port, host);
            if (server) {
                // Arrêter le serveur après test
                setTimeout(() => server.close(), 1000);
            }
        }
    }
    
    // 3. Tester la connectivité vers le serveur principal (si en cours)
    console.log('\n🌐 Test de connectivité vers le serveur principal:');
    const testUrls = [
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://192.168.1.2:3001'
    ];
    
    // Ajouter dynamiquement les IP trouvées
    interfaces.forEach(iface => {
        testUrls.push(`http://${iface.address}:3001`);
    });
    
    // Supprimer les doublons
    const uniqueUrls = [...new Set(testUrls)];
    
    for (const url of uniqueUrls) {
        await testConnection(url);
    }
    
    // 4. Configuration recommandée
    console.log('\n💡 CONFIGURATION RECOMMANDÉE:');
    console.log('=' .repeat(50));
    console.log('Backend (app.js):');
    console.log('   - Host: 0.0.0.0 (pour écouter sur toutes les interfaces)');
    console.log('   - Port: 3001');
    console.log('   - CORS: Autorisé pour 192.168.x.x:3000/3001');
    
    console.log('\nFrontend:');
    interfaces.forEach(iface => {
        console.log(`   - API_URL: http://${iface.address}:3001`);
    });
    
    console.log('\n🔧 COMMANDES UTILES:');
    console.log('=' .repeat(50));
    console.log('Démarrer le backend:');
    console.log('   cd c:\\monpetitroadtrip_server');
    console.log('   npm start');
    
    console.log('\nTester l\'API depuis le navigateur:');
    interfaces.forEach(iface => {
        console.log(`   http://${iface.address}:3001`);
    });
    
    console.log('\nVérifier que le firewall Windows autorise Node.js:');
    console.log('   - Panneau de configuration > Firewall Windows');
    console.log('   - Autoriser une application > Node.js');
    
    // 5. Fichier de configuration suggéré
    console.log('\n📄 Configuration suggérée pour votre frontend:');
    console.log('=' .repeat(50));
    
    const primaryIP = interfaces.length > 0 ? interfaces[0].address : '192.168.1.2';
    const config = {
        development: {
            API_BASE_URL: `http://${primaryIP}:3001`,
            API_FALLBACK_URLS: interfaces.map(iface => `http://${iface.address}:3001`)
        }
    };
    
    console.log(JSON.stringify(config, null, 2));
};

// Gestion des arguments en ligne de commande
const command = process.argv[2];

switch (command) {
    case 'interfaces':
        getNetworkInterfaces().then(interfaces => {
            console.log('Interfaces réseau:');
            interfaces.forEach(iface => {
                console.log(`${iface.interface}: ${iface.address}`);
            });
        });
        break;
        
    case 'test-server':
        const port = parseInt(process.argv[3]) || 3001;
        console.log(`Démarrage d'un serveur de test sur le port ${port}...`);
        testServer(port).then(server => {
            if (server) {
                console.log('Serveur de test démarré. Appuyez sur Ctrl+C pour arrêter.');
            } else {
                console.log('Impossible de démarrer le serveur de test.');
                process.exit(1);
            }
        });
        break;
        
    default:
        runDiagnostic();
}
