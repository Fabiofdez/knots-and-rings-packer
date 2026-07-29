/** @typedef {(typeof WoodTypes)["VANILLA" | "REGIONS_UNEXPLORED"][number]} WoodType */

export const WoodTypes = /** @type {const} */ ({
  VANILLA: [
    "acacia",
    "birch",
    "cherry",
    "dark_oak",
    "jungle",
    "mangrove",
    "oak",
    "pale_oak",
    "spruce",
    "stripped_acacia",
    "stripped_birch",
    "stripped_cherry",
    "stripped_dark_oak",
    "stripped_jungle",
    "stripped_mangrove",
    "stripped_oak",
    "stripped_pale_oak",
    "stripped_spruce",
  ],

  REGIONS_UNEXPLORED: [
    // "regions_unexplored:alpha",
    "regions_unexplored:ashen",
    "regions_unexplored:baobab",
    "regions_unexplored:blackwood",
    "regions_unexplored:brimwood",
    "regions_unexplored:cobalt",
    "regions_unexplored:cypress",
    "regions_unexplored:dead",
    "regions_unexplored:eucalyptus",
    "regions_unexplored:joshua",
    "regions_unexplored:kapok",
    "regions_unexplored:larch",
    "regions_unexplored:magnolia",
    "regions_unexplored:maple",
    "regions_unexplored:palm",
    "regions_unexplored:pine",
    "regions_unexplored:redwood",
    "regions_unexplored:silver_birch",
    "regions_unexplored:socotra",
    "regions_unexplored:willow",
    "regions_unexplored:wisteria",
    "regions_unexplored:stripped_baobab",
    "regions_unexplored:stripped_blackwood",
    "regions_unexplored:stripped_brimwood",
    "regions_unexplored:stripped_cobalt",
    "regions_unexplored:stripped_cypress",
    "regions_unexplored:stripped_dead",
    "regions_unexplored:stripped_eucalyptus",
    "regions_unexplored:stripped_joshua",
    "regions_unexplored:stripped_kapok",
    "regions_unexplored:stripped_larch",
    "regions_unexplored:stripped_magnolia",
    "regions_unexplored:stripped_maple",
    "regions_unexplored:stripped_palm",
    "regions_unexplored:stripped_pine",
    "regions_unexplored:stripped_redwood",
    "regions_unexplored:stripped_socotra",
    "regions_unexplored:stripped_willow",
    "regions_unexplored:stripped_wisteria",
  ],

  /** @param {{ id: WoodType }} wood */
  hasVariants(wood) {
    return !customProperties[wood.id]?.noVariants;
  },

  /** @param {{ id: WoodType }} wood */
  getOverlay(wood) {
    return customProperties[wood.id]?.overlay;
  },

  /** @param {{ id: WoodType }} wood */
  hasCustomSides(wood) {
    return customProperties[wood.id]?.customSides;
  },

  /** @param {{ id: WoodType }} wood */
  conditionalOverlay(wood) {
    return customProperties[wood.id]?.conditionalOverlay;
  },
});

/**
 * @typedef {{
 *   overlay?: "tint" | "";
 *   noVariants?: boolean;
 *   customSides?: boolean;
 *   conditionalOverlay?: { conditionName: string; overlayTexture: string };
 * }} WoodProperties
 *
 * @type {{ [Key in WoodType]?: WoodProperties }}
 */
const customProperties = {
  "regions_unexplored:eucalyptus": {
    overlay: "tint",
    noVariants: true,
  },

  "regions_unexplored:palm": { customSides: true },
  "regions_unexplored:stripped_palm": { customSides: true },

  "regions_unexplored:pine": {
    conditionalOverlay: {
      conditionName: "transition_block",
      overlayTexture: "pine_log_transition",
    },
  },

  "regions_unexplored:silver_birch": {
    conditionalOverlay: {
      conditionName: "is_base",
      overlayTexture: "silver_birch_log_base",
    },
  },
};
