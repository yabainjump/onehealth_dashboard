# Politique de sécurité — Dashboard

## Périmètre et frontières
Application Angular avec landing publique et espace Hub authentifié. Le navigateur et ses entrées, réponses API, cartes, exports et sorties Rudolf sont non fiables. Le backend reste l’autorité des rôles et des pays ; masquer un bouton n’autorise ni ne protège une donnée.

## Invariants
- Ne jamais embarquer de clé fournisseur, secret, mot de passe ou jeton de test dans les bundles, assets, logs ou exemples.
- Ne pas rendre de HTML non fiable depuis les popups, Markdown, rapports ou réponses IA ; conserver échappement, CSP et neutralisation des formules CSV.
- Ne montrer que les données autorisées par l’API ; vider les états privés lors d’un changement de session ou de pays et ne jamais transformer une erreur API en succès simulé en production.
- Toute action sensible doit appeler une API qui vérifie rôle, propriété et portée pays côté serveur ; l’interface ne remplace pas ce contrôle.
- Les rapports et scénarios simulés restent identifiés comme non officiels.
- Les overlays PrimeNG restent configurés localement sous la CSP existante : aucun thème, script,
  police ou composant ne doit être chargé depuis un CDN. Les contenus API et Rudolf projetés dans
  un tiroir, tableau, tag ou popover restent non fiables et suivent les mêmes règles d'échappement.
- Le fil Rudolf du Dashboard reste volatil en mémoire, n'est jamais écrit dans `localStorage` et est
  purgé à la déconnexion. Son affichage Markdown passe uniquement par le pipe d'échappement dédié.

## Signalements pertinents
Signaler exposition de données entre comptes/pays, XSS, fuite de jeton, contournement d’un flux protégé ou confusion exploitable entre simulation et données officielles. Établir un chemin utilisateur réel et l’impact ; ne pas assimiler un simple contrôle visuel absent à une autorisation backend cassée.

## Limites
Le fournisseur public de tuiles est un service externe de démonstration sans garantie de disponibilité ; les risques créés par son intégration restent examinables. Aucune exclusion ni vulnérabilité acceptée n’est approuvée ici.
