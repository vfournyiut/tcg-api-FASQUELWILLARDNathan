import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

/**
 * Résout le chemin correct vers les fichiers de documentation Swagger
 * Fonctionne aussi bien en développement qu'en production
 */
function getSwaggerDir(): string {
    // En développement, __dirname pointe vers src/swagger
    // En production, __dirname pointe vers dist/swagger
    // On cherche d'abord dans le répertoire courant du fichier compilé
    if (fs.existsSync(path.join(__dirname, 'config.yml'))) {
        return __dirname
    }
    // Sinon, regarde dans src/swagger (utile pour tsx watch)
    const srcPath = path.join(process.cwd(), 'src', 'swagger')
    if (fs.existsSync(path.join(srcPath, 'config.yml'))) {
        return srcPath
    }
    // Fallback pour dist
    return path.join(process.cwd(), 'dist', 'swagger')
}

/**
 * Charge et fusionne les documentations Swagger de tous les modules
 * 
 * @returns {Record<string, any>} Document OpenAPI complètement fusionné avec tous les endpoints
 */
export function loadSwaggerDefinition(): Record<string, any> {
    const swaggerDir = getSwaggerDir()

    // Charger la configuration principale
    const configPath = path.join(swaggerDir, 'config.yml')
    const configContent = fs.readFileSync(configPath, 'utf-8')
    const baseSpec = yaml.load(configContent) as Record<string, any>

    // Charger les documentations de modules
    const authPath = path.join(swaggerDir, 'auth.doc.yml')
    const authContent = fs.readFileSync(authPath, 'utf-8')
    const authDoc = yaml.load(authContent) as Record<string, any>

    const cardsPath = path.join(swaggerDir, 'cards.doc.yml')
    const cardsContent = fs.readFileSync(cardsPath, 'utf-8')
    const cardsDoc = yaml.load(cardsContent) as Record<string, any>

    const decksPath = path.join(swaggerDir, 'decks.doc.yml')
    const decksContent = fs.readFileSync(decksPath, 'utf-8')
    const decksDoc = yaml.load(decksContent) as Record<string, any>

    // Initialiser les paths s'ils n'existent pas
    if (!baseSpec.paths) {
        baseSpec.paths = {}
    }

    // Fusionner les paths de tous les modules
    if (authDoc.paths) {
        Object.assign(baseSpec.paths, authDoc.paths)
    }

    if (cardsDoc.paths) {
        Object.assign(baseSpec.paths, cardsDoc.paths)
    }

    if (decksDoc.paths) {
        Object.assign(baseSpec.paths, decksDoc.paths)
    }

    // Ajouter l'endpoint de santé
    baseSpec.paths['/health'] = {
        get: {
            tags: ['Health'],
            summary: 'Vérifier l\'état du serveur',
            description: 'Endpoint de santé pour vérifier que le serveur est opérationnel',
            operationId: 'healthCheck',
            responses: {
                '200': {
                    description: 'Serveur opérationnel',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    status: {
                                        type: 'string',
                                        example: 'ok'
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'TCG Backend Server is running'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return baseSpec
}

/**
 * Exporte la spécification Swagger pour utilisation avec swagger-ui-express
 */
export const swaggerSpec = loadSwaggerDefinition()
