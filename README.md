# Kooki V0.3 — sécurisation de la synchronisation

Application React/Vite mobile-first avec Supabase Auth, données de foyer partagées et RLS.

## Mise en route

1. Créer un projet Supabase.
2. Dans **SQL Editor**, exécuter intégralement `supabase/schema.sql`.
3. Dans **Authentication > URL Configuration**, ajouter l'URL locale (`http://localhost:5173`) et l'URL de production (`https://kooki.trameworks.com`) dans les redirect URLs. Pour tester immédiatement sans confirmation email, vous pouvez désactiver temporairement **Confirm email** dans les paramètres d'authentification (réactivez-le en production).
4. Copier `.env.example` en `.env`, puis renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (clé **publishable/anon**, jamais service_role).
5. `npm install` puis `npm run dev`.
6. Pour publier : `npm run build`, déployer le contenu du dossier `dist` sur un hébergeur statique avec fallback SPA vers `index.html`.

## Utilisation

- Créer un compte puis un foyer, ou rejoindre un foyer via un code fourni par un membre.
- Dans **Paramètres**, copier le code d'invitation du foyer.
- Inventaire, recettes personnelles, repas, check-up et courses sont sauvegardés dans Supabase. Chaque foyer est isolé via RLS.
- Les données de la V0.1 stockées dans le navigateur ne sont **pas** migrées automatiquement. Exportez-les depuis la V0.1 avant mise à jour, puis importez le JSON via les paramètres de la V0.2.

## Limites connues

- La synchronisation repose sur un document JSON unique par foyer : les modifications simultanées depuis deux appareils peuvent s'écraser. Une prochaine itération devra utiliser des tables par entité avec gestion des conflits.
- Le temps réel nécessite l'activation de la publication Realtime pour `household_data` dans Supabase. Sans cela, recharger la page récupère les dernières données.
- Les notifications push ne sont pas encore implémentées ; le check-up et les échéances sont visibles dans l'interface.
- Pas encore de récupération avancée de compte ni de gestion des rôles/membres au-delà du code d'invitation.
- Les recettes initiales restent intégrées à l'application.

## Changements V0.3

- Contrôle de révision côté base pour détecter les modifications concurrentes.
- Écritures sérialisées côté client et état de synchronisation explicite.
- Ingrédients « toujours disponibles » configurables dans les paramètres : ils ne sont plus supposés présents par défaut.
- Pour une base existante, réexécuter `supabase/schema.sql` afin d’ajouter la colonne `revision`.

**Attention :** les notifications push en arrière-plan, la déduction des quantités et les tests bout-en-bout ne sont pas livrés. Cette version n’est pas encore une V1 validée.

## V0.4 — rappels locaux

- Autorisation explicite des notifications dans **Paramètres**.
- Réglage du délai d'alerte (0, 1, 2, 3 ou 7 jours avant une date enregistrée).
- Activation/désactivation des rappels de check-up, selon le rythme déjà configuré.
- Détection au chargement et au retour dans l'application ; dédoublonnage quotidien par foyer et par appareil.
- Service worker minimal pour afficher les notifications et rouvrir Kooki au clic ; pas de cache hors ligne.

**Limite essentielle :** cette version ne dispose pas encore d'un serveur d'envoi Web Push programmé. Les notifications locales ne sont donc **pas garanties quand l'application est fermée**. Sur iPhone, les notifications Web nécessitent notamment l'installation de la PWA sur l'écran d'accueil, HTTPS et l'autorisation de l'utilisateur. Les réglages de rappels sont synchronisés au niveau du foyer, mais l'autorisation des notifications est propre à chaque appareil.

Pour les rappels en arrière-plan : prévoir abonnements Push par utilisateur/appareil, stockage protégé, clés VAPID, fonction planifiée Supabase et suppression des abonnements expirés. Ne pas exposer de clé VAPID privée dans Vite.

## V0.5 — notifications Web Push en arrière-plan

Cette version contient le client Push API, le service worker recevant les messages, une fonction Supabase d'abonnement et une fonction serveur d'envoi quotidien. **Les push autonomes ne fonctionnent qu'après déploiement et configuration de la tâche planifiée.**

### Configuration à effectuer une fois

