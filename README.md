# One Health Network Dashboard

Démonstrateur Angular du Hub décisionnel régional One Health pour la CEEAC. Cette application est séparée de l'application communautaire Ionic et consomme les API Hub du backend NestJS commun.

## État de cette première étape

- socle Angular autonome et responsive ;
- connexion institutionnelle JWT, garde des routes et autorisation par rôle/pays ;
- navigation du Hub et tableau de bord stratégique ;
- indicateurs régionaux, aperçu cartographique, alertes prioritaires et décisions attendues ;
- représentation des trois flux prévus : DHIS2, ARIS et CAPC-AC / stations météo ;
- 165 fiches fictives normalisées : 55 DHIS2, 55 ARIS 3 et 55 CAPC-AC ;
- carte Leaflet/OpenStreetMap interactive avec filtres par période, secteur et niveau de qualification ;
- registre responsive des observations, signaux et alertes avec recherche, filtres, pagination et export CSV ;
- fiche détaillée multisectorielle avec provenance, gouvernance et workflow humain persisté ;
- couverture des onze États membres de la CEEAC avec traçabilité de l'identifiant source ;
- espace d’analyse multisectorielle avec tendances, qualité et export CSV ;
- supervision des connecteurs DHIS2, ARIS 3 et CAPC-AC ;
- bibliothèque de rapports avec notes pays, synthèses régionales, veilles sectorielles et exports ;
- données de démonstration clairement identifiées comme fictives.

Les principaux écrans du démonstrateur sont maintenant fonctionnels. Les rapports générés restent descriptifs et nécessitent une validation humaine avant diffusion.

## Démarrage

Prérequis : Node.js 20 ou 22 et npm.

```bash
npm install
npm start
```

L'application est ensuite accessible sur `http://localhost:4200`.

## Contrôles qualité

```bash
npm run lint
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

La version de production est générée dans `dist/onehealth_dashboard/browser`.

## Routes

| Route | État |
| --- | --- |
| `/connexion` | Authentification JWT du Dashboard implémentée |
| `/dashboard` | Première vue stratégique implémentée |
| `/carte` | Carte régionale interactive implémentée |
| `/alertes` | Registre, filtres, pagination et export CSV implémentés |
| `/alertes/:id` | Dossier multisectoriel et workflow humain simulé implémentés |
| `/analyses` | Analyse multisectorielle, qualité et export CSV implémentés |
| `/rapports` | Bibliothèque, aperçu, impression et exports implémentés |
| `/connecteurs` | Supervision et synchronisation contrôlée implémentées |

## Référence produit

Maquette : [Hub CEEAC données](https://www.figma.com/design/XnKRUuXx3IG2muFGl4hest/hub-Ceeac-donn%C3%A9es?node-id=0-1)

Les écrans portant la mention « Affinement » servent de référence visuelle principale. Les prototypes antérieurs servent uniquement à compléter les parcours non détaillés.

## Données de démonstration

Les jeux de données se trouvent dans `src/app/core/data/mock`. Ils reproduisent trois formats sources distincts, ensuite transformés par des adaptateurs vers un modèle commun `OneHealthObservation` :

- événements de surveillance humaine DHIS2 ;
- foyers et événements vétérinaires ARIS 3 ;
- relevés climatiques et environnementaux CAPC-AC.

Le jeu normalisé contient exactement 150 observations sources, 12 signaux à vérifier et 3 alertes vérifiées. Cette classification est propre au démonstrateur et ne résulte d'aucune validation sanitaire réelle.

Lorsque l'API Hub est disponible, les affectations, validations et rejets sont persistés dans MongoDB et audités avec l'identifiant de l'utilisateur. Une justification d'au moins dix caractères est obligatoire. Les commentaires internes restent locaux pour le moment.

Si le backend est indisponible, le Dashboard peut utiliser le jeu fictif local pour préserver une démonstration. Ce mode n'est déclenché que pour une indisponibilité technique : une réponse `401` ou `403` ne provoque jamais de repli local. Le pied de page signale clairement le mode de secours.

## Authentification et API

- développement : `http://localhost:3000/api` ;
- production : `https://backend.onehealthnetwork.yaba-in.com/api` ;
- stockage JWT : `sessionStorage`, supprimé à la fermeture de l'onglet ;
- données chargées après authentification et avant la création des pages ;
- un changement d'utilisateur ou de portée nationale force un nouveau chargement.

Les URLs sont définies dans `src/environments`. En production, le domaine public du Dashboard doit être ajouté à `CORS_ORIGIN` côté NestJS.

## Carte et déploiement

La carte utilise Leaflet et les tuiles publiques OpenStreetMap, sans clé payante. En production, ne pas exposer le serveur Angular de développement et respecter la politique d'utilisation des tuiles OpenStreetMap.

Si une Content Security Policy est appliquée par l'hébergement, autoriser au minimum `https://*.tile.openstreetmap.org` dans `img-src` et `connect-src`. Pour un trafic institutionnel important, prévoir ensuite un fournisseur de tuiles ou un serveur de tuiles régional dédié.

## Prochaine couche technique

Les prochaines couches sont la supervision des connecteurs simulés, les analyses sectorielles et la bibliothèque de rapports. Aucune donnée fictive ne doit être confondue avec une donnée sanitaire officielle.
