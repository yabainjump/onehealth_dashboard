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
- administration sécurisée des rôles Hub et des périmètres pays CEEAC ;
- registre de souveraineté avec politiques de partage par État et audit des décisions ;
- données de démonstration clairement identifiées comme fictives.
- moteur de scénario dynamique administrateur, idempotent et traçable, reliant CAPC-AC, ARIS 3 et DHIS2 entre le Cameroun et le Tchad ;
- file de décisions chargée depuis l'API avec accès direct au dossier concerné ;
- rapports par alerte persistants et versionnés, avec workflow brouillon, revue, validation et publication ;
- piste d'audit visible dans chaque dossier (scénario, affectation, décision et rapport).

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

| Route             | État                                                                            |
| ----------------- | ------------------------------------------------------------------------------- |
| `/connexion`      | Authentification JWT du Dashboard implémentée                                   |
| `/dashboard`      | Première vue stratégique implémentée                                            |
| `/carte`          | Carte régionale interactive implémentée                                         |
| `/alertes`        | Registre, filtres, pagination et export CSV implémentés                         |
| `/alertes/:id`    | Dossier multisectoriel, rapport versionné, workflow humain et audit persistants |
| `/analyses`       | Analyse multisectorielle, qualité et export CSV implémentés                     |
| `/rapports`       | Bibliothèque, aperçu, impression et exports implémentés                         |
| `/connecteurs`    | Supervision et synchronisation contrôlée implémentées                           |
| `/administration` | Gestion des rôles institutionnels et des pays autorisés                         |
| `/souverainete`   | Registre des politiques nationales de partage des données                       |

## Référence produit

Maquette : [Hub CEEAC données](https://www.figma.com/design/XnKRUuXx3IG2muFGl4hest/hub-Ceeac-donn%C3%A9es?node-id=0-1)

Les écrans portant la mention « Affinement » servent de référence visuelle principale. Les prototypes antérieurs servent uniquement à compléter les parcours non détaillés.

## Données de démonstration

Les jeux de données se trouvent dans `src/app/core/data/mock`. Ils reproduisent trois formats sources distincts, ensuite transformés par des adaptateurs vers un modèle commun `OneHealthObservation` :

- événements de surveillance humaine DHIS2 ;
- foyers et événements vétérinaires ARIS 3 ;
- relevés climatiques et environnementaux CAPC-AC.

Le jeu normalisé contient exactement 150 observations sources, 12 signaux à vérifier et 3 alertes vérifiées. Cette classification est propre au démonstrateur et ne résulte d'aucune validation sanitaire réelle.

Un administrateur Hub peut lancer depuis `/dashboard` le scénario dynamique « Convergence zoonotique Cameroun–Tchad ». Il ajoute ou actualise quatre fiches fictives sans duplication et produit un signal qui doit obligatoirement être affecté puis vérifié par un humain. Relancer le scénario réinitialise ce scénario de démonstration, mais ne crée jamais de doublon.

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

### Déploiement cPanel

Le script `deploy-onehealth-dashboard.sh` déploie la branche `main` dans
`$HOME/public_html/onehealthdashboard.yaba-in.com`. Il génère localement le fichier
`environment.ts` ignoré par Git, compile Angular, installe la configuration Apache et vérifie
la page d'accueil ainsi que la route `/connexion`.

Première installation sur le serveur :

```bash
mkdir -p "$HOME/apps"
git clone https://github.com/yabainjump/onehealth_dashboard.git \
  "$HOME/apps/onehealth_dashboard"
install -m 0700 \
  "$HOME/apps/onehealth_dashboard/deploy-onehealth-dashboard.sh" \
  "$HOME/deploy-onehealth-dashboard.sh"
```

Si le dépôt est privé, Git demandera un utilisateur GitHub et un Personal Access Token, ou
utilisera la clé SSH déjà configurée sur le serveur. L'URL publique `raw.githubusercontent.com`
ne doit pas être utilisée pour amorcer le déploiement d'un dépôt privé.

Commande de déploiement initial et des déploiements suivants avec Node NVM :

```bash
cd ~
APP_DIR="$HOME/apps/onehealth_dashboard" \
WEB_DIR="$HOME/public_html/onehealthdashboard.yaba-in.com" \
NODE_BIN_DIR="$HOME/.nvm/versions/node/v20.20.2/bin" \
NPM_BIN="$HOME/.nvm/versions/node/v20.20.2/bin/npm" \
NODE_BIN="$HOME/.nvm/versions/node/v20.20.2/bin/node" \
bash "$HOME/deploy-onehealth-dashboard.sh"
```

Variables optionnelles : `DASHBOARD_API_BASE_URL`, `ALLOW_DEMO_FALLBACK`, `APP_DIR`, `WEB_DIR`,
`BRANCH`, `NODE_BIN_DIR`, `NODE_BIN`, `NPM_BIN`, `CLEAN_WEB_DIR`, `PUBLIC_WEB_URL` et
`VERIFY_PUBLIC_URL`.

Le backend doit autoriser `https://onehealthdashboard.yaba-in.com` dans la variable
`CORS_ORIGIN` de `$HOME/apps/onehealth_backend/.env`, sans supprimer l'origine de l'application
communautaire. Le processus PM2 doit ensuite être redémarré avec `--update-env`.

## Limite du démonstrateur

Le moteur prouve le parcours d'une convergence intersectorielle, mais il ne remplace pas encore un moteur statistique connecté aux API nationales réelles. Aucune donnée fictive ne doit être confondue avec une donnée sanitaire officielle et aucune alerte n'est validée automatiquement.
