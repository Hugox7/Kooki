export const pantry=['Sel','Poivre','Huile d’olive','Farine','Sucre','Ail','Herbes de Provence'];
export const shelf={frigo:'Réfrigérateur',congelateur:'Congélateur',placard:'Placards',corbeille:'Fruits & légumes'};
export const recipes=[
['Omelette aux champignons',15,'Facile',['Œufs','Champignons','Beurre'],['Faire revenir les champignons.','Battre les œufs et verser dans la poêle.','Cuire à feu doux.']],
['Pâtes à la tomate',20,'Facile',['Pâtes','Tomates','Ail','Huile d’olive'],['Cuire les pâtes.','Faire revenir l’ail et les tomates.','Mélanger et assaisonner.']],
['Gratin de courgettes',45,'Facile',['Courgettes','Crème fraîche','Œufs','Fromage râpé'],['Préchauffer le four à 190 °C.','Couper les courgettes et les précuire.','Mélanger crème et œufs, recouvrir de fromage et enfourner 30 min.']],
['Quiche lorraine',45,'Moyen',['Pâte brisée','Œufs','Crème fraîche','Lardons'],['Préchauffer le four à 180 °C.','Étaler la pâte, ajouter les lardons.','Verser les œufs battus avec la crème et cuire 35 min.']],
['Salade de tomates',10,'Facile',['Tomates','Huile d’olive','Basilic'],['Couper les tomates.','Assaisonner et ajouter le basilic.']],
['Riz sauté aux légumes',25,'Facile',['Riz','Carottes','Courgettes','Oignon'],['Cuire le riz.','Faire sauter les légumes émincés.','Ajouter le riz et assaisonner.']],
['Soupe de légumes',40,'Facile',['Carottes','Pommes de terre','Poireaux','Oignon'],['Éplucher et couper les légumes.','Cuire dans de l’eau 30 min.','Mixer et assaisonner.']],
['Croque-monsieur',15,'Facile',['Pain de mie','Jambon','Fromage râpé','Beurre'],['Garnir le pain avec le jambon et le fromage.','Dorer à la poêle ou au four.']],
['Salade de pâtes',20,'Facile',['Pâtes','Tomates','Maïs','Concombre'],['Cuire puis refroidir les pâtes.','Couper les légumes et mélanger.']],
['Tarte aux pommes',55,'Moyen',['Pommes','Pâte feuilletée','Sucre','Beurre'],['Préchauffer le four à 180 °C.','Disposer les pommes sur la pâte.','Saupoudrer de sucre et cuire 35 min.']],
['Purée maison',35,'Facile',['Pommes de terre','Lait','Beurre'],['Cuire les pommes de terre.','Écraser avec lait et beurre.']],
['Pancakes',20,'Facile',['Farine','Œufs','Lait','Sucre'],['Mélanger les ingrédients.','Cuire des petites louches de pâte à la poêle.']],
['Salade de concombre',10,'Facile',['Concombre','Yaourt nature','Ciboulette'],['Émincer le concombre.','Mélanger avec yaourt et ciboulette.']],
['Poulet au riz',40,'Facile',['Poulet','Riz','Oignon','Crème fraîche'],['Cuire le riz.','Faire dorer le poulet avec l’oignon.','Ajouter la crème et laisser mijoter.']],
['Pizza maison',35,'Moyen',['Pâte à pizza','Sauce tomate','Mozzarella','Tomates'],['Préchauffer le four à 220 °C.','Garnir la pâte.','Cuire 15 à 20 min.']],
['Ratatouille',50,'Moyen',['Courgettes','Aubergines','Tomates','Poivron','Oignon'],['Couper les légumes.','Faire revenir l’oignon, puis ajouter le reste.','Laisser mijoter 35 min.']],
['Compote de pommes',25,'Facile',['Pommes','Sucre'],['Peler et couper les pommes.','Cuire avec un fond d’eau puis écraser.']],
['Œufs brouillés',10,'Facile',['Œufs','Beurre','Lait'],['Battre les œufs.','Cuire doucement avec le beurre en remuant.']],
['Pâtes au pesto',15,'Facile',['Pâtes','Pesto','Parmesan'],['Cuire les pâtes.','Ajouter le pesto et le parmesan.']],
['Salade de riz',20,'Facile',['Riz','Thon','Maïs','Tomates'],['Cuire puis refroidir le riz.','Égoutter le thon et le maïs.','Mélanger avec les tomates.']],
['Velouté de potiron',35,'Facile',['Potiron','Pommes de terre','Crème fraîche'],['Cuire les légumes coupés.','Mixer et ajouter la crème.']],
['Wrap au poulet',20,'Facile',['Tortillas','Poulet','Salade','Tomates'],['Cuire le poulet.','Garnir les tortillas avec la salade et les tomates.','Rouler et servir.']],
['Gratin de pommes de terre',55,'Facile',['Pommes de terre','Crème fraîche','Lait','Ail'],['Trancher finement les pommes de terre.','Recouvrir de lait et crème.','Cuire au four à 180 °C pendant 45 min.']],
['Banane au yaourt',5,'Facile',['Bananes','Yaourt nature','Miel'],['Couper les bananes.','Ajouter le yaourt et un filet de miel.']]
].map((r,i)=>({id:'r'+i,name:r[0],minutes:r[1],difficulty:r[2],ingredients:r[3],steps:r[4],custom:false}));
export const normalize=s=>String(s||'').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').trim().replace(/s$/,'');
export const uid=()=>globalThis.crypto?.randomUUID?.()||String(Date.now()+Math.random());
export const daysUntil=date=>date?Math.ceil((new Date(date+'T12:00:00').getTime()-new Date(new Date().toDateString()).getTime()-12*3600000)/86400000):null;
