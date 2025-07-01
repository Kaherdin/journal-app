// split-journal.js
const fs = require('fs');
const path = require('path');

// Configuration
const sourceDir = path.join(__dirname, 'data_journal', 'source_chatgpt');
const outputDir = path.join(__dirname, 'data_journal', 'entries');
const entrySeparator = /^ChatGPT a dit :/m;

// Nettoyer le répertoire de sortie
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true });
}
fs.mkdirSync(outputDir, { recursive: true });

// Traiter tous les fichiers
fs.readdirSync(sourceDir).forEach(file => {
  const content = fs.readFileSync(path.join(sourceDir, file), 'utf8');
  
  // Découper en entrées ChatGPT
  const entries = content.split(entrySeparator)
    .slice(1) // Ignorer le contenu avant le premier séparateur
    .map(entry => entry.replace(/Vous avez dit :.*?($|\nChatGPT)/gs, '').trim());

  // Sauvegarder chaque entrée
  entries.forEach((entry, index) => {
    if (!entry) return;
    
    const filename = `entry_${path.basename(file, '.txt')}_${String(index + 1).padStart(3, '0')}.md`;
    fs.writeFileSync(path.join(outputDir, filename), entry);
  });
});

console.log('Traitement terminé ! Entrées ChatGPT extraites avec succès.');