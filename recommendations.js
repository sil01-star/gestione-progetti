import { problemTypes } from "./taxonomy.js";

// Motore locale deterministico: non invia dati e funziona senza rete.
// Punto di estensione: in futuro un adapter cloud opzionale dovrà usare un backend,
// consenso esplicito e minimizzazione dei dati. Mai inserire segreti nel frontend.
export function recommendationsFor(typeId) {
  const type = problemTypes.find(item => item.id === typeId);
  if (!type) return null;
  return {
    title: type.label,
    methods: type.methods,
    actions: type.actions,
    caveat: "Suggerimenti iniziali da validare sul contesto reale. Non sono una diagnosi automatica."
  };
}

export function analyzeProblems(problems) {
  const counts = new Map();
  for (const p of problems) counts.set(p.typeId, (counts.get(p.typeId) || 0) + 1);
  return [...counts.entries()].sort((a,b) => b[1] - a[1]);
}
