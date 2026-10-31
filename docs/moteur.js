// Version navigateur du moteur (site github.io) : même calcul que recos.py, sans serveur.
// Le profil reste dans le navigateur du visiteur (localStorage) ; aucun compte, aucun envoi.
const Moteur = (() => {
  const NOTES = {adore: 2, aime: 1, regarde: 0.5, vu: 0, bof: -1, deteste: -2};
  const CLE = "tastebridge-profil";
  const CELEBRES = {
    // Volontairement mélangés par genre (action, horreur, comédie, animation, drame, SF...) pour que les premiers choix couvrent tout
    film: ["Inception", "The Conjuring", "Superbad", "Spider-Man: Into the Spider-Verse", "The Dark Knight", "La La Land", "Get Out", "Interstellar",
      "The Hangover", "Your Name", "John Wick", "Titanic", "Parasite", "Shrek", "Mad Max: Fury Road", "Hereditary", "The Wolf of Wall Street",
      "Spirited Away", "Gladiator", "The Notebook", "Dune", "It", "Deadpool", "Coco", "Joker", "A Quiet Place", "Pulp Fiction", "Toy Story 3",
      "The Matrix", "Whiplash", "Fast & Furious 7", "Intouchables", "Avengers: Endgame", "Mean Girls", "Oppenheimer", "Harry Potter and the Philosopher's Stone",
      "Top Gun: Maverick", "Knives Out", "Everything Everywhere All at Once", "The Lord of the Rings: The Fellowship of the Ring",
      // Réserve : remplace ceux que le catalogue n'a pas (sans affiche), avant de compléter par les plus connus
      "Up", "Fight Club", "Forrest Gump", "The Lion King", "Inside Out", "Barbie", "Back to the Future", "The Shawshank Redemption"],
    serie: ["Breaking Bad", "Stranger Things", "The Office", "Attack on Titan", "Game of Thrones", "Friends", "The Haunting of Hill House",
      "Squid Game", "Brooklyn Nine-Nine", "Arcane", "Peaky Blinders", "Bridgerton", "The Walking Dead", "Rick and Morty", "Money Heist",
      "The Witcher", "Sex Education", "Dark", "One Piece", "The Boys", "Modern Family", "Sherlock", "Grey's Anatomy", "Chernobyl",
      "Death Note", "Wednesday", "How I Met Your Mother", "Narcos", "The Last of Us", "Lupin", "Black Mirror", "The Simpsons",
      "Euphoria", "Prison Break", "The Mandalorian", "Demon Slayer: Kimetsu no Yaiba", "Succession", "Kaamelott", "True Detective", "Severance",
      "Better Call Saul", "Dexter", "Lost", "The Crown", "Vikings", "Lucifer"],
    jeu: ["Red Dead Redemption 2", "Stardew Valley", "ELDEN RING", "It Takes Two", "Resident Evil 4", "Hades", "The Witcher 3: Wild Hunt — Remastered",
      "Portal 2", "Counter-Strike 2", "Hollow Knight", "Baldur's Gate 3", "Phasmophobia", "Rocket League", "Cyberpunk 2077", "Terraria",
      "Grand Theft Auto V Legacy", "Celeste", "Forza Horizon 5", "Dead by Daylight", "God of War", "Sekiro: Shadows Die Twice - GOTY Edition",
      "Cities: Skylines", "Lethal Company", "Hogwarts Legacy", "DOOM Eternal", "Among Us", "Disco Elysium - The Final Cut", "Euro Truck Simulator 2",
      "Ghost of Tsushima DIRECTOR'S CUT", "Outer Wilds", "Sid Meier's Civilization VI", "Left 4 Dead 2", "Valheim", "Inscryption", "Dead Cells",
      "Minecraft Dungeons", "Half-Life: Alyx", "Persona 5 Royal", "Subnautica", "Monster Hunter: World"],
  };
  let CAT, INDEX, PAR_IMDB, VEC, TENDANCES = {};
  // « Aimés ensemble » par les comptes Pontil (compte.js, fonction Supabase aimes_ensemble) : {id: nombre de comptes}
  let ENSEMBLE = {};

  const simple = t => (t || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const trouver = (dom, titre) => INDEX.get(dom + "|" + simple(titre));
  // Notes externes (notes.py ; IMDb seulement si le site a été publié avec --avec-imdb) et disponibilités (disponibilites.py)
  const notesExt = it => ({imdb: it.imdb, note_imdb: it.note_imdb, votes_imdb: it.votes_imdb, metacritic: it.metacritic, rt: it.rt,
    tmdb: it.tmdb, plateformes: it.plateformes, boutiques: it.boutiques, dispo: it.dispo,
    duree: it.duree, gratuit: it.gratuit, modes: it.modes});  // infos pratiques aussi, pour les filtres

  async function charger() {
    // Tendances de la semaine (tendances.py), mises à jour chaque jour : facultatives, le site marche sans.
    const facultatif = url => fetch(url).then(r => r.ok ? r.json() : {}).catch(() => ({}));
    const signaux = Promise.all([facultatif("tendances.json?v=a0f4bc4578")]);
    const brut = await (await fetch("catalogue.json?v=fd9f6ec296")).json();
    TENDANCES = {};
    for (const s of await signaux) for (const l of Object.values(s)) if (Array.isArray(l)) for (const [i, t] of l) TENDANCES[i] = Math.max(TENDANCES[i] || 0, t);
    CAT = brut.v === 1 ? deplier(brut) : brut;
    INDEX = new Map(); PAR_IMDB = new Map();
    for (const it of Object.values(CAT).sort((a, b) => a.qualite - b.qualite)) {
      INDEX.set(it.dom + "|" + simple(it.titre), it.id); INDEX.set(it.dom + "|" + simple(it.titre_en), it.id);
      if (it.imdb) PAR_IMDB.set(it.imdb, it.id);
    }
    // Site en anglais (même règle que langue.js) : on affiche le titre anglais, la recherche garde les deux
    let langue; try { langue = localStorage.getItem("tastebridge-langue"); } catch {}
    if ((langue || (/^fr/i.test(navigator.language || "fr") ? "fr" : "en")) === "en")
      for (const it of Object.values(CAT)) if (it.titre_en) [it.titre, it.titre_en] = [it.titre_en, it.titre];
    VEC = null;  // calculés au premier besoin : l'accueil s'affiche sans attendre
  }

  // Catalogue compact du site (site.py) : on reconstruit les objets
  function deplier({themes, prefixes, lignes}) {
    const cat = {}, milliers = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    for (const [id, d, titre, titre_en, annee, q, th, img, wiki, imdb, steam, avis, metacritic, rt, note_imdb, votes_imdb, plateformes, boutiques, dispo, duree, gratuit, modes, liens, bande, franchise] of lignes) {
      const dom = ["film", "serie", "jeu"][d];
      const image = dom === "jeu" && steam ? `https://cdn.akamai.steamstatic.com/steam/apps/${steam}/header.jpg` : !img ? undefined : /^\d:/.test(img) ? prefixes[+img[0]] + img.slice(2) : img;
      cat[id] = {id, dom, titre, titre_en: titre_en || titre, annee: annee || undefined, qualite: q / 1e4, themes: th.map(k => themes[k]), image,
        wiki: wiki || undefined, imdb: imdb || undefined, steam: steam || undefined, avis: avis ? `${avis[0]} % positifs sur ${milliers(avis[1])} avis` : undefined,
        metacritic: metacritic ?? undefined, rt: rt ?? undefined, note_imdb: note_imdb ?? undefined, votes_imdb: votes_imdb ?? undefined,
        plateformes: plateformes || undefined, boutiques: boutiques || undefined, dispo: dispo || undefined,
        duree: duree || undefined, gratuit: gratuit || undefined, modes: modes || undefined, liens: liens || undefined, bande: bande || undefined, franchise: franchise || undefined};
    }
    return cat;
  }

  // Poids des thèmes : un thème présent partout compte moins qu'un thème rare
  function vecteurs() {
    const compte = {};
    for (const it of Object.values(CAT)) for (const th of it.themes) compte[th] = (compte[th] || 0) + 1;
    const n = Object.keys(CAT).length;
    VEC = {};
    for (const [i, it] of Object.entries(CAT)) {
      const v = {}; let s = 0;
      for (const th of it.themes) { v[th] = Math.log(n / compte[th]); s += v[th] ** 2; }
      s = Math.sqrt(s) || 1; for (const th in v) v[th] /= s;
      VEC[i] = v;
    }
    return VEC;
  }
  const V = () => VEC || vecteurs();

  // Mes services et plateformes (réglage de « Mes goûts ») : un titre disponible chez toi passe un peu devant (×1,1)
  const SERVICES = {netflix: ["netflix"], prime: ["amazon prime", "prime video"], disney: ["disney"], canal: ["canal"], apple: ["apple tv"],
    max: ["max", "hbo max"], paramount: ["paramount"], crunchyroll: ["crunchyroll"],
    pc: ["pc", "steam", "gog", "epic", "ms"], playstation: ["ps5", "ps4", "ps", "playstation"], xbox: ["xbox series", "xbox one"], switch: ["switch", "eshop"], mac: ["mac"]};
  const mesServices = () => { try { return JSON.parse(localStorage.getItem("tastebridge-services")) || []; } catch { return []; } };
  const pays = () => { let l; try { l = localStorage.getItem("tastebridge-langue"); } catch {} return (l || (/^fr/i.test(navigator.language || "fr") ? "fr" : "en")) === "en" ? "US" : "FR"; };
  // Où le titre est disponible : plateformes et boutiques (jeux), services d'abonnement du pays (films, séries)
  const endroits = it => it.dom === "jeu" ? ["steam", ...(it.plateformes || []), ...Object.keys(it.boutiques || {})].map(x => x.toLowerCase())
    : (it.dispo?.[pays()]?.abo || []).map(x => x.toLowerCase());
  const chezMoi = (it, services = mesServices()) => { const e = endroits(it); return services.filter(k => (SERVICES[k] || []).some(a => e.some(x => x === a || x.startsWith(a + " ")))); };

  // Bonus « aimé aussi par les gens qui aiment tes titres » : de ×1 (aucun compte) à ×1,5 (le titre le plus partagé)
  const ensemble = i => { const n = ENSEMBLE[i] || 0, max = Math.max(0, ...Object.values(ENSEMBLE)); return n ? 1 + 0.5 * n / max : 1; };

  // Le ton compte : un dessin animé familial colle mal à The Witcher même s'ils partagent « Fantasy »
  const TONS = ["Animation, famille", "Sombre, adulte"];
  const dotV = (a, b) => Object.entries(V()[a]).reduce((s, [th, x]) => s + (V()[b][th] || 0) * x, 0);
  // Note critique : Metacritic, sinon Rotten Tomatoes, sinon avis Steam (« 92 % positifs… ») ; jamais inventée
  const noteCritique = it => it.metacritic ?? it.rt ?? (it.avis ? parseInt(it.avis) : null);
  const court = (it, plus) => ({id: it.id, dom: it.dom, titre: it.titre, annee: it.annee, image: it.image, avis: it.avis, steam: it.steam, wiki: it.wiki, ...notesExt(it), ...plus});

  // Même jeu, autre édition (Skyrim / Skyrim Special Edition, Oblivion GOTY Deluxe (2009)) : un seul des deux en reco
  const edition = t => simple(t).replace(/\b(19|20)\d\d\b|\b(special|definitive|deluxe|complete|ultimate|anniversary|remastered|enhanced|legendary|gold|goty|game of the year|directors? cut|edition)\b/g, "").replace(/\s+/g, " ").trim();
  // Fiche : les titres les plus proches (même similarité cosinus que les recos), jusqu'à 12 par support, le support de la fiche d'abord.
  // La ressemblance prime (au carré, notoriété à 50 % : avant, 65 % de notoriété mettait Skyrim devant Firewatch sur la fiche de Dredge).
  // Avec un profil (mode « Pour moi ») : moitié ressemblance au titre, moitié ressemblance à tes goûts.
  function proches(id, prof = null) {
    const res = {film: [], serie: [], jeu: []}, vus = new Set([edition(CAT[id].titre)]);
    const norme = prof ? Math.hypot(...Object.values(prof)) || 1 : 1;
    for (const [i, it] of Object.entries(CAT)) {
      if (i === id || !it.image || it.qualite < 0.6 || (prof && prof.deja.has(i))) continue;  // trop confidentiel : souvent un titre au hasard
      const sim = dotV(id, i);
      if (sim < 0.3) continue;
      const ton = TONS.some(t => (t in V()[i]) !== (t in V()[id])) ? 0.4 : 1;
      const gout = prof ? Math.max(0, Object.entries(V()[i]).reduce((s, [th, x]) => s + (prof[th] || 0) * x, 0) / norme) : 0;
      res[it.dom].push([(prof ? 0.5 * sim + 0.5 * gout : sim) ** 2 * (0.5 + 0.5 * it.qualite) * ton, i, sim, gout]);
    }
    return ["film", "serie", "jeu"].sort((a, b) => (b === CAT[id].dom) - (a === CAT[id].dom))
      .flatMap(d => res[d].sort((a, b) => b[0] - a[0]).filter(([, i]) => { const e = edition(CAT[i].titre); return !vus.has(e) && vus.add(e); }).slice(0, 12))
      .map(([, i, sim, gout]) => court(CAT[i], {themes: CAT[i].themes.slice(0, 3), parce_que: [], match: Math.round((prof ? 0.5 * sim + 0.5 * gout : sim) * 100),
        communs: Object.keys(V()[i]).filter(th => th in V()[id]).sort((a, b) => V()[id][b] * V()[i][b] - V()[id][a] * V()[i][a]).slice(0, 3)}));
  }
  // Profil pour le mode « Pour moi » de la fiche (null sans titre aimé)
  function profilGouts(id) {
    const notes = profil().notes, prof = {};
    let aime = false;
    for (const [i, note] of Object.entries(notes)) if (CAT[i] && NOTES[note] && i !== id) {
      aime ||= NOTES[note] > 0;
      for (const [th, v] of Object.entries(V()[i])) prof[th] = (prof[th] || 0) + NOTES[note] * v;
    }
    if (!aime) return null;
    Object.defineProperty(prof, "deja", {value: new Set(Object.keys(notes))});  // non énumérable : hors de la norme
    return prof;
  }

  // Fiche : d'où vient le pourcentage (même calcul que les recos), ou null sans titre aimé
  function pourToi(id) {
    const poids = {};
    for (const [i, note] of Object.entries(profil().notes)) if (CAT[i] && NOTES[note] && i !== id) poids[i] = NOTES[note];
    const aimes = Object.keys(poids).filter(j => poids[j] > 0);
    if (!aimes.length) return null;
    const prof = {};
    for (const [i, x] of Object.entries(poids)) for (const [th, v] of Object.entries(V()[i])) prof[th] = (prof[th] || 0) + x * v;
    const norme = Math.hypot(...Object.values(prof)) || 1;
    const sim = Object.entries(V()[id]).reduce((s, [th, x]) => s + (prof[th] || 0) * x, 0) / norme;
    const pourquoi = aimes.map(j => [dotV(id, j), j]).sort((a, b) => b[0] - a[0]).slice(0, 2).filter(([s]) => s > 0);
    return {match: Math.round(Math.max(sim, pourquoi[0]?.[0] || 0) * 100),
      parce_que: pourquoi.map(([s, j]) => ({id: j, dom: CAT[j].dom, titre: CAT[j].titre, sim: Math.round(s * 100)})),
      communs: Object.keys(V()[id]).filter(th => (prof[th] || 0) > 0).sort((a, b) => prof[b] * V()[id][b] - prof[a] * V()[id][a]).slice(0, 3)};
  }

  function profil() {
    try { return JSON.parse(localStorage.getItem(CLE)) || {notes: {}}; } catch { return {notes: {}}; }
  }
  // Prévient compte.js (synchro du compte, s'il est connecté) à chaque changement
  function sauver(p) { try { localStorage.setItem(CLE, JSON.stringify(p)); } catch {} dispatchEvent(new CustomEvent("profil-change")); }

  function classer(poids, cible, deja) {
    const prof = {};
    for (const [i, x] of Object.entries(poids)) for (const [th, v] of Object.entries(V()[i])) prof[th] = (prof[th] || 0) + x * v;
    const norme = Math.hypot(...Object.values(prof));
    if (!norme) return [[], prof];
    const res = [];
    for (const [i, it] of Object.entries(CAT)) {
      if (it.dom !== cible || deja.has(i)) continue;
      let sim = 0; for (const [th, x] of Object.entries(V()[i])) sim += (prof[th] || 0) * x;
      sim /= norme;
      const a = it.annee || (it.dom === "jeu" && it.steam > 500000 ? 2016 : 2008);
      let recence = a >= 2015 ? 1 : a >= 2005 ? 0.85 : 0.7;
      if (it.qualite > 0.9) recence = Math.max(recence, 0.95);  // grands classiques gardés
      // Qualité = notoriété mêlée à la critique quand elle existe (sinon un remake connu mais mal reçu passe devant un film acclamé)
      // sans critique connue : 60, valeur neutre servant au classement seulement, jamais affichée
      const crit = noteCritique(it) ?? 60, q = 0.5 * it.qualite + 0.5 * Math.min(1, crit / 100);
      // Un seul thème connu : ressemblance « parfaite » trompeuse (fiche pauvre), confiance réduite
      const info = Object.keys(V()[i]).length > 1 ? 1 : 0.8;
      res.push([sim * (0.35 + 0.65 * q) * recence * info, i, sim]);
    }
    res.sort((a, b) => b[0] - a[0]);
    return [res, prof];
  }

  // Notoriété d'un titre de 0 à 1 : Wikipédias qui en parlent (films, séries ; 80 et plus = très connu) ou avis Steam (jeux ; un million = 1)
  const connu = it => it.dom === "jeu" ? Math.min(1, Math.log10(1 + +((it.avis || "").match(/sur ([\d ]+) avis/)?.[1] || "0").replace(/ /g, "")) / 6)
    : Math.min(1, (it.liens || 0) / 80);

  function recos(p, cible, sources, n = 12) {
    const poids = {};
    for (const [i, note] of Object.entries(p.notes)) if (CAT[i] && NOTES[note] && sources.includes(CAT[i].dom)) poids[i] = NOTES[note];
    const [res, prof] = classer(poids, cible, new Set(Object.keys(p.notes)));
    const dot = (a, b) => Object.entries(V()[a]).reduce((s, [th, x]) => s + (V()[b][th] || 0) * x, 0);
    // Un seul profil additionné laisse un titre aux thèmes rares tout écraser (un Disney => que du Disney).
    // Chaque titre aimé a donc sa propre liste, et on pioche à tour de rôle (les « adoré » et les plus récents d'abord).
    const ok = res.filter(r => r[2] > 0.15 && CAT[r[1]].image);  // sans affiche, une reco donne une carte vide
    // Un titre connu passe devant un titre confidentiel à ressemblance égale (×0,75 inconnu, ×1 très connu)
    const notoriete = i => 0.75 + 0.25 * connu(CAT[i]);
    const services = mesServices();
    // Bonus : disponible sur un de tes services (×1,1), en tendance cette semaine (jusqu'à ×1,1)
    const qual = new Map(ok.map(([s, i, sim]) => [i, s / sim * (services.length && chezMoi(CAT[i], services).length ? 1.1 : 1) * (1 + 0.1 * (TENDANCES[i] || 0)) * ensemble(i) * notoriete(i)]));
    const ancres = Object.keys(poids).filter(j => poids[j] > 0).reverse().sort((a, b) => poids[b] - poids[a]).slice(0, 15);
    const ton = (i, j) => TONS.some(t => (t in V()[i]) !== (t in V()[j])) ? 0.4 : 1;
    const listes = ancres.map(j => ok.map(([, i]) => [dot(i, j) * qual.get(i) * ton(i, j), i]).filter(([s]) => s > 0.12).sort((a, b) => b[0] - a[0]).map(([, i]) => i));
    const choix = [], pris = new Set();
    for (let tour = 0; choix.length < n && listes.some(l => l.length); tour++)
      for (const l of listes) {
        while (l.length && pris.has(l[0])) l.shift();
        if (l.length && choix.length < n) { const i = l.shift(); pris.add(i); choix.push(ok.find(r => r[1] === i)); }
      }
    // Le premier tour (un titre par ancre) est rangé par score : la vedette est le meilleur du lot, pas le voisin du dernier titre noté
    const note = i => Math.max(...ancres.map(j => dot(i, j) * qual.get(i) * ton(i, j)));
    choix.unshift(...choix.splice(0, Math.min(listes.length, choix.length)).sort((a, b) => note(b[1]) - note(a[1])));
    // Adaptations : aimer la série The Last of Us doit proposer d'abord le jeu The Last of Us (autre format, même licence)
    const licence = t => simple((t || "").split(/[:–(]| - /)[0]).replace(/^the /, "").replace(/ (\d+|ii|iii|iv|v|vi)( .*)?$/, "").trim();
    const lic = new Set(ancres.filter(j => CAT[j].dom !== cible).flatMap(j => [licence(CAT[j].titre), licence(CAT[j].titre_en)]).filter(l => l.length >= 4));
    // Franchise Wikidata (licences.py) : relie aussi les titres qui ne partagent pas le nom exact
    // (Dragon Ball Z -> FighterZ, Sparking! ZERO), et les autres séries de la licence dans le même format
    const fr = new Set(ancres.map(j => CAT[j].franchise).filter(Boolean));
    let adapt = [];
    if (lic.size || fr.size) {
      const proche = i => Math.max(...ancres.map(j => dot(i, j)));
      // célèbre mais raté (Dragonball Evolution, 14 % Rotten Tomatoes) : passe après les bons titres de la licence
      const critique = i => CAT[i].rt != null ? 0.5 + CAT[i].rt / 200 : CAT[i].metacritic != null ? 0.5 + CAT[i].metacritic / 200 : 0.85;
      const rang = i => CAT[i].qualite * critique(i) * (0.6 + 0.4 * proche(i));
      adapt =Object.keys(CAT).filter(i => CAT[i].dom === cible && CAT[i].image && !(i in p.notes) && (fr.has(CAT[i].franchise) || [CAT[i].titre, CAT[i].titre_en].some(t => [...lic].some(l => (" " + simple(t) + " ").includes(" " + l + " ")))))
        .filter(i => critique(i) >= 0.65).sort((x, y) => rang(y) - rang(x)).slice(0, 4);
      for (const i of adapt) { const k = choix.findIndex(r => r[1] === i); if (k >= 0) choix.splice(k, 1); }
      choix.unshift(...adapt.map(i => [1, i, proche(i)]));
      choix.length = Math.min(choix.length, n);
    }
    // Affichage du plus au moins ressemblant (le pourcentage montré), adaptations d'une licence aimée toujours en tête
    const adaptes = new Set(adapt);
    return choix.map(([, i, sim]) => {
      const it = CAT[i];
      const pourquoi = Object.keys(poids).filter(j => poids[j] > 0).map(j => [dot(i, j), j]).sort((a, b) => b[0] - a[0]).slice(0, 2);
      const communs = Object.keys(V()[i]).sort((a, b) => (prof[b] || 0) * V()[i][b] - (prof[a] || 0) * V()[i][a]).slice(0, 3);
      return {id: i, dom: it.dom, titre: it.titre, annee: it.annee, image: it.image, avis: it.avis, steam: it.steam, wiki: it.wiki, ...notesExt(it),
        themes: communs.filter(t => (prof[t] || 0) > 0), parce_que: pourquoi.filter(([s]) => s > 0).map(([, j]) => ({id: j, dom: CAT[j].dom, titre: CAT[j].titre})), match: Math.round(Math.max(sim, pourquoi[0]?.[0] || 0) * 100)};
    }).sort((a, b) => adaptes.has(b.id) - adaptes.has(a.id) || b.match - a.match);
  }

  // ---------- Imports CSV ----------
  function lireCsv(texte) {
    const lignes = []; let ligne = [], champ = "", guill = false;
    texte = texte.replace(/^﻿/, "");
    for (let k = 0; k < texte.length; k++) {
      const c = texte[k];
      if (guill) { if (c === '"') { if (texte[k + 1] === '"') { champ += '"'; k++; } else guill = false; } else champ += c; }
      else if (c === '"') guill = true;
      else if (c === ",") { ligne.push(champ); champ = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && texte[k + 1] === "\n") k++; ligne.push(champ); lignes.push(ligne); ligne = []; champ = ""; }
      else champ += c;
    }
    if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne); }
    const [tete, ...corps] = lignes.filter(l => l.some(x => x.trim()));
    return tete ? corps.map(l => Object.fromEntries(tete.map((h, k) => [h.trim(), (l[k] || "").trim()]))) : [];
  }

  const SAISON = /\b(season|saison|temporada|staffel|stagione|part|partie|parte|teil|chapter|chapitre|episode|épisode|limited series|mini-?série|volume|vol\.|book|livre|collection)\b/i;

  function lireExport(texte) {
    const rows = lireCsv(texte);
    if (!rows.length) throw new Error("Fichier vide ou pas au format CSV.");
    const cols = new Set(Object.keys(rows[0]));
    const a = (...c) => c.every(x => cols.has(x));
    if (a("Const", "Your Rating")) return ["IMDb", rows.map(r => {
      const n = +r["Your Rating"], t = (r["Title Type"] || "").toLowerCase();
      return [r.Title, r.Const, n >= 9 ? "adore" : n >= 7 ? "aime" : n >= 5 ? "vu" : n >= 3 ? "bof" : "deteste",
        t.includes("game") ? "jeu" : t.includes("series") ? "serie" : t.includes("movie") ? "film" : null];
    })];
    if (a("Name", "Letterboxd URI")) return ["Letterboxd", rows.map(r => {
      const n = +r.Rating;
      return [r.Name, null, !r.Rating ? "regarde" : n >= 4.5 ? "adore" : n >= 3.5 ? "aime" : n >= 2.5 ? "vu" : n >= 1.5 ? "bof" : "deteste", "film"];
    })];
    if (a("Title Name", "Thumbs Value")) return ["Netflix (notes)", rows.filter(r => ({1: 1, 2: 1, 3: 1})[r["Thumbs Value"]])
      .map(r => [r["Title Name"], null, {1: "bof", 2: "aime", 3: "adore"}[r["Thumbs Value"]], null])];
    if (a("Title", "Date") && cols.size === 2) {
      const ep = {}, films = new Set();
      for (const r of rows) {
        const parts = r.Title.split(/\s?:\s/).map(x => x.trim()).filter(Boolean);
        if (parts.length >= 3 || (parts.length === 2 && SAISON.test(parts[1]))) ep[parts[0]] = (ep[parts[0]] || 0) + 1;
        else if (parts.length) films.add(r.Title);
      }
      // Une série dont on a vu 3 épisodes ou plus, on l'a sans doute aimée
      return ["Netflix", [...[...films].map(t => [t, null, "regarde", null]), ...Object.entries(ep).map(([t, n]) => [t, null, n >= 3 ? "aime" : "regarde", "serie"])]];
    }
    const col = Object.keys(rows[0]).find(c => ["title", "titre", "name", "nom", "title name", "video title"].includes(c.toLowerCase()));
    if (col) return ["CSV", rows.filter(r => r[col]).map(r => [r[col], null, "regarde", null])];
    throw new Error("Format non reconnu : il faut un export Netflix, IMDb, Letterboxd ou un CSV avec une colonne Title.");
  }

  // ---------- API identique à celle du serveur local ----------
  return {
    charger,
    ensemble(lignes) { ENSEMBLE = Object.fromEntries((lignes || []).map(l => [l.item, l.n])); },
    aimes() { return Object.entries(profil().notes).filter(([i, n]) => CAT[i] && NOTES[n] > 0).map(([i]) => i); },
    recos() {
      const p = profil(), ecrans = ["film", "serie"];
      return {
        film: [["D'après tes films et séries", recos(p, "film", ecrans, 25)], ["D'après tes jeux", recos(p, "film", ["jeu"], 12)]],
        serie: [["D'après tes films et séries", recos(p, "serie", ecrans, 25)], ["D'après tes jeux", recos(p, "serie", ["jeu"], 12)]],
        jeu: [["D'après tes jeux", recos(p, "jeu", ["jeu"], 25)], ["D'après tes films et séries", recos(p, "jeu", ecrans, 12)]],
      };
    },
    // Le dé : une œuvre au hasard parmi celles qui collent à tes goûts, hors titres notés, déjà affichés
    // ou de la même licence qu'un titre aimé (aimer The Witcher 3 ne doit pas sortir The Witcher 2)
    hasard(type, affiches = []) {
      const p = profil();
      const poids = {};
      for (const [i, note] of Object.entries(p.notes)) if (CAT[i] && NOTES[note]) poids[i] = NOTES[note];
      const aimes = Object.keys(poids).filter(i => poids[i] > 0);
      if (!aimes.length) return null;
      const licence = t => simple(t.split(/[:–(]| - /)[0]).replace(/^the /, "").replace(/ (\d+|ii|iii|iv|v|vi)( .*)?$/, "").trim();
      const licences = new Set(aimes.flatMap(i => [licence(CAT[i].titre), licence(CAT[i].titre_en)]).filter(l => l.length >= 4));
      const memeLicence = it => [it.titre, it.titre_en].some(t => { const s = " " + simple(t) + " "; return [...licences].some(l => s.includes(" " + l + " ")); });
      const exclus = new Set([...Object.keys(p.notes), ...affiches]);
      const doms = type === "tout" ? ["film", "serie", "jeu"] : [type];
      const pool = doms.flatMap(d => classer(poids, d, exclus)[0].filter(r => r[2] > 0.2).slice(0, 250))
        .filter(([, i]) => CAT[i].image && !memeLicence(CAT[i]));
      if (!pool.length) return null;
      // Tirage pondéré : les meilleures correspondances sortent plus souvent, sans être systématiques
      let total = pool.reduce((s, r) => s + r[0], 0), x = Math.random() * total, choix = pool[0];
      for (const r of pool) { x -= r[0]; if (x <= 0) { choix = r; break; } }
      const [, i, sim] = choix, it = CAT[i];
      const dot = j => Object.entries(V()[i]).reduce((s, [th, v]) => s + (V()[j][th] || 0) * v, 0);
      const parce = aimes.map(j => [dot(j), j]).sort((a, b) => b[0] - a[0])[0];
      return {id: i, dom: it.dom, titre: it.titre, annee: it.annee, image: it.image, avis: it.avis, steam: it.steam, wiki: it.wiki, ...notesExt(it),
        themes: it.themes.slice(0, 3), parce_que: parce && parce[0] > 0 ? [{id: parce[1], dom: CAT[parce[1]].dom, titre: CAT[parce[1]].titre}] : [], match: Math.round(sim * 100)};
    },
    gouts() {
      return Object.entries(profil().notes).filter(([i]) => CAT[i]).map(([i, note]) => ({id: i, dom: CAT[i].dom, titre: CAT[i].titre, annee: CAT[i].annee, image: CAT[i].image, note}))
        .sort((a, b) => (a.dom + a.titre).localeCompare(b.dom + b.titre));
    },
    cherche(q) {
      // Dès la première lettre : avec une seule, seulement les titres qui commencent par elle (sinon presque tout correspond)
      q = simple(q); if (!q) return [];
      const ok = t => q.length < 2 ? simple(t).startsWith(q) : simple(t).includes(q);
      return Object.values(CAT).filter(it => ok(it.titre) || ok(it.titre_en))
        .sort((a, b) => (simple(a.titre).startsWith(q) ? 0 : 1) - (simple(b.titre).startsWith(q) ? 0 : 1) || b.qualite - a.qualite)
        .slice(0, 20).map(it => ({id: it.id, dom: it.dom, titre: it.titre, annee: it.annee, image: it.image, steam: it.steam, themes: it.themes.slice(0, 3), ...notesExt(it)}));
    },
    // Titres les plus acclamés d'un domaine, pour qu'un nouveau visiteur note quelques titres d'entrée
    // Titres très connus d'abord (choisis à la main), complétés par les mieux notés du catalogue
    populaires(dom, n = 18) {
      const notes = profil().notes;
      const connus = (CELEBRES[dom] || []).map(t => trouver(dom, t)).filter(Boolean).map(i => CAT[i]);
      // Complément par notoriété : le mieux noté seul sortait des titres que personne ne connaît
      const reste = Object.values(CAT).filter(it => it.dom === dom && it.image && (it.annee || 0) >= 2008).sort((a, b) => connu(b) - connu(a) || b.qualite - a.qualite);
      // Les titres déjà notés restent, avec leur note : en revenant sur l'accueil, on voit où on en est
      return [...new Set([...connus, ...reste])].filter(it => it.image).slice(0, n)
        .map(it => ({id: it.id, dom: it.dom, titre: it.titre, annee: it.annee, image: it.image, steam: it.steam, note: notes[it.id] || ""}));
    },
    tendance: id => TENDANCES[id] || 0,
    // En ce moment : les tendances de la semaine, celles qui te ressemblent d'abord (moitié tendance, moitié goûts)
    tendances(dom, n = 12) {
      const p = profil(), poids = {};
      for (const [i, note] of Object.entries(p.notes)) if (CAT[i] && NOTES[note]) poids[i] = NOTES[note];
      const prof = {};
      for (const [i, x] of Object.entries(poids)) for (const [th, v] of Object.entries(V()[i])) prof[th] = (prof[th] || 0) + x * v;
      const norme = Math.hypot(...Object.values(prof)) || 1;
      const sim = i => Object.entries(V()[i]).reduce((s, [th, x]) => s + (prof[th] || 0) * x, 0) / norme;
      return Object.entries(TENDANCES).filter(([i]) => CAT[i]?.dom === dom && CAT[i].image && !p.notes[i])
        .map(([i, t]) => [0.5 * t + 0.5 * Math.max(0, sim(i)), i]).sort((a, b) => b[0] - a[0]).slice(0, n)
        .map(([, i]) => court(CAT[i], {themes: CAT[i].themes.slice(0, 3), parce_que: [], tendance: true}));
    },
    // Titres d'une liste partagée, dans l'ordre, sans ceux qui ne sont plus au catalogue
    titres(ids) { return ids.filter(i => CAT[i]).map(i => court(CAT[i], {themes: CAT[i].themes.slice(0, 3), parce_que: []})); },
    fiche(id) {
      const it = CAT[id]; if (!it) return null;
      return {...it, note: profil().notes[id] || "", similaires: proches(id), pour_moi: (p => p && proches(id, p))(profilGouts(id)), pour_toi: pourToi(id)};
    },
    // Liste d'un thème (ou d'une ambiance = plusieurs thèmes) et/ou d'une année, tous supports, les plus acclamés d'abord
    // ou selon le tri choisi ; un titre sans la donnée (ou pas encore sorti, pour « récents ») passe après
    liste({themes = [], annee = null, tri = "acclames"} = {}) {
      const cle = {critique: noteCritique, recents: it => it.annee <= new Date().getFullYear() ? it.annee : null, tendance: it => TENDANCES[it.id]}[tri] || (() => 0);
      const l = Object.values(CAT).filter(it => it.image && themes.every(t => it.themes.includes(t)) && (!annee || it.annee === annee))
        .sort((a, b) => (cle(b) ?? -Infinity) - (cle(a) ?? -Infinity) || b.qualite - a.qualite);
      return {total: l.length, titres: l.slice(0, 60).map(it => court(it, {themes: it.themes.slice(0, 3), parce_que: []}))};
    },
    noter(id, note) {
      const p = profil(); if (!CAT[id]) return;
      delete p.notes[id]; if (note in NOTES) p.notes[id] = note; sauver(p);
    },
    importer(texte) {
      const p = profil(); const [source, lignes] = lireExport(texte); let reconnus = 0, inconnus = 0;
      for (const [titre, imdb, note, dom] of lignes) {
        let i = imdb && PAR_IMDB.get(imdb);
        if (!i) for (const d of dom ? [dom] : ["film", "serie"]) if ((i = trouver(d, titre))) break;
        if (!i) { inconnus++; continue; }
        const avant = p.notes[i];
        if (!avant || (NOTES[note] > NOTES[avant] && (avant === "regarde" || avant === "vu"))) { p.notes[i] = note; reconnus++; }
      }
      sauver(p); return {source, reconnus, inconnus};
    },
    chezMoi: it => chezMoi(it), pays,
    exporter: () => JSON.stringify(profil(), null, 1),
    restaurer(texte) { const p = JSON.parse(texte); if (!p || typeof p.notes !== "object") throw new Error("Fichier de profil invalide."); sauver({notes: p.notes}); },
    vider() { sauver({notes: {}}); },
  };
})();
