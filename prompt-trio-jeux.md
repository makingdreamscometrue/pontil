# Pontil : trio de propositions (onglet Jeux)

## Prompt reformulé

Dans Pontil, onglet Jeux :

1. Au premier passage (sans goûts), noter des titres n'affiche les propositions qu'après un refresh. À corriger.
2. Ajouter une croix en haut à droite de chacune des 3 propositions, pour dire « pas pour l'instant ». Le site propose alors autre chose (par exemple pas un autre jeu de la même série), et seulement pour la session en cours.
3. Le trio est moins soigné sur PC que sur mobile. À améliorer.

## Fait ([PR #15](https://github.com/makingdreamscometrue/pontil/pull/15), en brouillon)

- **Refresh** : sur l'onglet sans goûts, noter un « incontournable » ne relançait pas l'affichage. Maintenant, environ 0,9 s après le premier « j'aime », les recos apparaissent sans recharger la page. Elles sont aussi recalculées à l'arrivée du catalogue.
- **Croix** : écarte le titre et sa série jusqu'à la fermeture de l'onglet. Ce n'est pas une note, donc les goûts ne changent pas. Un bouton « Annuler » apparaît.
- **Design PC** : affiche de 120 px, carte de la hauteur de l'affiche, fond flouté plus visible, effet au survol.

Testé avec Playwright en 1440×900 et 390×844.

## À faire

- **Bandes-annonces** : le champ `bande` est vide pour les 28 929 titres du catalogue (14 513 films, 8 395 séries, 6 021 jeux). Le générateur (`site.py`) n'est pas dans ce dépôt.
- **Jeux manquants** : 6 021 jeux au catalogue. Pour savoir lesquels manquent, il faut le script qui construit le catalogue.
- **Avis écrits** : l'API publique des avis Steam pour les jeux (sans clé), TMDB pour les films et séries (clé gratuite).
- **Question ouverte** : où est `site.py` (`nvproj` ou ailleurs), et y a-t-il une clé TMDB ?
