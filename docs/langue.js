// Version anglaise du site : la page est écrite en français, ce script traduit ce qui s'affiche.
// Langue = choix mémorisé, sinon celle du navigateur. Les titres des œuvres ne sont pas traduits.
(() => {
  let langue;
  try { langue = localStorage.getItem("tastebridge-langue"); } catch {}
  langue ||= /^fr/i.test(navigator.language || "fr") ? "fr" : "en";

  // Bouton FR / EN dans l'en-tête : il affiche la langue vers laquelle on bascule
  const b = document.createElement("button");
  b.className = "langue";
  b.textContent = langue === "fr" ? "EN" : "FR";
  b.title = langue === "fr" ? "English version" : "Version française";
  b.setAttribute("aria-label", `${b.textContent}, ${b.title}`);  // le nom accessible contient le texte visible
  b.onclick = () => { try { localStorage.setItem("tastebridge-langue", langue === "fr" ? "en" : "fr"); } catch {} location.reload(); };
  document.querySelector("#compte").before(b);
  if (langue === "fr") return;

  const MOTS = {
    // En-tête, pied de page
    "Films": "Movies", "Séries": "Shows", "Jeux": "Games", "Mes goûts": "My taste", "Rechercher": "Search",
    "Sections": "Sections", "Rechercher un film, une série ou un jeu": "Search for a movie, a show or a game",
    "Le projet sur GitHub": "The project on GitHub", "titres notés": "titles rated", "titre noté": "title rated",
    "Pontil : un seul profil de goûts pour films, séries et jeux. Données Wikidata, SteamSpy et Wikipédia.": "Pontil: one taste profile for movies, shows and games. Data from Wikidata, SteamSpy and Wikipedia.",
    "Comment ça marche": "How it works",
    // Accueil
    "Tes films, séries et jeux,": "Your movies, shows and games,", "enfin reliés.": "finally connected.",
    "Dis ce que tu as aimé, et Pontil te recommande quoi regarder et à quoi jouer, même d'un écran à l'autre : des jeux d'après tes films, des films d'après tes jeux.": "Tell it what you loved, and Pontil recommends what to watch and what to play, even across screens: games based on your movies, movies based on your games.",
    "Commencer": "Get started", "Importer Netflix, IMDb, Letterboxd": "Import Netflix, IMDb, Letterboxd",
    "Sans inscription, tes goûts restent dans ton navigateur": "No sign-up needed, your taste stays in your browser",
    "Recos instantanées, sans IA lourde": "Instant picks, no heavy AI",
    "Films que tu as aimés ?": "Movies you loved?", "Séries que tu as aimées ?": "Shows you loved?", "Jeux que tu as aimés ?": "Games you loved?",
    "Voir mes recos": "See my picks",
    // Recos
    "Parce que tu as aimé": "Because you liked", "Parce que tu aimes": "Because you like", "et": "and",
    "J'aime": "Like", "J'adore": "Love", "Pas pour moi": "Not for me", "Déjà vu": "Seen it", "Déjà joué": "Played it",
    "Fiche et avis": "Details & reviews", "Fiche": "Details", "En savoir plus": "Learn more", "Sur Steam": "On Steam",
    "Avis et commentaires": "Reviews and comments",
    "Un coup de dé": "Roll the dice", "Coup de dé": "Dice", "Touche une affiche": "Tap a poster", "Retirée": "Removed", "Note ce que tu aimes, Pontil trouve la suite.": "Rate what you love, Pontil finds what's next.", "Sans inscription": "No sign-up", "Gratuit, sans pub": "Free, no ads", "Bande-annonce": "Trailer", "Chercher la bande-annonce sur YouTube": "Find the trailer on YouTube", "28 000 films, séries et jeux": "28,000 movies, shows and games", "Note des titres pour voir ce qui vous relie.": "Rate a few titles to see the link.", "Touche une affiche pour la noter": "Tap a poster to rate it", "1 fois": "Once", "2 fois": "Twice", "3 fois": "3 times", "J'enlève": "Remove", "Le nom sous l'affiche ouvre sa fiche.": "The name under the poster opens its page.", "Un titre au hasard qui colle à tes goûts": "A random pick that fits your taste", "Tout": "All", "Film": "Movie", "Série": "Show", "Jeu": "Game", "Relancer": "Roll again",
    "Type de découverte": "Discovery type", "Trier": "Sort", "Pour toi": "For you", "Mieux notés": "Top rated",
    "Non merci": "No thanks", "Sans plus": "Meh", "Défiler à gauche": "Scroll left", "Défiler à droite": "Scroll right",
    "Choisis ton avis": "Pick how you felt", "C'est noté": "Saved", "Retouche pour l'enlever": "Tap again to undo", "Ta première liste": "Your first list", "Ton profil": "Your profile", "pour toi": "for you", "Mélange films, séries et jeux, puis partage-la d'un lien.": "Mix movies, shows and games, then share it with a link.", "À voir": "To watch", "Soirée frissons": "Scary night", "À jouer à deux": "Two-player games", "Quatre avis, de Non merci à J'adore. Cinq titres suffisent pour tes premières recos.": "Four takes, from No thanks to Love it. Five titles are enough for your first picks.", "Ton avis": "Your take",
    "Films pour toi": "Movies for you", "Séries pour toi": "Shows for you", "Jeux pour toi": "Games for you",
    "Critique": "Critics", "Récents": "Newest", "Tendance": "Trending", "Visiteurs": "Visitors", "Acclamés": "Acclaimed",
    "Metacritic, sinon Rotten Tomatoes, sinon avis Steam": "Metacritic, else Rotten Tomatoes, else Steam reviews",
    "Les plus lus sur Wikipédia ou joués sur Steam cette semaine": "Most read on Wikipedia or played on Steam this week",
    "Moyenne des avis des visiteurs": "Average visitor rating",
    "Une œuvre au hasard qui colle à tes goûts, hors de ce que tu connais déjà.": "A random pick that fits your taste, outside what you already know.",
    "D'après tes films et séries": "Based on your movies and shows", "D'après tes jeux": "Based on your games",
    "Ce qui ressemble le plus à ce que tu aimes, les titres récents et acclamés d'abord.": "Closest to what you love, recent and acclaimed titles first.",
    "Rien d'assez proche de tes goûts ici pour l'instant.": "Nothing close enough to your taste here yet.",
    "Il suffit d'un titre noté J'aime ou J'adore (Sans plus et Non merci ne comptent pas).": "One title rated Like or Love is enough (Meh and No thanks don't count).", "Ajoute quelques titres": "Add a few titles",
    "et les recos apparaissent.": "and picks will show up.",
    "Rien à tirer ici pour l'instant : note quelques titres de plus.": "Nothing to roll yet: rate a few more titles.",
    // Mes goûts
    "Ajouter un titre": "Add a title", "Un film, une série ou un jeu que tu as vu ou fait.": "A movie, show or game you watched or played.",
    "Interstellar, The Last of Us, Elden Ring...": "Interstellar, The Last of Us, Elden Ring...",
    "Importer ton historique": "Import your history",
    "Le fichier est lu dans ton navigateur, rien n'est envoyé.": "The file is read in your browser, nothing is uploaded.",
    "Le fichier est lu sur ton PC, rien n'est envoyé.": "The file is read on your PC, nothing is uploaded.",
    "Glisse un fichier CSV ici": "Drop a CSV file here", "ou clique pour le choisir": "or click to choose one",
    "Netflix : netflix.com/viewingactivity, Tout télécharger": "Netflix: netflix.com/viewingactivity, Download all",
    "IMDb : export de tes notes": "IMDb: export your ratings", "Letterboxd : export": "Letterboxd: export",
    "Tout CSV avec une colonne Title": "Any CSV with a Title column", "Tes goûts": "Your taste",
    "Gardés dans ce navigateur. Connecte-toi pour les retrouver sur tous tes appareils, ou sauvegarde-les dans un fichier.": "Kept in this browser. Sign in to get them on all your devices, or save them to a file.",
    "Sauvegarder": "Save", "Charger": "Load", "Tout effacer": "Clear all", "Rien ici pour l'instant.": "Nothing here yet.",
    "Ton avis...": "Your rating...", "Retirer": "Remove",
    "Adoré": "Loved", "Aimé": "Liked", "Regardé": "Watched", "Vu, sans plus": "Seen, meh", "Détesté": "Hated",
    "Noté, il ne reviendra plus": "Rated, it won't come back", "Noté, recos mises à jour": "Rated, picks updated",
    "Retiré": "Removed", "Goûts chargés": "Taste loaded",
    // Recherche
    "Un film, une série, un jeu...": "A movie, a show, a game...", "Tape au moins 2 lettres.": "Type at least 2 letters.",
    // Fiche et avis
    "Avis": "Reviews", "Chargement des avis...": "Loading reviews...", "Avis indisponibles pour le moment.": "Reviews unavailable right now.",
    "Aucun avis pour l'instant. Sois le premier.": "No reviews yet. Be the first.", "Voir sur Wikipédia": "View on Wikipedia",
    "Voir sur Steam": "View on Steam", "Se connecter pour donner ton avis": "Sign in to write a review", "Fermer": "Close",
    "Supprimer mon avis": "Delete my review", "Ta note": "Your rating", "Ton pseudo": "Your username",
    "Ton avis (facultatif) : ce que tu as aimé, ou pas...": "Your review (optional): what you liked, or didn't...",
    "Mettre à jour": "Update", "Publier": "Post", "Choisis une note de 1 à 5 étoiles.": "Pick a rating from 1 to 5 stars.",
    "Choisis un pseudo (2 caractères minimum).": "Pick a username (2 characters minimum).",
    "Répartition des notes": "Ratings breakdown", "Moyenne": "Average",
    // Compte
    "Se connecter": "Sign in", "Connexion": "Sign in", "Créer un compte": "Create an account", "Créer mon compte": "Create my account",
    "Garder tes goûts sur tous tes appareils": "Keep your taste on all your devices",
    "Tes goûts sont sauvegardés et te suivent sur tous tes appareils. Ceux déjà notés ici sont repris dans ton compte.": "Your taste is saved and follows you on every device. Titles already rated here move into your account.",
    "Tu vas recevoir un e-mail de confirmation envoyé par": "You'll get a confirmation e-mail sent by",
    ", le service qui gère les comptes de Pontil (pense à regarder dans les spams).": ", the service that runs Pontil accounts (check your spam folder).",
    "E-mail": "E-mail", "Mot de passe": "Password", "Mot de passe (8 caractères minimum)": "Password (8 characters minimum)",
    "Pas encore de compte ?": "No account yet?", "Déjà un compte ?": "Already have an account?",
    "Compte créé. Clique le lien de l'e-mail « Supabase » pour l'activer (regarde aussi les spams).": "Account created. Click the link in the \"Supabase\" e-mail to activate it (check spam too).",
    "E-mail ou mot de passe incorrect.": "Wrong e-mail or password.", "Un compte existe déjà avec cet e-mail.": "An account already exists with this e-mail.",
    "Active d'abord ton compte avec le lien reçu par e-mail.": "Activate your account first with the link sent by e-mail.",
    "Mot de passe trop faible (8 caractères minimum).": "Password too weak (8 characters minimum).",
    "Trop d'essais, réessaie dans quelques minutes.": "Too many attempts, try again in a few minutes.",
    "Ton compte": "Your account", "Tes notes sont synchronisées automatiquement.": "Your ratings sync automatically.", "Se déconnecter": "Sign out",
    "Garde tes goûts pour de bon": "Keep your taste for good",
    "Avec un compte gratuit, tes notes sont sauvegardées et tu les retrouves sur ton téléphone comme sur ton PC. Celles déjà notées ici sont reprises.": "With a free account, your ratings are saved and available on your phone and your PC. The ones rated here carry over.",
    "L'e-mail de confirmation vient de": "The confirmation e-mail comes from", ", notre service de comptes (vérifie les spams).": ", our account service (check spam).",
    "Plus tard": "Later",
    // Thèmes (themes.py)
    "Horreur": "Horror", "Zombies": "Zombies", "Science-fiction": "Sci-fi", "Cyberpunk, dystopie": "Cyberpunk, dystopia",
    "Post-apocalyptique": "Post-apocalyptic", "Super-héros": "Superheroes", "Fantasy": "Fantasy", "Action": "Action",
    "Aventure": "Adventure", "Polar, gangsters": "Crime, gangsters", "Thriller, mystère": "Thriller, mystery", "Guerre": "War",
    "Western": "Western", "Comédie": "Comedy", "Animation, famille": "Animation, family", "Sombre, adulte": "Dark, mature",
    "Romance": "Romance", "Histoire forte": "Strong story", "Historique": "Historical", "Anime": "Anime", "Survie": "Survival",
    "Espionnage, infiltration": "Spy, stealth", "Vengeance, vigilante": "Revenge, vigilante", "Monde ouvert": "Open world",
    "Souls-like": "Souls-like", "RPG": "RPG", "Tir": "Shooter", "Roguelike": "Roguelike", "Stratégie": "Strategy", "Course, sport": "Racing, sports",
    "Compétitif en ligne": "Online competitive", "Court": "Short", "Gratuit": "Free", "À plusieurs": "Multiplayer", "Même écran": "Same screen", "Meilleur prix": "Best price", "Rien avec ces filtres.": "Nothing with these filters.", "d'histoire": "of story", ", gratuit": ", free", "Coop entre amis": "Co-op with friends",
    "Parties classées et e-sport": "Ranked matches and esports", "À jouer à plusieurs": "Better with friends",
    // Ambiances (page.html)
    "Ambiances": "Themes", "Batailles historiques et héroïsme épique": "Historical battles and epic heroism", "Polars noirs et poisseux": "Gritty noir crime",
    "Enquêtes tendues à rebondissements": "Tense, twisty investigations", "Horreur crue et dérangeante": "Raw, disturbing horror", "Survivre la peur au ventre": "Survival with dread",
    "Morts-vivants et fin du monde": "The undead and the end of the world", "Futurs sombres et sociétés sous contrôle": "Dark futures and controlled societies",
    "Odyssées spatiales et mondes inconnus": "Space odysseys and unknown worlds", "Fantasy sombre, magie et sang": "Dark fantasy, magic and blood",
    "Contes merveilleux pour tous": "Enchanting tales for everyone", "Quêtes épiques en terres de légende": "Epic quests in legendary lands",
    "Héros masqués et justiciers": "Masked heroes and vigilantes", "Vengeance froide et justice personnelle": "Cold revenge and personal justice",
    "Espions, doubles jeux et infiltration": "Spies, double-crosses and infiltration", "Grands espaces et hors-la-loi": "Wide open spaces and outlaws",
    "Survivre dans un monde en ruines": "Surviving a ruined world", "Comédies romantiques qui font du bien": "Feel-good romantic comedies",
    "Drames passionnés et poétiques": "Passionate, poetic drama", "Humour noir et grinçant": "Dark, biting humor", "Rires en famille": "Laughs for the whole family",
    "Fresques historiques poignantes": "Moving historical epics", "Drames intenses et sans concession": "Intense, uncompromising drama",
    "Vastes mondes à explorer": "Vast worlds to explore", "Défis exigeants et combats punitifs": "Demanding challenges and punishing combat",
    "Une partie de plus, encore une": "Just one more run", "Tactique et réflexion": "Tactics and strategy", "Action nerveuse et fusillades": "Fast action and gunfights",
    "Animation japonaise": "Japanese animation", "Vitesse et compétition": "Speed and competition", "Suspense et mystères": "Suspense and mysteries",
    "Pour rire un bon coup": "For a good laugh", "Des histoires qui marquent": "Stories that stay with you",
    // Fiche d'un titre (page.html)
    "Résumé": "Synopsis", "Pourquoi ce titre pour toi": "Why this title for you", "Avis des visiteurs": "Visitor reviews", "Notes": "Ratings",
    "Ailleurs": "Elsewhere", "Dans le même esprit": "In the same spirit", "Similaires": "Similar", "Pour moi": "For me", "Tous": "All", "Les titres qui ressemblent le plus à celui-ci": "The titles most like this one", "Ressemblants à ce titre et à tes goûts": "Like this title and your taste", "Donne ton avis sur quelques titres pour l'activer": "Rate a few titles to turn it on", "Les titres aux thèmes les plus proches, sur le même support puis sur les autres.": "Titles with the closest themes, on the same screen first, then on the others.",
    "Chargement du résumé…": "Loading synopsis…", "Chargement des avis…": "Loading reviews…", "non disponible": "not available", "chargement…": "loading…", "aucun avis": "no reviews yet",
    "avis des joueurs, via SteamSpy": "player reviews, via SteamSpy", "note de la presse, via Wikidata": "critics score, via Wikidata",
    "critiques positives, via Wikidata": "positive critic reviews, via Wikidata", "avis des visiteurs, sur 5": "visitor reviews, out of 5",
    "Pas encore noté.": "Not rated yet.", "Ta note :": "Your rating:", "Titre français": "French title", "Titre anglais": "English title", "Titre français :": "French title:", "Titre anglais :": "English title:",
    "de correspondance avec tes goûts": "match with your taste", "Le plus proche de ce que tu as aimé :": "Closest to what you liked:", "Thèmes en commun avec ton profil :": "Themes shared with your profile:",
    "Le pourcentage compare les thèmes de ce titre à ceux des titres que tu as notés (les thèmes rares comptent plus). C'est le meilleur score entre ton profil entier et ton titre aimé le plus proche.": "The percentage compares this title's themes with those of the titles you rated (rare themes count more). It is the best score between your whole profile and your closest liked title.",
    "Note quelques titres que tu aimes : Pontil t'expliquera ici ce qui te rapproche de celui-ci.": "Rate a few titles you like: Pontil will explain here what connects you to this one.",
    "Résumé non disponible.": "Synopsis not available.", "Résumé indisponible pour le moment : Wikipédia ne répond pas.": "Synopsis unavailable right now: Wikipedia is not responding.",
    "Lire l'article sur Wikipédia": "Read the article on Wikipedia", "Wikipédia": "Wikipedia", "Ce titre n'est pas (ou plus) dans le catalogue.": "This title is not (or no longer) in the catalog.",
    "Retour aux recos": "Back to recommendations", "Les avis des visiteurs sont sur": "Visitor reviews are on", "le site en ligne": "the website",
    "Aucun titre assez proche dans le catalogue.": "No close enough title in the catalog.", "Thèmes communs :": "Shared themes:",
    // Liens et listes (page.html)
    "Appuie sur une couverture : une fois pour J'aime, deux pour J'adore, trois pour retirer. Le titre ouvre la fiche.": "Tap a cover: once for Like, twice for Love, three times to remove. The title opens the details page.",
    "En ce moment": "Right now", "Mentions légales et licences": "Legal notice and licences", "Texte extrait de Wikipédia, par ses contributeurs, sous licence": "Text from Wikipedia, by its contributors, licensed under", "Les plus lus sur Wikipédia ou les plus joués sur Steam cette semaine, ceux qui te ressemblent d'abord.": "Most read on Wikipedia or most played on Steam this week, closest to your taste first.",
    // Listes
    "Ajouter à une liste": "Add to a list", "Nouvelle liste : Ma liste d'automne": "New list: My fall list", "Nom de la nouvelle liste": "New list name", "Créer": "Create",
    "Des films, des séries et des jeux dans une même liste. Partage-la d'un lien, sans compte.": "Movies, shows and games in one list. Share it with a link, no account needed.",
    "Pas encore de liste. Crée-en une ici, ou depuis la fiche d'un titre (« Ajouter à une liste »).": "No list yet. Create one here, or from a title page (\u201cAdd to a list\u201d).",
    "Liste": "List", "Partager": "Share", "Garder dans mes listes": "Save to my lists", "Cette liste est vide. Ajoute des titres depuis leur fiche.": "This list is empty. Add titles from their page.",
    "Liste indisponible pour le moment.": "List unavailable right now.", "Lien copié": "Link copied", "Liste gardée": "List saved", "Retiré de la liste": "Removed from the list", "Mes listes": "My lists", "Un seul profil de goûts pour films, séries et jeux.": "One taste profile for movies, shows and games.", "Données Wikidata, SteamSpy et Wikipédia.": "Data from Wikidata, SteamSpy and Wikipedia.",
    // Où regarder, où jouer
    "Où jouer": "Where to play", "Où regarder": "Where to watch", "Chez toi": "You have it", "Plateformes non disponibles.": "Platforms not available.",
    "Plateformes et boutiques : Wikidata (incomplet, surtout pour les consoles).": "Platforms and stores: Wikidata (incomplete, especially for consoles).",
    "Abonnement ou gratuit": "Subscription or free", "Location": "Rent", "Achat": "Buy", "Offres : JustWatch, via TMDB.": "Offers: JustWatch, via TMDB.",
    "Offres de streaming non disponibles ici.": "Streaming offers not available here.", "Toutes les offres sur JustWatch": "All offers on JustWatch", "Mes services": "My services",
    "Ce que tu as : les recos disponibles chez toi passent un peu devant, et sont signalées « Chez toi ».": "What you have: recommendations available to you rank a bit higher and are marked \u201cYou have it\u201d.",
    "Film,": "Movie,", "Série,": "Show,", "Jeu,": "Game,",
    "Voir la fiche": "Open details", "Voir les avis": "See reviews", "Moyenne des visiteurs :": "Visitor average:", "Correspondance :": "Match:", "D'où vient ce score": "Where this score comes from",
    "Thème": "Genre", "Ambiance": "Theme", "Année": "Year", "titres, tous supports confondus, les plus acclamés d'abord.": "titles across movies, shows and games, most acclaimed first.",
    "titres, tous supports confondus, les mieux notés par la critique d'abord.": "titles across movies, shows and games, best reviewed first.",
    "titres, tous supports confondus, les plus récents d'abord.": "titles across movies, shows and games, newest first.",
    "titres, tous supports confondus, ceux en tendance cette semaine d'abord.": "titles across movies, shows and games, trending this week first.",
    "Rien à afficher pour cette liste.": "Nothing to show for this list.", "Liste indisponible pour le moment.": "List unavailable right now.", "Aucun titre dans le catalogue.": "No title in the catalog.",
  };
  const T = t => MOTS[t] ?? t;
  const REGLES = [
    [/^Notre meilleur choix pour toi, (\d+) %$/, (_, n) => `Our top pick for you, ${n}%`],
    [/^(\d+) % positifs sur ([\d\s ]+) avis$/, (_, p, n) => `${p}% positive out of ${n.trim().replace(/\s/g, ",")} reviews`],
    [/^(Tout|Films|Séries|Jeux) (\d+)$/, (_, k, n) => `${T(k)} ${n}`],
    [/^(Film|Série|Jeu), (\d+)$/, (_, k, n) => `${T(k)}, ${n}`],
    [/^(\d{4}), (.+)$/, (_, a, t) => `${a}, ${T(t)}`],
    [/^Mêmes ambiances, autre support : ce que tes (jeux|films et séries) disent de toi\.$/, (_, k) => `Same vibes, different screen: what your ${k === "jeux" ? "games say" : "movies and shows say"} about you.`],
    [/^Rien trouvé pour « (.*) »\.$/, (_, q) => `No results for "${q}".`],
    [/^([\d.,]+) \/5, (\d+) avis$/, (_, m, n) => `${m} /5, ${n} review${n > 1 ? "s" : ""}`],
    [/^sur 5, (\d+) avis$/, (_, n) => `out of 5, ${n} review${n > 1 ? "s" : ""}`],
    [/^(J'adore|J'aime|Déjà vu|Déjà joué|Pas pour moi) : (.+)$/, (_, k, t) => `${T(k)}: ${t}`],
    [/^Ajouté à « (.+) »$/, (_, t) => `Added to \u201c${t}\u201d`], [/^Liste « (.+) » créée$/, (_, t) => `List \u201c${t}\u201d created`],
    [/^Mes listes \((\d+)\)$/, (_, n) => `My lists (${n})`], [/^(Partager|Supprimer|Retirer) (.+)$/, (_, v, t) => `${{Partager: "Share", Supprimer: "Delete", Retirer: "Remove"}[v]} ${t}`],
    [/^Fiche et avis : (.+)$/, (_, t) => `Details and reviews: ${t}`],
    [/^Les (\d+) premiers sont affichés\.$/, (_, n) => `The first ${n} are shown.`],
    [/^Avis sur (.+)$/, (_, t) => `Reviews of ${t}`],
    [/^Ton avis sur (.+)$/, (_, t) => `Your rating for ${t}`],
    [/^(\d) sur 5$/, (_, n) => `${n} out of 5`],
    [/^Connecté : (.+)$/, (_, m) => `Signed in: ${m}`],
    [/^Envoi impossible : (.+)$/, (_, e) => `Couldn't post: ${e}`],
    [/^(.+) \((.+)\) : (\d+) titres? ajoutés?, (\d+) absents? du catalogue\.$/, (_, f, s, a, b) => `${f} (${s}): ${a} title${a > 1 ? "s" : ""} added, ${b} not in the catalog.`],
  ];
  const traduire = t => {
    const c = t.trim();
    if (!c) return t;
    let r = MOTS[c];
    if (r === undefined) for (const [re, f] of REGLES) if (re.test(c)) { r = c.replace(re, f); break; }
    return r === undefined ? t : t.replace(c, r);
  };
  const ATTR = ["placeholder", "title", "aria-label"];
  const passer = racine => {
    if (racine.nodeType === 3) { const v = traduire(racine.nodeValue); if (v !== racine.nodeValue) racine.nodeValue = v; return; }
    if (racine.nodeType !== 1 || racine.tagName === "SCRIPT" || racine.tagName === "STYLE") return;
    for (const e of [racine, ...racine.querySelectorAll("[placeholder],[title],[aria-label]")])
      for (const a of ATTR) { const v = e.getAttribute?.(a); if (v) { const w = traduire(v); if (w !== v) e.setAttribute(a, w); } }
    const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { if (n.parentElement.closest("script,style")) continue; const v = traduire(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  };
  document.documentElement.lang = "en";
  document.title = "Pontil: your movies, shows and games, connected";
  const conf = window.confirm;
  window.confirm = m => conf({"Effacer tous tes goûts de ce navigateur ?": "Clear all your ratings from this browser?", "Supprimer cette liste ?": "Delete this list?"}[m] || m);
  passer(document.body);
  new MutationObserver(l => l.forEach(m => {
    if (m.type === "characterData") passer(m.target);
    else if (m.type === "attributes") { const v = m.target.getAttribute(m.attributeName), w = v && traduire(v); if (w && w !== v) m.target.setAttribute(m.attributeName, w); }
    else m.addedNodes.forEach(passer);
  })).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
})();
