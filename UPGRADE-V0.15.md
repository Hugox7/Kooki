# Kooki V0.15 — ingrédients des recettes

- Autocomplétion à partir de l’inventaire du foyer, des ingrédients des recettes existantes et d’un catalogue de départ.
- Ajout libre toujours possible, avec quantité et unité obligatoires.
- Ingrédients structurés compatibles avec `parseIngredient`, `calculateMissing` et `deductIngredients`.
- Pas de migration SQL ni de nouveau secret requis : les recettes restent dans le payload du foyer.
- Les anciennes recettes au format texte restent compatibles.

Installation : remplacer les fichiers, conserver `.env.local`, `npm install`, `npm run build`, puis redéployer sur Vercel.

Limites : catalogue de départ non exhaustif, pas de conversion automatique entre pièce et grammes, ni de rapprochement automatique des synonymes.
