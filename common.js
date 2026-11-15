// Y-bae beurs – gedeelde instellingen, vragen en score
const SB_URL = "https://tmoomwmusztepdaaaqyj.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtb29td211c3p0ZXBkYWFhcXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3MDg2NzQsImV4cCI6MjExMDI4NDY3NH0.2aMWbKflWzl0A9K6B4G9yz_EpfvWTm57eO4tlIXVPkc";

async function sb(path, opts = {}) {
  const res = await fetch(SB_URL + path, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: "Bearer " + SB_KEY,
      "Content-Type": "application/json",
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    let msg = res.status + "";
    try { const j = await res.json(); msg = j.message || JSON.stringify(j); } catch (e) {}
    throw new Error(msg);
  }
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}
const rpc = (fn, args) => sb("/rest/v1/rpc/" + fn, { method: "POST", body: JSON.stringify(args || {}) });

const TYPES = {
  restaurant: "Restaurant / brasserie",
  hotel: "Hotel / ontbijtzaak",
  cateraar: "Cateraar / events",
  contract: "Contractcatering, zorg of instelling",
  bakker: "Bakker",
  winkel: "Winkel / speciaalzaak",
  groothandel: "Groothandel / distributeur",
  producent: "Producent of investeerder",
  particulier: "Particulier"
};
const isType = (a, ...t) => t.includes(a.type);
const B2B = a => a.type && a.type !== "particulier";

const GROOTHANDELS = ["Bidfood", "Horeca Totaal", "Precon", "Sligro", "Solucious", "Hanos", "Horeca Van Zon", "Van Rossem", "Delobelle Food Service", "Agora Culinair / Van Hout Horeca", "Horeca Foods", "Andere"];

