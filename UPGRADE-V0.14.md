# Kooki V0.14 — invitations simplifiées

## Nouveautés
- Codes d'invitation de 8 caractères, sans caractères facilement confondus (I, O, 0, 1).
- Bouton « Rejoindre le foyer » dans l'e-mail Resend, pointant vers Kooki avec le code prérempli.
- Le code est conservé dans l'onglet pendant la connexion ou la création de compte, puis l'utilisateur confirme son adhésion.
- L'envoi manuel du code et son expiration de 24 heures restent disponibles.

## Mise à jour
1. Sauvegarder les modifications locales, puis remplacer les fichiers du projet (ne pas écraser `.env.local` ni `.git`).
2. `npx supabase db push` (applique `20261109190000_short_invite_codes.sql`). Attention : tous les anciens codes longs sont invalidés, sans toucher aux membres.
3. `npx supabase functions deploy send-household-invite` pour actualiser le modèle d'e-mail.
4. Redéployer le site Kooki sur son hébergeur.
5. Tester une invitation depuis un autre compte ou une fenêtre privée.

## Configuration
La fonction utilise `KOOKI_APP_URL` si présent, sinon `https://kooki.trameworks.com`. Garder `RESEND_API_KEY` et `KOOKI_EMAIL_FROM` dans les secrets Supabase.

## Vérification
7 tests unitaires Node réussis. Build Vite non vérifié dans cet environnement (dépendances non installées). Les appels Supabase/Resend n'ont pas été testés en production.
