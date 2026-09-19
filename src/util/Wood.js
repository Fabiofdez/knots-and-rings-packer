import { Dir, Namespace, Packs } from "@const/Directories";

/** @type {Map<Identifier, WoodDef>} */
const CACHE = new Map();

/** @typedef {WoodDef} WoodDef */
class WoodDef {
  type;
  namespace;
  logBlock;
  woodBlock;
  saplingBlock;
  id;

  typeAsset;
  logAsset;
  woodAsset;

  /** @param {Identifier} id */
  constructor(id) {
    const [type, namespace = Namespace.VANILLA] = id.split(":").reverse();
    let typeAsset = `${namespace}/${type}`;
    if (namespace === Namespace.VANILLA) typeAsset = type;

    this.type = type;
    this.namespace = namespace;
    this.logBlock = /** @type {const} */ (`${id}_log`);
    this.woodBlock = /** @type {const} */ (`${id}_wood`);
    this.saplingBlock = /** @type {const} */ (`${id}_sapling`);
    this.id = id;

    this.typeAsset = typeAsset;
    this.logAsset = /** @type {const} */ (`${type}_log`);
    this.woodAsset = /** @type {const} */ (`${type}_wood`);

    CACHE.set(this.id, this);
  }

  saplingAsset() {
    switch (this.type) {
      case "mangrove":
        return /** @type {const} */ (`${this.type}_propagule`);
      default:
        return /** @type {const} */ (`${this.type}_sapling`);
    }
  }

  seedAsset() {
    switch (this.type) {
      case "acacia":
      case "birch":
      case "spruce":
        return /** @type {const} */ (`${this.type}_seeds`);

      default:
        return /** @type {const} */ (`${this.type}_seed`);
    }
  }

  blockstates(pack = Packs.DEFAULT) {
    return Dir.blockstates(pack, this.namespace);
  }

  items(pack = Packs.DEFAULT) {
    return Dir.items(pack, this.namespace);
  }

  models(pack = Packs.DEFAULT) {
    return Dir.models(pack, this.namespace);
  }

  textures(pack = Packs.DEFAULT) {
    return Dir.textures(pack, this.namespace);
  }

  resId(customPath = "") {
    return /** @type {const} */ (
      `${this.namespace}:block/${customPath || this.logAsset}`
    );
  }

  logFaces() {
    return /** @type {const} */ ({
      SM: `${this.logAsset}_side_sm`,
      LEFT: `${this.logAsset}_side_left`,
      RIGHT: `${this.logAsset}_side_right`,
      CORE: `${this.logAsset}_side_core`,

      TOP: `${this.logAsset}_top`,
    });
  }

  logTop() {
    return /** @type {const} */ (`${this.logAsset}_top`);
  }

  bark() {
    return /** @type {const} */ (`${this.type}_bark`);
  }

  /** @returns {`${ReturnType<WoodDef["bark"]>}_${number}`[]} */
  barkVariants() {
    return Array(12)
      .fill(this.bark())
      .map((variant, idx) => `${variant}_${idx + 1}`);
  }

  isStripped() {
    return this.type.includes("stripped");
  }
}

export const Wood = {
  /** @param {Identifier} id */
  define(id) {
    return CACHE.get(id) || new WoodDef(id);
  },
};

export const WoodFacts = {
  /** @param {WoodDef} wood */
  isStripped(wood) {
    return wood.logBlock.includes("stripped");
  },
};
