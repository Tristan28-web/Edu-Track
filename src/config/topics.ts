export interface MathTopic {
  slug: string;
  title: string;
  grade: string;
  standards: string[];
}

export const mathTopics: MathTopic[] = [
  // Grade 7
  {
    slug: "grade-7-sets-and-real-number-system",
    title: "Sets and Real Number System",
    grade: "Grade 7",
    standards: [
      "Sets and real number system (number & number sense)",
    ],
  },
  {
    slug: "grade-7-measurement-unit-conversions",
    title: "Measurement: Unit Conversions",
    grade: "Grade 7",
    standards: [
      "Measurement: unit conversions",
    ],
  },
  {
    slug: "grade-7-algebra-linear-equations-and-inequalities",
    title: "Algebra: Linear Equations and Inequalities",
    grade: "Grade 7",
    standards: [
      "Linear equations & inequalities in one variable; algebraic expressions; properties of real numbers",
    ],
  },
  {
    slug: "grade-7-geometry-sides-and-angles-of-polygons",
    title: "Geometry: Sides and Angles of Polygons",
    grade: "Grade 7",
    standards: [
      "Geometry: sides and angles of polygons",
    ],
  },
  {
    slug: "grade-7-statistics-and-probability-data-analysis",
    title: "Statistics & Probability: Data Analysis",
    grade: "Grade 7",
    standards: [
      "Data collection, presentation, measures of central tendency and variability",
    ],
  },

  // Grade 8
  {
    slug: "grade-8-algebra-factors-of-polynomials-rational-expressions",
    title: "Algebra: Factors of Polynomials & Rational Expressions",
    grade: "Grade 8",
    standards: [
      "Factors of polynomials; rational algebraic expressions; systems of linear equations and inequalities in two variables",
    ],
  },
  {
    slug: "grade-8-geometry-axiomatic-structure-triangle-congruence",
    title: "Geometry: Axiomatic Structure & Triangle Congruence",
    grade: "Grade 8",
    standards: [
      "Axiomatic structure of geometry, triangle congruence, inequalities in a triangle, parallel & perpendicular lines",
    ],
  },
  {
    slug: "grade-8-probability-and-statistics-simple-events",
    title: "Probability & Statistics: Simple Events",
    grade: "Grade 8",
    standards: [
      "Probability of simple events",
    ],
  },

  // Grade 9
  {
    slug: "grade-9-algebra-quadratic-equations-variations-radicals",
    title: "Algebra: Quadratic Equations, Variations, Radicals",
    grade: "Grade 9",
    standards: [
      "Quadratic equations & inequalities, quadratic functions, variations, radicals, rational algebraic equations",
    ],
  },
  {
    slug: "grade-9-geometry-parallelograms-triangle-similarity",
    title: "Geometry: Parallelograms & Triangle Similarity",
    grade: "Grade 9",
    standards: [
      "Parallelograms, triangle similarity",
    ],
  },
  {
    slug: "grade-9-trigonometry-basic-concepts",
    title: "Trigonometry: Basic Concepts",
    grade: "Grade 9",
    standards: [
      "Basic trigonometry: right triangles and trigonometric ratios",
    ],
  },

  // Grade 10
  {
    slug: "grade-10-algebra-sequences-series-polynomials",
    title: "Algebra: Sequences, Series & Polynomials",
    grade: "Grade 10",
    standards: [
      "Sequences & series, polynomials, polynomial equations & functions, systems of equations",
    ],
  },
  {
    slug: "grade-10-geometry-circles-coordinate-geometry-axiomatic",
    title: "Geometry: Circles, Coordinate Geometry & Axiomatic",
    grade: "Grade 10",
    standards: [
      "Circles, coordinate geometry, axiomatic geometry, similarity, basic trigonometry",
    ],
  },
  {
    slug: "grade-10-statistics-and-probability-combinatorics-central-tendency",
    title: "Statistics & Probability: Combinatorics & Central Tendency",
    grade: "Grade 10",
    standards: [
      "Combinatorics, probability, measures of central tendency, variability, and position",
    ],
  },
];
