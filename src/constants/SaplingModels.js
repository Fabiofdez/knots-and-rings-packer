/** @type {ResolvedModel[]} */
export const SAPLINGS = resolveModels([
  (idx = "") => `decaying_sprout${idx}`,
  (idx = "") => `decaying_sprout${idx}_corner`,
  (idx = "") => `sprout${idx}`,
  (idx = "") => `sprout${idx}_corner`,
  (idx = "") => `sapling${idx}`,
  (idx = "") => `sapling${idx}_corner`,
  (idx = "") => `sapling_branches${idx}`,
  (idx = "") => `tall_sapling_branches${idx}`,
  (idx = "") => `tall_sapling_branches${idx}_corner`,
  (idx = "") => `giant_sapling_branches${idx}`,
  (idx = "") => `giant_sapling_branches${idx}_corner`,
  (idx = "") => `giant_sapling_canopy${idx}`,
  (idx = "") => `giant_sapling_canopy${idx}_corner`,
  (idx = "") => `roots${idx}`,
  (idx = "") => `roots${idx}_corner`,
  (idx = "") => `roots${idx}_large`,
  (idx = "") => `roots${idx}_large_corner`,

  "giant_sapling_trunk",
  "giant_sapling_trunk_corner",
  "sapling_trunk",
  "sapling_trunk_corner",

  "stem_particle",
]);

/** @type {ResolvedModel[]} */
export const SEEDLINGS = resolveModels([(idx = "") => `seedling${idx}`]);

export const Combos = {
  DEFAULT: {
    1: ["", "", "2"],
    2: ["2", "2", "3"],
    3: ["3", "", "3"],
    4: ["4", "2", ""],
    5: ["5", "3", "2"],
    6: ["6", "3", ""],
  },

  FOR_CANOPY: {
    1: ["", "", "2"],
    2: ["2", "2", ""],
  },

  /** @returns {[string, string, string]} */
  forIdx(template = "", idx = 1) {
    return (template.includes("canopy") ? this.FOR_CANOPY : this.DEFAULT)[idx];
  },
};

export const COMBINATIONS = {};

function numVariants(template = "") {
  switch (template) {
    case "tall_sapling_branches_corner":
    case "giant_sapling_branches_corner":
    case "roots_corner":
    case "roots_large_corner":
      return 6;

    case "seedling":
    case "decaying_sprout":
    case "decaying_sprout_corner":
    case "sprout":
    case "sprout_corner":
    case "sapling":
    case "sapling_corner":
    case "sapling_branches":
    case "tall_sapling_branches":
    case "giant_sapling_branches":
    case "roots":
    case "roots_large":
      return 3;

    case "giant_sapling_canopy":
    case "giant_sapling_canopy_corner":
      return 2;

    default:
      return 1;
  }
}

/**
 * @typedef {string | ((idx?: string) => string)} ModelResolver
 * @param {ModelResolver[]} templates
 */
function resolveModels(templates) {
  /** @type {ResolvedModel[]} */
  const allModels = [];

  templates.forEach((model) => {
    const hasVariants = model instanceof Function;
    const template = hasVariants ? model() : model;

    for (let idx = 1; idx <= numVariants(template); idx++) {
      const output = hasVariants ? model(idx === 1 ? "" : idx) : model;
      allModels.push([template, output, idx]);
    }
  });

  return allModels;
}
