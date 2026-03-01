#!/usr/bin/env node
/**
 * Script de build personnalisé pour copier les fichiers YAML de documentation Swagger
 * Exécuté après la compilation TypeScript
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'src', 'swagger');
const destDir = path.join(__dirname, 'dist', 'swagger');

// Créer le répertoire de destination s'il n'existe pas
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`✓ Répertoire créé: ${destDir}`);
}

// Fichiers YAML à copier
const yamlFiles = ['config.yml', 'auth.doc.yml', 'cards.doc.yml', 'decks.doc.yml'];

yamlFiles.forEach(file => {
    const src = path.join(sourceDir, file);
    const dest = path.join(destDir, file);

    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`✓ Copié: ${file}`);
    } else {
        console.warn(`⚠ Fichier non trouvé: ${src}`);
    }
});

console.log('✓ Fichiers Swagger copiés avec succès');