// Elke vraag: id, label (kort, voor dashboard), q (vraagtekst), opts, multi, show(a)
const QUESTIONS = [
  { id: "type", label: "Type", q: "Wat beschrijft jou het best?", opts: Object.keys(TYPES).map(k => [k, TYPES[k]]) },
  { id: "invloed", label: "Invloed", q: "Wie beslist bij jullie over nieuwe producten?", show: B2B,
    opts: [["beslis", "Ik beslis"], ["mee", "Ik beslis mee of adviseer"], ["door", "Ik geef het door aan wie beslist"], ["geen", "Ik heb er geen invloed op"]] },
  { id: "nood", label: "Vraag naar glutenvrij/vegan", q: "Hoe vaak vragen je klanten naar glutenvrij, vegan of koolhydraatarm?", show: B2B,
    opts: [["nooit", "Nooit"], ["maand", "Maandelijks"], ["week", "Wekelijks"], ["dag", "Dagelijks"]] },

  // Horeca
  { id: "h4", label: "Gast vraagt glutenvrij", q: "Wat doe je nu als een gast glutenvrij vraagt?", show: a => isType(a, "restaurant", "hotel"),
    opts: [["weg", "We laten het brood weg"], ["al", "We hebben al iets glutenvrij"], ["weetniet", "Ik weet het niet goed"]] },
  { id: "h5", label: "Brood via", q: "Waar koop je je brood of diepvriesproducten?", hint: "Meerdere antwoorden mogen.", multi: true, show: a => isType(a, "restaurant", "hotel"),
    opts: [["zelf", "Zelfgebakken"], ["bakker", "Lokale bakker"], ["groothandel", "Groothandel"]] },
  { id: "h5b", label: "Groothandel", q: "Bij welke groothandel?", show: a => isType(a, "restaurant", "hotel") && (a.h5 || []).includes("groothandel"),
    opts: GROOTHANDELS.map(g => [g, g]) },
  { id: "h5b_andere", label: "Andere groothandel", q: "Welke groothandel?", text: true, show: a => a.h5b === "Andere" && (a.h5 || []).includes("groothandel") },
  { id: "h6", label: "Couverts/week", q: "Hoeveel couverts of ontbijten serveer je per week?", show: a => isType(a, "restaurant", "hotel"),
    opts: [["<100", "Minder dan 100"], ["100-300", "100 – 300"], ["300-1000", "300 – 1000"], [">1000", "Meer dan 1000"]] },

  // Cateraar
  { id: "c4", label: "Events/maand", q: "Hoeveel events of leveringen doe je per maand?", show: a => isType(a, "cateraar"),
    opts: [["<5", "Minder dan 5"], ["5-20", "5 – 20"], [">20", "Meer dan 20"]] },
  { id: "c5", label: "Dieetwensen/event", q: "Hoeveel gasten per event hebben een dieetwens?", show: a => isType(a, "cateraar"),
    opts: [["bijnageen", "Bijna geen"], ["paar", "Een paar"], ["veel", "Veel"]] },
  { id: "c6", label: "Inkoop via", q: "Via wie koop je in?", show: a => isType(a, "cateraar"),
    opts: [["groothandel", "Groothandel"], ["rechtstreeks", "Rechtstreeks bij producenten"], ["beide", "Beide"]] },

  // Contractcatering / zorg
  { id: "z4", label: "Locaties", q: "Hoeveel locaties bedienen jullie?", show: a => isType(a, "contract"),
    opts: [["1", "1"], ["2-10", "2 – 10"], [">10", "Meer dan 10"]] },
  { id: "z5", label: "Keuze producten", q: "Hoe worden nieuwe producten gekozen?", show: a => isType(a, "contract"),
    opts: [["centraal", "Centrale aankoop"], ["locatie", "Per locatie"], ["groothandel", "Via de groothandel"]] },
  { id: "z6", label: "Glutenvrij brood nu", q: "Hebben jullie nu een glutenvrij broodalternatief?", show: a => isType(a, "contract"),
    opts: [["tevreden", "Ja, en we zijn tevreden"], ["ontevreden", "Ja, maar niet tevreden"], ["nee", "Nee"]] },

  // Bakker / winkel
  { id: "b4", label: "Al glutenvrij/vegan", q: "Verkoop je al glutenvrije of vegan producten?", show: a => isType(a, "bakker", "winkel"),
    opts: [["nee", "Nee"], ["paar", "Een paar"], ["volledig", "Een volledig assortiment"]] },
  { id: "b5", label: "Diepvries/afbakken", q: "Heb je een diepvriestoog of bak je zelf af?", show: a => isType(a, "bakker", "winkel"),
    opts: [["diepvries", "Diepvriestoog"], ["afbakken", "Afbakken"], ["beide", "Beide"], ["geen", "Geen van beide"]] },
  { id: "b6", label: "Vestigingen", q: "Hoeveel vestigingen heb je?", show: a => isType(a, "bakker", "winkel"),
    opts: [["1", "1"], ["2-5", "2 – 5"], [">5", "Meer dan 5"]] },

  // Groothandel
  { id: "g4", label: "Levert aan", q: "Aan wie lever je vooral?", hint: "Meerdere antwoorden mogen.", multi: true, show: a => isType(a, "groothandel"),
    opts: [["horeca", "Horeca"], ["catering", "Catering / zorg"], ["retail", "Retail"], ["bio", "Bio / vegan-speciaalzaken"]] },
  { id: "g5", label: "Glutenvrij/vegan in gamma", q: "Heb je glutenvrij of vegan in je gamma?", show: a => isType(a, "groothandel"),
    opts: [["nee", "Nee"], ["beperkt", "Beperkt"], ["uitgebreid", "Uitgebreid"]] },
  { id: "g6", label: "Leveringsgebied", q: "Waar lever je?", show: a => isType(a, "groothandel"),
    opts: [["gent", "Regio Gent"], ["vlaanderen", "Vlaanderen"], ["belgie", "België"], ["benelux", "Benelux en verder"]] },

  // Producent / investeerder
  { id: "p4", label: "Interesse", q: "Wat interesseert je?", hint: "Meerdere antwoorden mogen.", multi: true, show: a => isType(a, "producent"),
    opts: [["produceren", "Produceren (white label)"], ["verdelen", "Verdelen"], ["investeren", "Investeren"], ["overnemen", "Overnemen"]] },
  { id: "p5", label: "Ervaring glutenvrij", q: "Heb je ervaring met glutenvrije productie?", show: a => isType(a, "producent"),
    opts: [["lijn", "Ja, een aparte lijn"], ["beetje", "Een beetje"], ["nee", "Nee"]] },
  { id: "p6", label: "Grootte", q: "Hoe groot is je organisatie?", show: a => isType(a, "producent"),
    opts: [["<10", "Minder dan 10 medewerkers"], ["10-50", "10 – 50 medewerkers"], [">50", "Meer dan 50 medewerkers"]] },

  // Particulier
  { id: "part", label: "Kopen via", q: "Waar zou je Y-bae het liefst kopen?", show: a => isType(a, "particulier"),
    opts: [["webshop", "Webshop"], ["speciaalzaak", "Speciaalzaak"], ["supermarkt", "Supermarkt"], ["markt", "Op de markt"]] },

  // Iedereen
  { id: "timing", label: "Timing", q: "Wanneer wil je verder praten?",
    opts: [["week", "Deze week"], ["maand", "Deze maand"], ["later", "Later"], ["info", "Ik wil alleen info"]] }
];