1. Héberger Kooki sur `https://kooki.trameworks.com` (HTTPS obligatoire). Sur iPhone, ajouter le site à l'écran d'accueil depuis Safari ; ouvrir ensuite cette installation pour autoriser les push.
2. Générer une paire VAPID avec `npx web-push generate-vapid-keys` sur un poste disposant de Node.js. Mettre **uniquement la clé publique** dans `.env` : `VITE_VAPID_PUBLIC_KEY=...`. Ne jamais placer la clé privée dans `.env` Vite ou dans Git.
3. Dans Supabase SQL Editor, exécuter les nouvelles instructions de `supabase/schema.sql` (ou tout le fichier si nécessaire).
4. Installer la CLI Supabase et se connecter : `npx supabase login`, puis `npx supabase link --project-ref VOTRE_PROJECT_REF`.
5. Déployer les fonctions : `npx supabase functions deploy push-subscription` et `npx supabase functions deploy push-dispatch --no-verify-jwt`. L'absence de vérification JWT sur `push-dispatch` est compensée par un secret d'appel obligatoire `x-cron-secret` : ne jamais exposer ce secret au client.
6. Créer un secret aléatoire fort pour `KOOKI_CRON_SECRET`, puis configurer les secrets Supabase avec `npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:contact@trameworks.com KOOKI_CRON_SECRET=...` (éviter de conserver les secrets dans l'historique du terminal ; utiliser un fichier d'environnement temporaire protégé et `--env-file` si possible). Les variables `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont normalement fournies aux Edge Functions par Supabase.
7. Planifier un POST quotidien à `https://VOTRE_PROJECT_REF.supabase.co/functions/v1/push-dispatch` avec l'en-tête `x-cron-secret: VOTRE_SECRET`. On peut utiliser Supabase Cron / pg_net ou un ordonnanceur externe. **Ne pas** enregistrer le secret en clair dans une requête SQL versionnée ; utiliser Supabase Vault ou le coffre à secrets de l'ordonnanceur. Exécution recommandée une fois par jour, par exemple 08:00 UTC ; les rappels ne sont pas encore ajustés au fuseau de chaque utilisateur.
8. Dans les paramètres de Kooki, cliquer sur **Activer les notifications push** sur chaque appareil. Vérifier les autorisations du navigateur et du système.

### Limites / contrôles

- La fonction d'envoi est idempotente par appareil, foyer, type et date UTC : elle réserve la livraison avant d'envoyer. En cas d'échec temporaire, le rappel de cette journée peut être perdu plutôt que dupliqué.
- Les notifications concernent les aliments à échéance et les check-up ; les produits déjà périmés restent signalés chaque jour tant qu'ils sont dans l'inventaire.
- Les abonnements sont propres à l'utilisateur et à l'appareil ; le serveur utilise une clé de service non exposée au navigateur.
- La compilation, le déploiement Supabase, le cron et la réception réelle sur iOS/Android **n'ont pas encore été validés**. Tester ces points avant de considérer les notifications comme opérationnelles.
- Les notifications locales à l'ouverture de Kooki restent disponibles ; selon les appareils, elles peuvent s'ajouter aux push du jour.

## V0.6 — consolidation des ingrédients

Un moteur indépendant (`src/inventory.js`) calcule désormais les manques sur plusieurs repas en additionnant les quantités et en convertissant g/kg et ml/cl/l. Pour une recette personnalisée, une ligne d'ingrédient peut être écrite `Farine|250|g` ou `Lait|20|cl`. Une ligne simple (`Sel`) conserve le mode présence/absence, car les recettes historiques n'ont pas encore de quantités certifiées. Les déductions de stock quantifiées sont disponibles dans le moteur, mais **ne sont pas encore reliées à une confirmation de cuisson dans l'interface** : aucune déduction automatique n'est faite sans validation utilisateur.

Tests unitaires : `npm test`. La compilation Vite et les notifications push réelles restent à valider après installation des dépendances et configuration des services.


## V0.8 — protection des conflits

Lorsqu'une modification distante survient avant l'enregistrement local, Kooki bloque désormais les nouvelles modifications, affiche un état de conflit et propose de recharger les données du foyer. Exportez d'abord les données locales depuis les paramètres si vous souhaitez les conserver. Ce mécanisme évite un écrasement silencieux, mais **ne fusionne pas automatiquement** les modifications concurrentes.

Le dispatch push retire une réservation d'envoi en cas d'erreur transitoire, permettant une nouvelle tentative au prochain passage ; les erreurs 404/410 suppriment l'abonnement invalide.

**Limites de validation :** tests unitaires Node exécutés, mais compilation Vite non vérifiée (dépendances npm indisponibles hors ligne). Les fonctions Supabase et les notifications réelles nécessitent un déploiement et des tests sur appareils. Ne pas considérer cette livraison comme prête pour production sans ces vérifications.

