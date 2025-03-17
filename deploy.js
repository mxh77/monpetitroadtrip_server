import { execSync } from 'child_process';

const commitMessage = process.argv[2];

if (!commitMessage) {
  console.error('Veuillez fournir un message de commit.');
  process.exit(1);
}

try {
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
  execSync('git push origin main', { stdio: 'inherit' });
  execSync('vercel --prod', { stdio: 'inherit' });
  console.log('Déploiement réussi.');
} catch (error) {
  console.error('Erreur lors du déploiement:', error);
  process.exit(1);
}