const FUNCTIES = [["zaakvoerder", "Zaakvoerder / eigenaar"], ["aankoper", "Aankoper"], ["chef", "Chef / keuken"], ["medewerker", "Medewerker"], ["andere", "Andere"]];

function optLabel(qid, val) {
  if (qid === "functie") { const f = FUNCTIES.find(x => x[0] === val); return f ? f[1] : val; }
  const q = QUESTIONS.find(x => x.id === qid);
  if (!q || !q.opts) return val;
  const f = (v) => { const o = q.opts.find(x => x[0] === v); return o ? o[1] : v; };
  return Array.isArray(val) ? val.map(f).join(", ") : f(val);
}

// ---------- Score ----------
function scoreParts(a) {
  const org = { groothandel: 4, contract: 4, producent: 4, hotel: 3, cateraar: 3, bakker: 3, restaurant: 2, winkel: 2 }[a.type] || 0;
  const fScore = { zaakvoerder: 3, aankoper: 3, chef: 2, medewerker: 1 }[a.functie] || 0;
  const iScore = { beslis: 3, mee: 2, door: 1 }[a.invloed] || 0;
  const invloed = Math.max(fScore, iScore);
  const nood = { dag: 3, week: 2, maand: 1 }[a.nood] || 0;
  const timing = { week: 3, maand: 2, later: 1 }[a.timing] || 0;
  let bonus = 0;
  if ((a.h5 || []).includes("groothandel")) bonus += 2;
  if (a.h4 === "weg") bonus += 1;
  if (a.c5 === "veel") bonus += 1;
  if (a.c4 === ">20") bonus += 1;
  if (a.z4 === ">10") bonus += 1;
  if (a.z6 === "ontevreden" || a.z6 === "nee") bonus += 1;
  if (a.b5 === "diepvries" || a.b5 === "beide") bonus += 1;
  if (a.b6 === ">5") bonus += 1;
  if (a.g5 === "beperkt" || a.g5 === "uitgebreid") bonus += 1;
  if (a.g6 === "belgie" || a.g6 === "benelux") bonus += 1;
  if (a.p5 === "lijn") bonus += 1;
  if (a.p6 === ">50") bonus += 1;
  bonus = Math.min(2, bonus);
  return { org, invloed, nood, timing, bonus, score: org * invloed + nood + timing + bonus };
}
function labelFor(a, manual) {
  if (manual) return manual;
  const p = scoreParts(a);
  if (p.score >= 14) return "A";
  if (p.score >= 8 || p.org === 4) return "B";
  return "C";
}
