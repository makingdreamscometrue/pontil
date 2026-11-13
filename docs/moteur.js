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
  // Titres simplifiés (sans accents ni ponctuation), calculés une fois par titre : la recherche les relit à chaque touche
  let SIMPLES = null;
  const simples = it => { SIMPLES ||= new Map(); let v = SIMPLES.get(it.id); if (!v) SIMPLES.set(it.id, v = [simple(it.titre), simple(it.titre_en)]); return v; };
  // Index titre -> identifiant, construit au premier besoin (import, titres de l'accueil) : le bâtir à l'arrivée du catalogue
  // entier bloquait le téléphone (68 000 titres à simplifier d'un coup)
  function index() {
    if (INDEX) return INDEX;
    INDEX = new Map(); PAR_IMDB = new Map();
    for (const it of Object.values(CAT).sort((a, b) => a.qualite - b.qualite)) {
      const [a, b] = simples(it);
      INDEX.set(it.dom + "|" + a, it.id); INDEX.set(it.dom + "|" + b, it.id);
      if (it.imdb) PAR_IMDB.set(it.imdb, it.id);
    }
    return INDEX;
  }
  const trouver = (dom, titre) => index().get(dom + "|" + simple(titre));
  // Notes externes (notes.py ; IMDb seulement si le site a été publié avec --avec-imdb) et disponibilités (disponibilites.py)
  const notesExt = it => ({imdb: it.imdb, note_imdb: it.note_imdb, votes_imdb: it.votes_imdb, metacritic: it.metacritic, rt: it.rt, tvmaze: it.tvmaze,
    tmdb: it.tmdb, plateformes: it.plateformes, boutiques: it.boutiques, dispo: it.dispo,
    duree: it.duree, gratuit: it.gratuit, modes: it.modes});  // infos pratiques aussi, pour les filtres

  // Chargement en deux temps (11/11/2026) : sur un téléphone en 4G, le catalogue entier (2 Mo compressés) laissait
  // l'accueil figé 16 s. L'amorce (pages.js : les titres les plus connus, même format) arrive d'abord : on peut déjà
  // noter et chercher. Le catalogue entier suit ; « complet » se résout quand il est en place.
  let entier = false, finPret, finComplet;
  const pret = new Promise(r => { finPret = r; }), complet = new Promise(r => { finComplet = r; });
  async function charger() {
    // Tendances de la semaine (tendances.py), mises à jour chaque jour : facultatives, le site marche sans.
    const facultatif = url => fetch(url).then(r => r.ok ? r.json() : {}).catch(() => ({}));
    const signaux = Promise.all([facultatif("tendances.json?v=f548fd20ef")]);
    const amorce = await fetch("amorce.json?v=41ac47a066").then(r => r.ok ? r.json() : null).catch(() => null);
    TENDANCES = {};
    for (const s of await signaux) for (const l of Object.values(s)) if (Array.isArray(l)) for (const [i, t] of l) TENDANCES[i] = Math.max(TENDANCES[i] || 0, t);
    // Réseau coupé en cours de route (métro) : on réessaie, le site reste utilisable sur l'amorce en attendant
    const tout = async () => {
      for (let essai = 0; ; essai++) {
        try { installer(await (await fetch("catalogue.json?v=41ac47a066")).json()); break; }
        catch (e) { if (!amorce || essai >= 5) throw e; await new Promise(r => setTimeout(r, 2000 * (essai + 1))); }
      }
      entier = true; finComplet();
    };
    if (amorce?.lignes?.length) { installer(amorce); tout().catch(() => {}); }
    else await tout();
  }
  function installer(brut) {
    CAT = brut.v === 1 ? deplier(brut) : brut;
    INDEX = null; PAR_IMDB = null; SIMPLES = null;
    // Site en anglais (même règle que langue.js) : on affiche le titre anglais, la recherche garde les deux
    let langue; try { langue = localStorage.getItem("tastebridge-langue"); } catch {}
    if ((langue || ((/^fr/i.test(navigator.language || "fr") || /bot|crawl|spider|google|bing|gptbot|perplexity/i.test(navigator.userAgent || "")) ? "fr" : "en")) === "en")
      for (const it of Object.values(CAT)) if (it.titre_en) [it.titre, it.titre_en] = [it.titre_en, it.titre];
    VEC = null; RARETE = null; POIDS = null; POPULAIRES = null; PONTS = null;  // calculés au premier besoin : l'accueil s'affiche sans attendre
    finPret();
  }

  // Catalogue compact du site (site.py) : on reconstruit les objets
  function deplier({themes, tags = [], prefixes, lignes}) {
    const cat = {}, milliers = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    for (const [id, d, titre, titre_en, annee, q, th, img, wiki, imdb, steam, avis, metacritic, rt, note_imdb, votes_imdb, plateformes, boutiques, dispo, duree, gratuit, modes, liens, bande, franchise, tg, tvm, pt] of lignes) {
      const dom = ["film", "serie", "jeu"][d];
      const image = dom === "jeu" && steam ? `https://cdn.akamai.steamstatic.com/steam/apps/${steam}/header.jpg` : !img ? undefined : /^\d:/.test(img) ? prefixes[+img[0]] + img.slice(2) : img;
      cat[id] = {id, dom, titre, titre_en: titre_en || titre, annee: annee || undefined, qualite: q / 1e4, themes: th.map(k => themes[k]), image,
        wiki: wiki || undefined, imdb: imdb || undefined, steam: steam || undefined, avis: avis ? `${avis[0]} % positifs sur ${milliers(avis[1])} avis` : undefined,
        metacritic: metacritic ?? undefined, rt: rt ?? undefined, tvmaze: tvm ? tvm / 10 : undefined, note_imdb: note_imdb ?? undefined, votes_imdb: votes_imdb ?? undefined,
        plateformes: plateformes || undefined, boutiques: boutiques || undefined, dispo: dispo || undefined,
        duree: duree || undefined, gratuit: gratuit || undefined, modes: modes || undefined, liens: liens || undefined, bande: bande || undefined, franchise: franchise || undefined};
      if (tg) Object.defineProperty(cat[id], "tags", {value: tg.map(k => tags[k])});  // non énumérable : hors des fiches
      if (pt) Object.defineProperty(cat[id], "pont", {value: pt.map(k => tags[k])});  // jeux : histoire, univers et ton (tags_pont.py)
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
  const pays = () => { let l; try { l = localStorage.getItem("tastebridge-langue"); } catch {} return (l || ((/^fr/i.test(navigator.language || "fr") || /bot|crawl|spider|google|bing|gptbot|perplexity/i.test(navigator.userAgent || "")) ? "fr" : "en")) === "en" ? "US" : "FR"; };
  // Où le titre est disponible : plateformes et boutiques (jeux), services d'abonnement du pays (films, séries)
  const endroits = it => it.dom === "jeu" ? ["steam", ...(it.plateformes || []), ...Object.keys(it.boutiques || {})].map(x => x.toLowerCase())
    : (it.dispo?.[pays()]?.abo || []).map(x => x.toLowerCase());
  const chezMoi = (it, services = mesServices()) => { const e = endroits(it); return services.filter(k => (SERVICES[k] || []).some(a => e.some(x => x === a || x.startsWith(a + " ")))); };

  // Bonus « aimé aussi par les gens qui aiment tes titres » : de ×1 (aucun compte) à ×1,5 (le titre le plus partagé)
  const ensemble = i => { const n = ENSEMBLE[i] || 0, max = Math.max(0, ...Object.values(ENSEMBLE)); return n ? 1 + 0.5 * n / max : 1; };

  // Le ton compte : un dessin animé familial colle mal à The Witcher même s'ils partagent « Fantasy »
  // « Anime » aussi : L'Attaque des Titans menait à Adventure Time, Your Name à « 17 ans encore »
  // Chaque écart de ton compte : Shrek (familial, pas sombre) s'éloigne deux fois de The Witcher 3, Le Seigneur des anneaux une seule
  const TONS = {"Animation, famille": 0.4, "Sombre, adulte": 0.5, "Anime": 0.35};
  // Entre un jeu et un film ou une série (13/11/2026) : « Sombre, adulte » n'y vient pas des mêmes sources (tags Steam d'un
  // côté, genres Wikidata de l'autre) et écartait le jeu The Last of Us de sa propre série ; et un jeu « familial »
  // (Stardew Valley) peut mener à un film qui ne l'est pas. Reste : un dessin animé pour enfants loin d'un jeu qui ne l'est pas.
  const ecartTon = (a, b) => {
    const ja = CAT[a].dom === "jeu", jb = CAT[b].dom === "jeu", mixte = ja !== jb, jeu = ja ? a : b;
    return Object.entries(TONS).reduce((f, [t, k]) => (t in V()[a]) === (t in V()[b]) ? f
      : mixte && (t === "Sombre, adulte" || (t === "Animation, famille" && t in V()[jeu])) ? f : f * k, petits(a) === petits(b) ? 1 : 0.25);
  };
  // Dessin animé pour les moins de 6 ans (tag « preschool », tags_verif.py) : loin de tout ce qui ne l'est pas.
  // Stardew Valley menait à Pierre Martin le facteur, qui partage « small town, wholesome, slice of life » (13/11/2026)
  const petits = i => !!CAT[i].tags && CAT[i].tags.includes("preschool");
  // Un tag rare compte plus qu'un tag courant : « Choices Matter » définit The Quarry, « Multiplayer » ne dit rien (Dead by Daylight passait devant Until Dawn)
  // Deux familles de tags, jamais comparées entre elles : tags Steam des jeux, étiquettes Wikidata des films et séries
  // (etiquettes.py, 11/11/2026 : genres fins et sujets, « time travel », « space exploration », « heist »)
  let RARETE = null;
  const famille = it => it.dom === "jeu" ? "jeu" : "ecran";
  const rarete = fam => {
    RARETE ||= {};
    if (RARETE[fam]) return RARETE[fam];
    const compte = {}, l = Object.values(CAT).filter(it => it.tags && famille(it) === fam);
    for (const it of l) for (const t of it.tags) compte[t] = (compte[t] || 0) + 1;
    const r = RARETE[fam] = {};
    for (const t in compte) r[t] = Math.log(l.length / compte[t]);
    return r;
  };
  // D'un jeu vers un film ou une série : deux tiers du score viennent des tags « pont » quand les deux titres en ont,
  // un tiers des grands thèmes. Sans eux, The Witcher 3 menait à « Taram et le Chaudron magique » (12/11/2026)
  // Si un seul des deux a des tags pont, l'autre n'a que ses grands thèmes : il ne passe plus devant un titre tagué
  // (Cookie Clicker et Stormworks, sans tag, sortaient pour Stranger Things et Squid Game, 13/11/2026).
  const croise = (a, b) => {
    const p = prochePont(a, b), d = dotCroise(a, b);
    const sim = p !== null ? Math.min(1, 0.35 * d + 0.65 * Math.min(1, 1.6 * p)) : ponts().has(a) || ponts().has(b) ? 0.6 * d : d;
    return sim >= 0.3 && memeUnivers(a, b) ? Math.min(1, sim + 0.4) : sim;
  };
  // Poids des tags d'un titre (rareté, atténuée par le rang) et leur norme : calculés une fois par titre.
  // Recalculés à chaque comparaison, ils faisaient passer la génération des pages de 12 à plus de 15 min (CI coupé le 11/11/2026).
  // Tags de forme, pas d'histoire : comptés, « adult animation » menait Arcane aux Griffin et à Happy Tree Friends (13/11/2026).
  // Le ton, lui, est déjà porté par les thèmes « Animation, famille » et « Sombre, adulte ».
  const FORMAT = new Set(["adult animation", "family animation", "preschool"]);
  let POIDS = null, POPULAIRES = null;
  const CONNUS = {};
  const poidsTags = i => {
    POIDS ||= new Map();
    let v = POIDS.get(i);
    if (!v) {
      const r = rarete(famille(CAT[i])), o = {};
      CAT[i].tags.filter(t => !FORMAT.has(t)).forEach((t, k) => { o[t] = (r[t] || 0) / (1 + k / 4); });
      POIDS.set(i, v = [o, Math.hypot(...Object.values(o)) || 1]);
    }
    return v;
  };
  // Tags « pont » : ce qu'un jeu et un film ont en commun (histoire, univers, ton), dans un seul vocabulaire.
  // Un jeu porte les siens (tags_pont.py) ; un film ou une série, ceux de ses tags qui existent aussi chez les jeux.
  let PONTS = null;
  const ponts = () => {
    if (PONTS) return PONTS;
    const vocab = new Set(), compte = {}, listes = new Map();
    for (const it of Object.values(CAT)) if (it.dom === "jeu" && it.pont) for (const t of it.pont) vocab.add(t);
    for (const it of Object.values(CAT)) {
      const l = (it.dom === "jeu" ? it.pont : it.tags && it.tags.filter(t => vocab.has(t)))?.filter(t => !FORMAT.has(t));
      if (!l || !l.length) continue;
      listes.set(it.id, l);
      for (const t of l) compte[t] = (compte[t] || 0) + 1;
    }
    const poids = new Map();
    for (const [i, l] of listes) {
      const o = {};
      l.forEach((t, k) => { o[t] = Math.log(listes.size / compte[t]) / (1 + k / 4); });
      poids.set(i, [o, Math.hypot(...Object.values(o)) || 1]);
    }
    return PONTS = poids;
  };
  const prochePont = (a, b) => {
    const pa = ponts().get(a), pb = ponts().get(b);
    if (!pa || !pb) return null;
    let s = 0, n = 0, sujet = false;
    for (const t in pa[0]) if (pb[0][t]) { s += pa[0][t] * pb[0][t]; n++; sujet ||= !VAGUES.has(t); }
    // Un seul tag en commun ne prouve rien : Brotato (« survival », son seul tag) sortait pour Squid Game (13/11/2026)
    // Des tags de récit ou de ton sans aucun sujet ni cadre commun non plus : Hades menait à Rocky 5
    // (« family drama, redemption »), 13/11/2026
    return s / (pa[1] * pb[1]) * (!sujet ? 0.5 : n >= 3 ? 1 : n === 2 ? 0.8 : 0.5);
  };
  // Tags qui disent comment l'histoire est racontée ou ressentie, pas de quoi elle parle ni où elle se passe
  const VAGUES = new Set(["family drama", "redemption", "antihero", "friendship", "found family", "rivalry", "mentor", "underdog", "betrayal",
    "identity", "grief", "existential", "philosophical", "psychological", "epic scale", "gritty", "feel good", "ensemble cast", "female lead",
    "blockbuster", "indie", "cult classic", "plot twist", "nonlinear", "slow burn", "mind bending", "long running saga", "book adaptation",
    "chosen one", "power and corruption", "tearjerker", "ultra violent", "gore", "child protagonist", "parenthood"]);
  // Même univers : le titre de l'un commence par celui de l'autre (la série The Last of Us et le jeu, Alien et Alien: Isolation).
  // 5 lettres au moins (« Dark » n'est pas Dark Souls, « Lost » n'est pas Lost Ark). Ce n'est qu'un coup de pouce sur une
  // ressemblance déjà là : le film « Control » (Joy Division) ne ressemble pas au jeu Control et n'en profite pas.
  const nomUnivers = it => simple(it.titre_en || it.titre).replace(/^the /, "");
  const memeUnivers = (a, b) => {
    let x = nomUnivers(CAT[a]), y = nomUnivers(CAT[b]);
    if (x.length > y.length) [x, y] = [y, x];
    return x.length >= 5 && (y === x || y.startsWith(x + " "));
  };
  // Ressemblance des tags de deux titres de la même famille (cosinus)
  const procheTags = (a, b) => {
    const [pa, na] = poidsTags(a), [pb, nb] = poidsTags(b);
    let s = 0;
    for (const t in pa) if (pb[t]) s += pa[t] * pb[t];
    return s / (na * nb);
  };
  const dotV = (a, b) => Object.entries(V()[a]).reduce((s, [th, x]) => s + (V()[b][th] || 0) * x, 0);
  // D'un jeu vers un film ou une série (et l'inverse) : les thèmes propres aux jeux ne disent rien d'un film. Comptés,
  // ils diluaient la ressemblance : The Witcher 3 (monde ouvert, RPG) menait à Shrek plutôt qu'à de la fantasy sombre
  const JEU_SEULS = new Set(["Monde ouvert", "Souls-like", "RPG", "Tir", "Roguelike", "Stratégie", "Compétitif en ligne", "Coop entre amis"]);
  // « Animation, famille » non plus : sur un jeu il veut dire « mignon, tout public » (tags Steam), sur une série « pour enfants ».
  // Compté, Stardew Valley menait à Pocoyo et aux Télétubbies (13/11/2026). L'écart de ton, lui, reste jugé par ecartTon.
  const horsCroise = t => JEU_SEULS.has(t) || t === "Animation, famille";
  const dotCroise = (a, b) => {
    const va = V()[a], vb = V()[b]; let s = 0, na = 0, nb = 0;
    for (const t in va) if (!horsCroise(t)) { na += va[t] ** 2; if (vb[t]) s += va[t] * vb[t]; }
    for (const t in vb) if (!horsCroise(t)) nb += vb[t] ** 2;
    return na && nb ? s / Math.sqrt(na * nb) : 0;
  };
  // Note critique : Metacritic, sinon Rotten Tomatoes, sinon avis Steam (« 92 % positifs… ») ; jamais inventée
  const noteCritique = it => it.metacritic ?? it.rt ?? (it.avis ? parseInt(it.avis) : it.tvmaze ? Math.round(it.tvmaze * 10) : null);
  const court = (it, plus) => ({id: it.id, dom: it.dom, titre: it.titre, annee: it.annee, image: it.image, avis: it.avis, steam: it.steam, wiki: it.wiki, ...notesExt(it), ...plus});

  // Même jeu, autre édition (Skyrim / Skyrim Special Edition, Oblivion GOTY Deluxe (2009)) : un seul des deux en reco
  const edition = t => simple(t).replace(/\b(19|20)\d\d\b|\b(special|definitive|deluxe|complete|ultimate|anniversary|remastered|enhanced|legendary|gold|goty|game of the year|directors? cut|edition)\b/g, "").replace(/\s+/g, " ").trim();
  // Fiche : les titres les plus proches (même similarité cosinus que les recos), jusqu'à 12 par support, le support de la fiche d'abord.
  // La ressemblance prime (au carré, notoriété à 50 % : avant, 65 % de notoriété mettait Skyrim devant Firewatch sur la fiche de Dredge).
  // Avec un profil (mode « Pour moi ») : moitié ressemblance au titre, moitié ressemblance à tes goûts.
  function proches(id, prof = null) {
    const res = {film: [], serie: [], jeu: []}, vus = new Set([CAT[id].dom + edition(CAT[id].titre)]);  // par support : la série The Last of Us reste sur la fiche du jeu
    const norme = prof ? Math.hypot(...Object.values(prof)) || 1 : 1;
    for (const [i, it] of Object.entries(CAT)) {
      if (i === id || !it.image || it.qualite < 0.4 || (prof && prof.deja.has(i))) continue;  // trop confidentiel : souvent un titre au hasard
      // Deux jeux : la moitié du score vient des tags Steam votés, pondérés par leur rang (Silent Hill 2 menait à Sally Face)
      // Un jeu sans tags face à un jeu tagué n'a que ses grands thèmes : il ne doit plus passer devant (OUTRIDERS sur la fiche de Portal 2)
      // Deux films ou séries : deux tiers du score viennent des tags fins (tags_ecran.py, puis etiquettes.py), un tiers des
      // grands thèmes. Interstellar mène à Gravity et Seul sur Mars (« space exploration, hard science, survival »),
      // plus à Terminator Genisys qui ne partage que « Science-fiction » (réglé le 12/11/2026 sur 15 titres de référence)
      const deuxJeux = it.dom === "jeu" && CAT[id].dom === "jeu", deuxEcrans = it.dom !== "jeu" && CAT[id].dom !== "jeu";
      const sim = deuxJeux ? (CAT[id].tags && it.tags ? 0.3 * dotV(id, i) + 0.7 * procheTags(id, i) : CAT[id].tags || it.tags ? 0.3 * dotV(id, i) : dotV(id, i))
        : deuxEcrans && CAT[id].tags && it.tags ? Math.min(1, 0.35 * dotV(id, i) + 0.65 * Math.min(1, 1.6 * procheTags(id, i)))
        : deuxEcrans ? dotV(id, i) : croise(id, i);
      // Moins connu (Until Dawn sur PC, Man of Medan) : gardé seulement s'il ressemble vraiment
      if (sim < 0.3 || (it.qualite < 0.6 && sim < 0.45)) continue;
      const ton = ecartTon(i, id);
      const gout = prof ? Math.max(0, Object.entries(V()[i]).reduce((s, [th, x]) => s + (prof[th] || 0) * x, 0) / norme) : 0;
      // D'un film ou d'une série vers les jeux : un jeu sans histoire (Satisfactory pour Interstellar) passe après un jeu qui en a une
      const recit = it.dom === "jeu" && CAT[id].dom !== "jeu" && !("Histoire forte" in V()[i]) ? 0.6 : 1;
      res[it.dom].push([(prof ? 0.5 * sim + 0.5 * gout : sim) ** 3 * it.qualite ** 4 * ton * recit, i, sim, gout]);
    }
    return ["film", "serie", "jeu"].sort((a, b) => (b === CAT[id].dom) - (a === CAT[id].dom))
      .flatMap(d => {
        // 2 titres par saga au plus en tête, les autres après : sinon Zelda ne montre que des Zelda (08/11/2026)
        const tri = res[d].sort((a, b) => b[0] - a[0]).filter(([, i]) => { const e = CAT[i].dom + edition(CAT[i].titre); return !vus.has(e) && vus.add(e); });
        const n = {}, tete = [], apres = [];
        for (const r of tri) {  // saga par le titre ET par la franchise Wikidata (« Pokémon Diamant » et « Pokémon X » n'ont pas les mêmes deux premiers mots)
          const cles = [saga(r[1]), CAT[r[1]].franchise && "f:" + CAT[r[1]].franchise, "m:" + simple(CAT[r[1]].titre_en || CAT[r[1]].titre).split(" ")[0]].filter(c => c && c.length > 4);
          (cles.some(c => (n[c] || 0) >= 2) ? apres : tete).push(r);
          for (const c of cles) n[c] = (n[c] || 0) + 1;
        }
        return tete.concat(apres).slice(0, 36);  // la fiche en montre 12, « Voir plus » le reste
      })
      .map(([, i, sim, gout]) => court(CAT[i], {themes: CAT[i].themes.slice(0, 3), parce_que: [], match: Math.min(95, Math.round((prof ? 0.5 * sim + 0.5 * gout : sim) * 100)),  // 100 % ne veut rien dire entre deux titres différents
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

  // Notoriété sans plafond : départage les très connus (Bad Cat passait devant Matrix dans « Films : Action »)
  // Notoriété fausse dans la source (Bad Cat compté aussi connu qu'Avatar) : jamais dans les rangées de l'accueil
  const HORS_ACCUEIL = new Set(["Q11252497"]);
  const notoriete = it => it.dom === "jeu" ? +((it.avis || "").match(/sur ([\d ]+) avis/)?.[1] || "0").replace(/ /g, "") : (it.liens || 0) * it.qualite ** 3;  // films, séries : liens Wikipédia, tempérés par la qualité (Bad Cat avait 121 liens)
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
    const ton = ecartTon;
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
        .filter(i => critique(i) >= 0.65).sort((x, y) => rang(y) - rang(x)).slice(0, 2);
      for (const i of adapt) { const k = choix.findIndex(r => r[1] === i); if (k >= 0) choix.splice(k, 1); }
      choix.unshift(...adapt.map(i => [1, i, proche(i)]));
      choix.length = Math.min(choix.length, n);
    }
    // Affichage du plus au moins ressemblant (le pourcentage montré), adaptations d'une licence aimée toujours en tête
    const adaptes = new Set(adapt);
    const tous = choix.map(([, i, sim]) => {
      const it = CAT[i];
      const pourquoi = Object.keys(poids).filter(j => poids[j] > 0).map(j => [dot(i, j), j]).sort((a, b) => b[0] - a[0]).slice(0, 2);
      const communs = Object.keys(V()[i]).sort((a, b) => (prof[b] || 0) * V()[i][b] - (prof[a] || 0) * V()[i][a]).slice(0, 3);
      return {id: i, dom: it.dom, titre: it.titre, annee: it.annee, image: it.image, avis: it.avis, steam: it.steam, wiki: it.wiki, ...notesExt(it),
        franchise: saga(i), serie: it.franchise ? String(it.franchise) : "", themes: communs.filter(t => (prof[t] || 0) > 0), parce_que: pourquoi.filter(([s]) => s > 0).map(([, j]) => ({id: j, dom: CAT[j].dom, titre: CAT[j].titre})), match: Math.round(Math.max(sim, pourquoi[0]?.[0] || 0) * 100)};
    }).sort((a, b) => adaptes.has(b.id) - adaptes.has(a.id) || b.match - a.match);
    // Une même saga : 2 titres au plus en tête de liste, les suivants passent après tous les autres
    const n2 = {}, tete = [], apres = [];
    for (const r of tous) (r.franchise && (n2[r.franchise] = (n2[r.franchise] || 0) + 1) > 2 ? apres : tete).push(r);
    return [...tete, ...apres];
  }
  // Saga d'un titre : les deux premiers mots du titre anglais (même quand Wikidata ne range pas tous les épisodes dans la franchise), sinon la franchise (« Resident Evil 4 » -> « resident evil »)
  function saga(i) {
    const it = CAT[i];
    const l = simple((it.titre_en || it.titre || "").split(/[:–(]| - /)[0]).replace(/^the /, "").replace(/ (\d+|ii|iii|iv|v|vi)( .*)?$/, "").trim();
    const m = l.split(" ").filter(Boolean);  // les deux premiers mots : « resident evil requiem » et « resident evil 2 » vont ensemble
    return m.length >= 2 ? m.slice(0, 2).join(" ") : l.length >= 4 ? l : it.franchise ? String(it.franchise) : "";
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
    charger, pret, complet, estComplet: () => entier, connait: id => !!(CAT && CAT[id]),
    ensemble(lignes) { ENSEMBLE = Object.fromEntries((lignes || []).map(l => [l.item, l.n])); },
    aimes() { return Object.entries(profil().notes).filter(([i, n]) => CAT[i] && NOTES[n] > 0).map(([i]) => i); },
    // n : taille de la liste principale (« Plus de films » en demande davantage), l'autre support en apporte moitié moins
    recos(n = 25) {
      const p = profil(), ecrans = ["film", "serie"], m = Math.max(12, Math.round(n / 2));
      return {
        film: [["D'après tes films et séries", recos(p, "film", ecrans, n)], ["D'après tes jeux", recos(p, "film", ["jeu"], m)]],
        serie: [["D'après tes films et séries", recos(p, "serie", ecrans, n)], ["D'après tes jeux", recos(p, "serie", ["jeu"], m)]],
        jeu: [["D'après tes jeux", recos(p, "jeu", ["jeu"], n)], ["D'après tes films et séries", recos(p, "jeu", ecrans, m)]],
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
      return Object.entries(profil().notes).filter(([i]) => CAT[i]).map(([i, note]) => ({id: i, dom: CAT[i].dom, titre: CAT[i].titre, annee: CAT[i].annee, image: CAT[i].image, themes: CAT[i].themes, note}))
        .sort((a, b) => (a.dom + a.titre).localeCompare(b.dom + b.titre));
    },
    cherche(q) {
      // Dès la première lettre : avec une seule, seulement les titres qui commencent par elle (sinon presque tout correspond)
      q = simple(q); if (!q) return [];
      const ok = t => q.length < 2 ? t.startsWith(q) : t.includes(q);
      return Object.values(CAT).filter(it => { const [a, b] = simples(it); return ok(a) || ok(b); })
        .sort((a, b) => (simples(a)[0].startsWith(q) ? 0 : 1) - (simples(b)[0].startsWith(q) ? 0 : 1) || b.qualite - a.qualite)
        .slice(0, 20).map(it => ({id: it.id, dom: it.dom, titre: it.titre, annee: it.annee, image: it.image, steam: it.steam, themes: it.themes.slice(0, 3), ...notesExt(it)}));
    },
    // Titres les plus acclamés d'un domaine, pour qu'un nouveau visiteur note quelques titres d'entrée
    // Titres très connus d'abord (choisis à la main), complétés par les mieux notés du catalogue
    // theme : rangées de l'accueil sans fin (« Films : Horreur »...)
    populaires(dom, n = 18, theme = null, sauf = null) {
      const notes = profil().notes;
      // Titres choisis à la main : identifiants trouvés une fois (sur l'amorce) et gardés à l'arrivée du catalogue entier
      const connus = theme ? [] : (CONNUS[dom] ||= (CELEBRES[dom] || []).map(t => trouver(dom, t)).filter(Boolean)).map(i => CAT[i]).filter(Boolean);
      // Complément par notoriété : le mieux noté seul sortait des titres que personne ne connaît
      // Liste triée gardée par support et thème : elle ne dépend ni des notes ni des titres déjà montrés. Recalculée à chaque
      // appel (une dizaine par affichage de l'accueil), elle bloquait le téléphone 1,8 s (mesuré le 11/11/2026, processeur x4)
      POPULAIRES ||= new Map();
      const cle = dom + "|" + (theme || "");
      let reste = POPULAIRES.get(cle);
      if (!reste) {
        const tri = new Map();  // clé de tri calculée une fois par titre (connu() lit le nombre d'avis par expression régulière)
        const k = it => { let v = tri.get(it); if (v === undefined) tri.set(it, v = theme ? notoriete(it) : connu(it)); return v; };
        reste = Object.values(CAT).filter(it => it.dom === dom && it.image && (it.annee || 0) >= (theme ? 1970 : 2008) && (!theme || it.themes.includes(theme)))
          .sort(theme ? (a, b) => k(b) - k(a) : (a, b) => k(b) - k(a) || b.qualite - a.qualite);
        POPULAIRES.set(cle, reste);
      }
      // Les titres déjà notés restent, avec leur note : en revenant sur l'accueil, on voit où on en est
      return [...new Set([...connus, ...reste])].filter(it => it.image && !sauf?.has(it.id) && !HORS_ACCUEIL.has(it.id)).slice(0, n)
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
      // Sur l'amorce : la fiche s'affiche déjà, les proches (calculés sur tout le catalogue) arrivent ensuite
      if (!entier) return {...it, note: profil().notes[id] || "", similaires: null, pour_moi: null, pour_toi: null, partiel: true};
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
        let i = imdb && (index(), PAR_IMDB.get(imdb));
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
