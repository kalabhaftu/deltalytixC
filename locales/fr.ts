import shared from './en/shared'
import landing from './en/landing'
import auth from './en/auth'
import dropzone from './en/dropzone'
import propfirm from './en/propfirm'
import chat from './en/chat'
import importTranslations from './en/import'

// TODO: Create proper French translations
// For now, we're importing English translations to prevent breaking changes
// This should be replaced with actual French translations
export default {
    ...shared,
    ...landing,
    ...auth,
    ...dropzone,
    ...propfirm,
    ...chat,
    ...importTranslations,
    // Basic French translations
    'footer.heading': 'Pied de page',
    'footer.description': 'Analyses avancées pour les traders modernes.',
    'authentication.title': 'Authentification',
    'authentication.description': 'Entrez votre email, nous enverrons un lien magique dans votre boîte de réception et créerons un nouveau compte si vous n\'en avez pas.',
    'dashboard.myAccount': 'Mon Compte',
    'dashboard.profile': 'Profil',
    'dashboard.billing': 'Facturation',
    'dashboard.data': 'Données',
    'dashboard.settings': 'Paramètres',
    'dashboard.logOut': 'Se déconnecter',
    'error': 'Erreur',
    'success': 'Succès',
    'loading.trades': 'Chargement de vos trades...',
    'import.button': 'Importer des Trades',
    'common': {
        'add': 'Ajouter',
        'cancel': 'Annuler',
        'save': 'Sauvegarder',
        'saving': 'Sauvegarde...',
        'clear': 'Effacer',
        'done': 'Terminé',
        'delete': 'Supprimer',
        'deleting': 'Suppression...',
        'edit': 'Modifier',
        'close': 'Fermer',
        'back': 'Retour',
        'send': 'Envoyer',
        'confirm': 'Confirmer',
        'success': 'Succès',
        'error': 'Erreur'
    }
} as const