## V0.9 — correctifs de consolidation (8 novembre 2026)

- Correction du regroupement des unités : kg et g sont désormais compatibles ; l et cl et ml aussi. Avant ce correctif, les recettes pouvaient afficher des manques inexacts ou ne pas déduire certains stocks.
- Les unités inconnues ne sont plus converties implicitement en pièces. Les quantités non interprétables doivent être vérifiées manuellement.
- Correction du calcul de la date locale du jour (au lieu de la date UTC).
- Protection contre les modifications avant la fin du chargement Supabase.
- 7 tests unitaires exécutés et réussis (`npm test`).

**Important : ce n'est pas encore une version certifiée prête pour production.** La compilation reste non vérifiée : `npm install` a échoué à cause de l'impossibilité de joindre registry.npmjs.org (`EAI_AGAIN`). Les parcours d'authentification, RLS, synchronisation multi-appareils et push réels ne peuvent pas être certifiés sans un projet Supabase configuré et des essais sur appareils. La résolution automatique des conflits n'est pas intégrée : l'utilisateur peut exporter puis recharger. Ne pas prétendre que ces vérifications ont été effectuées.

## V0.10 — Supabase CLI

Sur un projet Supabase **neuf** :

```bash
npm install
npm run supabase:login
npm run supabase:link -- --project-ref VOTRE_PROJECT_REF
npm run db:push
npm run functions:deploy
```

La migration initiale se trouve dans `supabase/migrations/20261108210000_initial_schema.sql`. Si le schéma SQL a déjà été exécuté manuellement sur ce projet, ne poussez pas cette migration sans vérifier son historique : risque de conflit.

Pour les push, configurez également les secrets VAPID, le secret de cron et la planification décrits en section V0.5. Les commandes Supabase n'ont pas été exécutées contre un projet réel.


## V0.11 — Invitations temporaires

La migration `20261109151659_rotate_household_invite_codes.sql` ajoute l'expiration des codes après 24 h et la RPC `get_household_invite_code`. Elle doit être appliquée avec `npm run db:push` sur les installations qui ne l'ont pas encore reçue. Sur le projet de test où elle a déjà été appliquée, elle ne doit pas être rejouée manuellement. Les paramètres du foyer affichent le code, son expiration et permettent de le renouveler après confirmation.

**Note de déploiement :** la migration incluse est une reproduction du SQL fourni précédemment. Vérifier son identité avec la migration déjà appliquée avant d'exécuter `db:push` sur une base existante.

## V0.12 — Profils du foyer

- Appliquer la nouvelle migration `20261109170000_household_profiles.sql` avec `npm run db:push`.
- Dans Paramètres, consulter les membres connectés, modifier son pseudo/rôle familial, créer des profils sans compte (propriétaire), et retirer un membre ou un profil (propriétaire).
- Les rôles familiaux sont purement visuels et ne modifient pas les permissions.
- Les profils sans compte ne disposent pas d'identifiants de connexion.
- **Important** : l'interface ne permet pas encore de transférer la propriété ou de quitter volontairement un foyer.
- Test manuel sur Supabase réel encore nécessaire, notamment pour les permissions SQL et l'actualisation entre deux appareils.


## V0.13 — membres et invitations par e-mail

- Un membre du foyer correspond toujours à un compte Supabase Auth. Le bouton « Ajouter un profil familial » a été retiré.
- Chaque membre peut modifier son pseudo et son rôle familial. Le propriétaire peut retirer les autres membres.
- Les anciennes données de profils sans compte sont conservées en base mais ne sont plus affichées ni modifiables.
- L'interface propose l'envoi facultatif d'une invitation par e-mail, en plus de la copie du code. **L'envoi n'est pas opérationnel avant configuration de Resend et déploiement de la nouvelle Edge Function.**

### Pour activer les invitations par e-mail plus tard

1. `npm run db:push` pour appliquer la migration V0.13.
2. Vérifier un domaine expéditeur dans Resend, puis définir les secrets serveur :
   `npx supabase secrets set RESEND_API_KEY=... KOOKI_EMAIL_FROM="Kooki <invitation@votredomaine.fr>"`
3. `npx supabase functions deploy send-household-invite`
4. Tester avec un compte connecté membre du foyer. La fonction limite à cinq tentatives par foyer et par heure, mais cette limite n'est pas atomique en cas d'appels simultanés.

Ne jamais mettre `RESEND_API_KEY` ni la clé `service_role` dans `.env.local`.
