// Liste des collabs ZÜMA. Source unique pour le site (page /collab/:slug,
// bloc d'accueil, lien de nav) ET pour le menu « Collab » de l'admin.
//
// Pour ajouter une future collab : ajoute simplement une entrée ici,
// elle apparaît automatiquement dans le menu admin et a sa propre page
// /collab/<slug>. Aucune autre modification nécessaire.
export type Collab = {
  slug: string;
  name: string;
  navLabel: string;
  tagline: { EN: string; FR: string };
  empty: { EN: string; FR: string };
};

export const COLLABS: Collab[] = [
  {
    slug: "bde-asclepios",
    name: "ZÜMA X BDE ASCLEPIOS",
    navLabel: "ZÜMA X BDE",
    tagline: {
      EN: "A long-term collaboration between ZÜMA and the BDE ASCLEPIOS.",
      FR: "Une collaboration au long cours entre ZÜMA et le BDE ASCLEPIOS.",
    },
    empty: {
      EN: "First pieces coming soon.",
      FR: "Premières pièces bientôt disponibles.",
    },
  },
];

export const getCollab = (slug: string | undefined) =>
  COLLABS.find((c) => c.slug === slug);
