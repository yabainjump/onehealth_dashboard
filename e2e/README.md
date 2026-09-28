# Tests de stabilisation P4

Cette suite Playwright vérifie le Dashboard dans un vrai navigateur sans appeler la production.
Les réponses REST sont interceptées et alimentées uniquement par les données fictives du dépôt.
Aucun secret, compte réel ou jeton de production ne doit être ajouté dans ce dossier.

## Commandes

```bash
npm run test:e2e:install
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:report
```

La suite couvre la connexion, les autorisations par rôle, les principales routes métier, le moteur
de scénario et son rapport, Rudolf, l'absence de persistance locale de ses conversations, la
navigation mobile, le passage du jeton aux API autorisées, le premier rendu et les règles WCAG
automatisables. Les rapports, captures, traces et vidéos sont ignorés par Git.

## Vérifications manuelles avant une livraison majeure

- parcourir au clavier la connexion, le menu, les filtres, les dialogues et Rudolf ;
- tester avec un lecteur d'écran les titres, libellés, états de chargement et erreurs ;
- vérifier les vues à 320 px, 390 px, 768 px, 1024 px et 1440 px ;
- contrôler zoom texte à 200 %, contraste élevé et réduction des animations ;
- confirmer sur une préproduction isolée les parcours connectés au vrai backend.

Les contrôles Axe réduisent les régressions détectables automatiquement, mais ne remplacent pas
une revue humaine d'accessibilité.
