// Compte optionnel (site uniquement) : e-mail + mot de passe via Supabase Auth.
// Le mot de passe est géré et haché par Supabase, jamais vu par ce code. Le profil
// (les notes) est rangé dans la table « profils », lisible seulement par son propriétaire
// (règles RLS). La clé ci-dessous est la clé publique « anon » : elle est faite pour
// être dans le navigateur, elle ne donne accès qu'à ce que les règles RLS permettent.
const SUPA_URL = "https://ryvqymggtvosrijdxmzg.supabase.co";
const SUPA_CLE = "sb_publishable_HzOqlGPtg9qhTVESavdHGw_ZLKp95f4";

(() => {
  // Supabase injoignable (bloqueur, hors ligne) : le site marche sans compte, les avis s'affichent « indisponibles »
  if (typeof supabase === "undefined") { window.NOTES = null; return; }
  const sb = supabase.createClient(SUPA_URL, SUPA_CLE);
  // Statistiques : une visite par onglet ouvert, sans IP (table « visites », lisible par personne).
  // Numéro de visiteur : tiré au hasard une fois par navigateur, sans nom ni e-mail ; il dit seulement « déjà venu ».
  // Adresse secrète #moi : ce navigateur (Rayan) n'est plus compté ; les navigateurs de test (webdriver) non plus.
  let moi = !!navigator.webdriver;
  try { if (location.hash === "#moi") { localStorage.setItem("pontil-moi", "1"); history.replaceState(null, "", location.pathname); } if (localStorage.getItem("pontil-moi")) moi = true; } catch (e) { /* stockage bloqué */ }
  let visiteur = null;
  if (!moi) try {
    visiteur = localStorage.getItem("pontil-visiteur");
    if (!visiteur) { visiteur = crypto.randomUUID(); localStorage.setItem("pontil-visiteur", visiteur); }
  } catch (e) { visiteur = null; /* stockage bloqué : visites comptées sans numéro */ }
  // Étapes du parcours (table « etapes ») : chacune envoyée une seule fois par navigateur
  const etape = nom => {
    if (!visiteur) return;
    try { if (localStorage.getItem("pontil-etape-" + nom)) return; localStorage.setItem("pontil-etape-" + nom, "1"); } catch (e) { return; }
    sb.from("etapes").insert({ visiteur, etape: nom }).then(() => {});
  };
  addEventListener("profil-change", () => {
    let n = 0;
    try { n = Object.keys(JSON.parse(localStorage.getItem("tastebridge-profil"))?.notes || {}).filter(k => k !== "__listes").length; } catch (e) { return; }
    if (n >= 1) etape("note_1");
    if (n >= 5) etape("note_5");
    if (n >= 20) etape("note_20");
  });
  addEventListener("action-visiteur", () => etape("recherche"));
  try {
    if (!moi && !sessionStorage.getItem("pontil-vu")) {
      sessionStorage.setItem("pontil-vu", "1");
      let origine = "";
      try { const h = new URL(document.referrer).hostname; if (h !== location.hostname) origine = h.slice(0, 100); } catch (e) { /* arrivée directe */ }
      // Sans référent (appli TikTok...), l'adresse d'arrivée le dit : pontil.fr/tt envoie ?utm_source=tiktok
      if (!origine) { const q = new URLSearchParams(location.search); origine = (q.get("utm_source") || q.get("ref") || "").slice(0, 100); }
      // Page d'arrivée : jamais un retour de connexion (#access_token=...)
      sb.from("visites").insert({page: (/^#\//.test(location.hash) ? location.hash : "#/").slice(0, 40), origine, langue: (navigator.language || "").slice(0, 10), mobile: matchMedia("(max-width: 700px)").matches, visiteur}).then(() => {});
    }
  } catch (e) { /* stockage bloqué : la visite n'est pas comptée */ }
  let user = null, envoi = null, applique = false;

  const css = document.createElement("style");
  css.textContent = `
.connexion{display:flex;align-items:center;gap:8px;height:36px;padding:0 4px;border:0;border-radius:0;background:none;color:var(--texte2);font:500 13px var(--f-texte);cursor:pointer;white-space:nowrap;transition:color .2s}
.connexion:hover{color:var(--blanc)}
.connexion i{width:8px;height:8px;border-radius:50%;background:var(--menthe)}
.voile-compte{position:fixed;inset:0;z-index:40;background:rgba(5,5,8,.7);backdrop-filter:blur(6px);display:grid;place-items:center;padding:16px}
.boite{width:min(400px,100%);background:var(--fond);border:0;border-radius:4px;padding:34px 30px;box-shadow:0 40px 90px -30px #000}
.boite h3{font:500 32px/1.05 Newsreader,Georgia,serif;letter-spacing:-.018em;margin:0 0 8px}
.boite p{color:var(--doux);font-size:13.5px;margin:0 0 18px}
.boite label{display:block;font-size:12.5px;color:var(--doux);margin:12px 0 6px}
.boite input{width:100%;background:none;border:0;border-bottom:1px solid var(--trait2);border-radius:0;padding:9px 0;color:var(--texte);font:16px var(--f-texte);outline:none}
.boite input:focus{border-bottom-color:var(--ambre)}
.boite .principal{width:100%;margin-top:26px;padding:13px;border:0;border-radius:999px;background:var(--texte);color:var(--fond);font:600 15px var(--f-texte);cursor:pointer}
.boite .principal:disabled{opacity:.6;cursor:wait}
.boite .lien{background:none;border:0;color:var(--ambre);font:inherit;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:3px}
.boite .bas{display:flex;justify-content:space-between;align-items:center;margin-top:16px;font-size:13px;color:var(--doux)}
.boite .msg{min-height:20px;margin-top:12px;font-size:13px;color:var(--rouge)}
.boite .msg.ok{color:var(--menthe)}`;
  document.head.append(css);

  const ICONE_MAIL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
  const bouton = document.createElement("button");
  bouton.className = "connexion";
  document.querySelector("#compte").after(bouton);
  bouton.onclick = () => user ? menuCompte() : fenetre("entrer");

  function maj() {
    bouton.innerHTML = user ? `<i></i>${user.email.split("@")[0]}` : "Connexion";
    bouton.title = user ? `Connecté : ${user.email}` : "Garder tes goûts sur tous tes appareils";
  }

  function fermer() { document.querySelector(".voile-compte")?.remove(); }
  addEventListener("keydown", e => { if (e.key === "Escape") fermer(); });

  function fenetre(mode) {
    fermer();
    if (mode === "creer") etape("fenetre_compte");
    const nouveau = mode === "creer";
    const v = document.createElement("div");
    v.className = "voile-compte";
    v.innerHTML = `<form class="boite">
  <h3>${nouveau ? "Créer un compte" : "Se connecter"}</h3>
  <p>Tes goûts sont sauvegardés et te suivent sur tous tes appareils. Ceux déjà notés ici sont repris dans ton compte.${nouveau ? `<span class="note-mail">${ICONE_MAIL}<span>Tu vas recevoir un e-mail de confirmation envoyé par <b>Supabase</b>, le service qui gère les comptes de Pontil (pense à regarder dans les spams).</span></span>` : ""}</p>
  <label for="c-mail">E-mail</label><input id="c-mail" type="email" autocomplete="email" required>
  <label for="c-mdp">Mot de passe${nouveau ? " (8 caractères minimum)" : ""}</label>
  <input id="c-mdp" type="password" minlength="${nouveau ? 8 : 1}" autocomplete="${nouveau ? "new-password" : "current-password"}" required>
  <button class="principal">${nouveau ? "Créer mon compte" : "Se connecter"}</button>
  <div class="msg" role="status"></div>${nouveau ? "" : `<button type="button" class="lien oubli">Mot de passe oublié ?</button>`}
  <div class="bas"><span>${nouveau ? "Déjà un compte ?" : "Pas encore de compte ?"}</span>
   <button type="button" class="lien">${nouveau ? "Se connecter" : "Créer un compte"}</button></div>
</form>`;
    document.body.append(v);
    v.onclick = e => { if (e.target === v) fermer(); };
    v.querySelector(".bas .lien").onclick = () => fenetre(nouveau ? "entrer" : "creer");
    // Mot de passe oublié : Supabase envoie un lien, qui ramène ici avec l'événement PASSWORD_RECOVERY
    v.querySelector(".oubli")?.addEventListener("click", async () => {
      const email = v.querySelector("#c-mail").value.trim();
      if (!email) { msg.className = "msg"; msg.textContent = "Écris d'abord ton e-mail."; return; }
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      msg.className = error ? "msg" : "msg ok";
      msg.textContent = error ? traduire(error.message) : "E-mail envoyé. Clique le lien « Supabase » pour choisir un nouveau mot de passe (regarde aussi les spams).";
    });
    v.querySelector("#c-mail").focus();
    const msg = v.querySelector(".msg"), go = v.querySelector(".principal");
    v.querySelector("form").onsubmit = async e => {
      e.preventDefault();
      go.disabled = true; msg.className = "msg"; msg.textContent = "";
      const email = v.querySelector("#c-mail").value.trim(), password = v.querySelector("#c-mdp").value;
      const { data, error } = nouveau
        ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } })
        : await sb.auth.signInWithPassword({ email, password });
      go.disabled = false;
      if (error) { msg.textContent = traduire(error.message); return; }
      etape(nouveau ? "inscrit" : "connecte");
      if (nouveau && !data.session) { msg.className = "msg ok"; msg.textContent = "Compte créé. Clique le lien de l'e-mail « Supabase » pour l'activer (regarde aussi les spams)."; return; }
      fermer();
    };
  }

  function nouveauMdp() {
    fermer();
    const v = document.createElement("div");
    v.className = "voile-compte";
    v.innerHTML = `<form class="boite"><h3>Nouveau mot de passe</h3>
  <label for="c-mdp">Mot de passe (8 caractères minimum)</label>
  <input id="c-mdp" type="password" minlength="8" autocomplete="new-password" required>
  <button class="principal">Enregistrer</button><div class="msg" role="status"></div></form>`;
    document.body.append(v);
    v.querySelector("#c-mdp").focus();
    const msg = v.querySelector(".msg");
    v.querySelector("form").onsubmit = async e => {
      e.preventDefault();
      const { error } = await sb.auth.updateUser({ password: v.querySelector("#c-mdp").value });
      if (error) { msg.textContent = traduire(error.message); return; }
      msg.className = "msg ok"; msg.textContent = "Mot de passe changé, tu es connecté.";
      setTimeout(fermer, 1500);
    };
  }

  function menuCompte() {
    fermer();
    const v = document.createElement("div");
    v.className = "voile-compte";
    v.innerHTML = `<div class="boite"><h3>Ton compte</h3><p>${user.email}<br>Tes notes sont synchronisées automatiquement.</p>
  <button class="principal">Se déconnecter</button></div>`;
    document.body.append(v);
    v.onclick = e => { if (e.target === v) fermer(); };
    v.querySelector(".principal").onclick = async () => { await sb.auth.signOut(); fermer(); };
  }

  function traduire(m) {
    if (/invalid login/i.test(m)) return "E-mail ou mot de passe incorrect.";
    if (/already registered/i.test(m)) return "Un compte existe déjà avec cet e-mail.";
    if (/not confirmed/i.test(m)) return "Active d'abord ton compte avec le lien reçu par e-mail.";
    if (/password/i.test(m)) return "Mot de passe trop faible (8 caractères minimum).";
    if (/rate limit/i.test(m)) return "Trop d'essais, réessaie dans quelques minutes.";
    return m;
  }

  // Les listes (page.html, localStorage « tastebridge-listes ») voyagent avec le compte dans la même ligne
  // de « profils », sous la clé __listes des notes : pas de nouvelle table, mêmes règles RLS (propriétaire seul)
  const lireListes = () => { try { return JSON.parse(localStorage.getItem("tastebridge-listes")) || []; } catch { return []; } };
  const fusionnerListes = (a, b) => { const m = new Map(a.map(l => [l.titre, l])); for (const l of b) m.set(l.titre, {...l, items: [...new Set([...(m.get(l.titre)?.items || []), ...l.items])]}); return [...m.values()]; };

  // À la connexion : on fusionne les notes du compte et celles de ce navigateur
  async function recuperer() {
    const { data, error } = await sb.from("profils").select("notes").eq("id", user.id).maybeSingle();
    if (error) { console.warn(error.message); return; }
    const { __listes = [], ...distantes } = data?.notes || {};
    try { localStorage.setItem("tastebridge-listes", JSON.stringify(fusionnerListes(Array.isArray(__listes) ? __listes : [], lireListes()))); } catch {}
    const locales = JSON.parse(Moteur.exporter()).notes || {};
    const notes = { ...distantes, ...locales };
    applique = true;
    Moteur.restaurer(JSON.stringify({ notes }));
    applique = false;
    await envoyer();
    rafraichir();
  }

  async function envoyer() {
    if (!user) return;
    const notes = { ...(JSON.parse(Moteur.exporter()).notes || {}), __listes: lireListes() };
    const { error } = await sb.from("profils").upsert({ id: user.id, notes, maj: new Date().toISOString() });
    if (error) console.warn(error.message);
  }

  function rafraichir() { dispatchEvent(new CustomEvent("profil-recharge")); }

  addEventListener("listes-change", () => dispatchEvent(new CustomEvent("profil-change")));
  addEventListener("profil-change", () => {
    if (!user || applique) return;
    clearTimeout(envoi);
    envoi = setTimeout(envoyer, 800);
  });

  // « Aimés ensemble » : totaux anonymes des comptes (au moins 3 par titre), pour tous les visiteurs.
  // Fonction absente ou injoignable : rien ne change, les recos restent celles des thèmes.
  let derniers = "", attente = null;
  async function ensemble() {
    const ids = Moteur.aimes().sort(), cle = ids.join(",");
    if (!ids.length || cle === derniers) return;
    derniers = cle;
    const { data, error } = await sb.rpc("aimes_ensemble", { ids });
    if (error || !data?.length) return;
    Moteur.ensemble(data);
    rafraichir();
  }
  addEventListener("profil-change", () => { clearTimeout(attente); attente = setTimeout(ensemble, 1500); });
  setTimeout(ensemble, 1500);

  // ---------- Avis et commentaires ----------
  // Tout texte venant d'un visiteur passe par echap() avant d'entrer dans la page (pas d'injection de HTML)
  const echap = t => String(t ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
  const en = () => document.documentElement.lang === "en";  // langue.js passe la page en anglais
  const etoiles = n => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  css.textContent += `
.avis-zone .resume{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:14px;margin:0 0 16px;color:var(--doux);font-size:13.5px}
.avis-zone .resume b{font:400 30px Newsreader,Georgia,serif;color:var(--texte)}
.moyenne{display:flex;align-items:baseline;gap:8px}
.histo{display:flex;align-items:flex-end;gap:3px;height:38px;width:110px}
.histo i{flex:1;background:var(--ambre);opacity:.75;border-radius:12px}
.avis-zone .liste{display:flex;flex-direction:column}
.un-avis{padding:14px 2px;border-bottom:1px solid var(--trait)}.un-avis:last-child{border-bottom:0}
.un-avis .haut{display:flex;justify-content:space-between;gap:10px;font-size:13px;color:var(--doux)}
.un-avis .haut strong{color:var(--texte);font-weight:600}
.un-avis .st,.saisie .st button{color:var(--ambre);letter-spacing:1px}
.un-avis p{margin:6px 0 0;color:var(--texte);font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}
.un-avis .suppr{background:none;border:0;color:var(--pale);font:12px var(--f-texte);cursor:pointer;padding:0;margin-top:6px;text-decoration:underline}
.saisie{border-top:1px solid var(--trait);margin-top:16px;padding-top:14px}
.saisie .st{display:flex;gap:2px;margin-bottom:8px}
.saisie .st button{background:none;border:0;font-size:26px;line-height:1;cursor:pointer;padding:2px;color:var(--trait2)}
.saisie .st button.on{color:var(--ambre)}
.saisie textarea{width:100%;min-height:76px;resize:vertical;background:var(--surface2);border:1px solid var(--trait);border-radius:12px;padding:10px 12px;color:var(--texte);font:14px/1.5 var(--f-texte);outline:none}
.saisie textarea:focus,.saisie input:focus{border-color:var(--ambre)}
.saisie .ligne{display:flex;gap:8px;margin-top:8px}
.saisie input{flex:1;min-width:0;background:var(--surface2);border:1px solid var(--trait);border-radius:12px;padding:10px 12px;color:var(--texte);font:14px var(--f-texte);outline:none}
.avis-zone .principal{margin:0;padding:10px 18px;border:0;border-radius:12px;background:var(--ambre);color:#16110a;font:600 14px var(--f-texte);cursor:pointer}
.avis-zone .msg{min-height:20px;margin-top:10px;font-size:13px;color:var(--rouge)}`;

  // Avis d'une œuvre, affichés dans sa fiche (page.html) : moyenne, répartition, liste et saisie
  window.avisDans = async (zone, item) => {
    zone.innerHTML = `<div class="resume">Chargement des avis...</div><div class="liste"></div><div class="saisie"></div>`;
    const { data, error } = await sb.from("avis").select("id,user_id,pseudo,note,texte,cree").eq("item", item).order("cree", { ascending: false }).limit(200);
    if (!zone.isConnected) return;
    const res = zone.querySelector(".resume"), liste = zone.querySelector(".liste"), saisie = zone.querySelector(".saisie");
    if (error) { res.textContent = "Avis indisponibles pour le moment."; return; }
    const moy = data.length ? data.reduce((s, a) => s + a.note, 0) / data.length : 0;
    const par = [1, 2, 3, 4, 5].map(n => data.filter(a => a.note === n).length), haut = Math.max(1, ...par);
    res.innerHTML = data.length ? `<div class="moyenne"><b>${en() ? moy.toFixed(1) : moy.toFixed(1).replace(".", ",")}</b><span>sur 5, ${data.length} avis</span></div>
<div class="histo" role="img" aria-label="Répartition des notes : ${par.map((c, i) => `${c} × ${i + 1}★`).join(", ")}">${par.map((c, i) => `<i style="height:${Math.max(4, c / haut * 100)}%" title="${i + 1} sur 5"></i>`).join("")}</div>` : "<span>Aucun avis pour l'instant. Sois le premier.</span>";
    liste.innerHTML = data.map(a => `<div class="un-avis"><div class="haut"><span><strong>${echap(a.pseudo)}</strong> <span class="st" aria-label="${a.note} sur 5">${etoiles(a.note)}</span></span><span>${new Date(a.cree).toLocaleDateString(en() ? "en-GB" : "fr-FR")}</span></div>
${a.texte ? `<p>${echap(a.texte)}</p>` : ""}${user && a.user_id === user.id ? `<button class="suppr" data-sup="${a.id}">Supprimer mon avis</button>` : ""}</div>`).join("");
    liste.querySelectorAll("[data-sup]").forEach(b => b.onclick = async () => {
      await sb.from("avis").delete().eq("id", b.dataset.sup);
      chargerNotes();
      avisDans(zone, item);
    });
    if (!user) {
      saisie.innerHTML = `<button class="principal">Se connecter pour donner ton avis</button>`;
      saisie.querySelector("button").onclick = () => fenetre("entrer");
      return;
    }
    const mien = data.find(a => a.user_id === user.id);
    let note = mien?.note || 0;
    let pseudo = mien?.pseudo || "";
    try { pseudo ||= localStorage.getItem("tastebridge-pseudo") || ""; } catch {}
    saisie.innerHTML = `<div class="st" role="radiogroup" aria-label="Ta note">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n} sur 5">★</button>`).join("")}</div>
<textarea maxlength="1000" aria-label="Ton avis" placeholder="Ton avis (facultatif) : ce que tu as aimé, ou pas...">${echap(mien?.texte || "")}</textarea>
<div class="ligne"><input maxlength="30" aria-label="Ton pseudo" placeholder="Ton pseudo" value="${echap(pseudo)}"><button class="principal">${mien ? "Mettre à jour" : "Publier"}</button></div>
<div class="msg" role="status"></div>`;
    const boutons = saisie.querySelectorAll(".st button"), msg = saisie.querySelector(".msg");
    const peindre = () => boutons.forEach(b => { b.classList.toggle("on", +b.dataset.n <= note); b.setAttribute("aria-checked", +b.dataset.n === note); b.setAttribute("role", "radio"); });
    boutons.forEach(b => b.onclick = () => { note = +b.dataset.n; peindre(); });
    peindre();
    saisie.querySelector(".principal").onclick = async () => {
      const texte = saisie.querySelector("textarea").value.trim(), ps = saisie.querySelector("input").value.trim();
      msg.className = "msg";
      if (!note) { msg.textContent = "Choisis une note de 1 à 5 étoiles."; return; }
      if (ps.length < 2) { msg.textContent = "Choisis un pseudo (2 caractères minimum)."; return; }
      const { error } = await sb.from("avis").upsert({ user_id: user.id, item, pseudo: ps, note, texte }, { onConflict: "user_id,item" });
      if (error) { msg.textContent = "Envoi impossible : " + error.message; return; }
      try { localStorage.setItem("tastebridge-pseudo", ps); } catch {}
      chargerNotes();
      avisDans(zone, item);
    };
  };

  // Moyenne de chaque œuvre, pour le badge étoile et le tri « Mieux notés »
  async function chargerNotes() {
    const { data, error } = await sb.from("avis").select("item,note").limit(10000);
    if (error) { window.NOTES = null; dispatchEvent(new CustomEvent("notes-moyennes")); return; }
    const t = {};
    data.forEach(a => { const x = t[a.item] ||= [0, 0]; x[0] += a.note; x[1]++; });
    window.NOTES = Object.fromEntries(Object.entries(t).map(([k, [s, n]]) => [k, [s / n, n]]));
    dispatchEvent(new CustomEvent("notes-moyennes"));
  }
  chargerNotes();

  sb.auth.onAuthStateChange((evt, session) => {
    const avant = user?.id;
    user = session?.user || null;
    maj();
    if (evt === "PASSWORD_RECOVERY") nouveauMdp();
    if (user && user.id !== avant) setTimeout(recuperer, 0);
  });
  maj();

  // ---------- Invitation douce à créer un compte ----------
  // Tout marche sans compte. Après 5 recherches ou lancers de dé, une carte propose d'en créer un.
  // Elle ne bloque rien, se ferme d'un clic et ne revient pas une fois fermée.
  const SEUIL = 5;
  const lire = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  addEventListener("action-visiteur", () => {
    const n = +lire("tastebridge-actions", 0) + 1;
    ecrire("tastebridge-actions", n);
    if (n >= SEUIL && !user && !lire("tastebridge-invite-fermee", "") && !document.querySelector(".invite")) inviter();
  });
  function inviter() {
    const c = document.createElement("aside");
    c.className = "invite";
    c.setAttribute("role", "dialog");
    c.setAttribute("aria-label", "Créer un compte");
    c.innerHTML = `<button class="x" aria-label="Fermer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
<h4>Garde tes goûts pour de bon</h4>
<p>Avec un compte gratuit, tes notes sont sauvegardées et tu les retrouves sur ton téléphone comme sur ton PC. Celles déjà notées ici sont reprises.</p>
<p class="note-mail">${ICONE_MAIL}<span>L'e-mail de confirmation vient de <b>Supabase</b>, notre service de comptes (vérifie les spams).</span></p>
<div class="boutons"><button class="principal">Créer mon compte</button><button class="plus-tard">Plus tard</button></div>`;
    document.body.append(c);
    etape("invite_vue");
    const fermerInvite = () => { ecrire("tastebridge-invite-fermee", "1"); etape("invite_fermee"); c.remove(); };
    c.querySelector(".x").onclick = fermerInvite;
    c.querySelector(".plus-tard").onclick = fermerInvite;
    c.querySelector(".principal").onclick = () => { c.remove(); fenetre("creer"); };
  }
  css.textContent += `
.note-mail{display:flex;gap:8px;align-items:flex-start;margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(232,163,61,.08);border:1px solid rgba(232,163,61,.22);color:var(--texte);font-size:12.5px;line-height:1.45}
.note-mail svg{width:16px;height:16px;flex:none;margin-top:1px;color:var(--ambre)}
.invite{position:fixed;z-index:35;right:20px;bottom:20px;width:min(360px,calc(100% - 32px));background:var(--surface);border:1px solid var(--trait2);border-radius:12px;padding:20px;box-shadow:var(--ombre);animation:monte .45s var(--sortie)}
@keyframes monte{from{opacity:0;transform:translateY(16px)}}
.invite h4{margin:0 28px 6px 0;font:400 22px/1.15 Newsreader,Georgia,serif}
.invite p{margin:0;color:var(--doux);font-size:13.5px}
.invite .x{position:absolute;top:12px;right:12px;width:30px;height:30px;display:grid;place-items:center;border:0;border-radius:12px;background:none;color:var(--doux);cursor:pointer}
.invite .x:hover{background:var(--surface2);color:var(--texte)}
.invite .x svg{width:16px;height:16px}
.invite .boutons{display:flex;gap:8px;margin-top:14px}
.invite .principal{flex:1;margin:0;padding:11px;border:0;border-radius:12px;background:var(--ambre);color:#16110a;font:600 14px var(--f-texte);cursor:pointer}
.invite .plus-tard{padding:11px 14px;border:1px solid var(--trait);border-radius:12px;background:none;color:var(--doux);font:500 14px var(--f-texte);cursor:pointer}
@media(max-width:600px){.invite{right:16px;left:16px;bottom:16px;width:auto}}
@media(prefers-reduced-motion:reduce){.invite{animation:none}}`;
})();
