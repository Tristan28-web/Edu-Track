
export interface MathTopic {
  slug: string;
  title: string;
  description?: string;
  icon?: React.ElementType; // Lucide icon component
  order: number; // For sequential locking
}

export const mathTopics: MathTopic[] = [
  { slug: 'quadratic-equations-functions', title: 'Quadratic Equations & Functions', order: 1 },
  { slug: 'rational-algebraic-expressions', title: 'Rational Algebraic Expressions', order: 2 },
  { slug: 'variation', title: 'Variation', order: 3 },
  { slug: 'polynomial-functions', title: 'Polynomial Functions', order: 4 },
  { slug: 'exponential-logarithmic-functions', title: 'Exponential & Logarithmic Functions', order: 5 },
  { slug: 'sequences-series', title: 'Sequences and Series', order: 6 },
  { slug: 'probability', title: 'Probability', order: 7 },
  { slug: 'statistics', title: 'Statistics', order: 8 },
];
