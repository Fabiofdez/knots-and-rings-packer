import { Dir, Packs } from "@const/Directories";
import { MODELLED_SIDES, SIDES_TO_TOP_IDX } from "@const/LogSides";
import { Ctx } from "@const/RunContext";
import { Combos, SAPLINGS, SEEDLINGS } from "@const/SaplingModels";
import { WoodTypes } from "@const/WoodTypes";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

/** @type {{ [k: Identifier]: WoodResIdMapping }} */
const MODEL_CACHE = {};

const _O = "_overlay";
const _H = "_horizontal";

/**
 * @param {WoodDef} wood
 * @returns {WoodResIdMapping}
 */
function resIds(wood) {
  const cached = MODEL_CACHE[wood.id];
  if (cached) return cached;

  const models = wood.logFaces();
  const variants = wood.barkVariants();

  Object.entries(models).forEach(([side, model]) => {
    models[side] = wood.resId(model);
  });

  MODEL_CACHE[wood.id] = {
    ...models,
    VARIANTS: variants.map((model) => wood.resId(model)),
  };

  return MODEL_CACHE[wood.id];
}

function mcId(str = "") {
  return /** @type {const} */ (`minecraft:block/${str}`);
}

/** @returns {{ [k in keyof EdgeResIdMapping]: string }} */
function logEdges() {
  return {
    SM: "log_edge_sm",
    LEFT: "log_edge_left",
    RIGHT: "log_edge_right",
  };
}

/** @param {WoodDef} wood */
function particleResId(wood) {
  const overlay = WoodTypes.getOverlay(wood);
  if (overlay) return wood.resId() + _O;
  return wood.resId();
}

/**
 * @param {WoodDef} wood
 * @param {ModelledSide} sides
 */
function logResId(wood, sides) {
  return `${wood.logAsset}_${sides}`;
}

/**
 * @param {WoodDef} wood
 * @param {ModelledSide} sides
 */
function topResId(wood, sides) {
  const idx = SIDES_TO_TOP_IDX[sides];
  if (idx === 0) return resIds(wood).TOP;
  return `${resIds(wood).TOP}_${idx}`;
}

/**
 * @param {WoodDef} wood
 * @param {"0" | "1" | "l" | "r" | "2"} sideBit
 */
function sideResId(wood, sideBit) {
  switch (sideBit) {
    case "0":
      return wood.resId();
    case "1":
      return resIds(wood).SM;
    case "l":
      return resIds(wood).LEFT;
    case "r":
      return resIds(wood).RIGHT;
    case "2":
      return resIds(wood).CORE;
  }
}

/**
 * @param {WoodDef} wood
 * @param {"0" | "1" | "l" | "r" | "2"} sideBit
 */
function overlayResId(wood, sideBit = "0") {
  if (sideBit != "0") return "minecraft:block/blank";

  const condOverlay = WoodTypes.conditionalOverlay(wood);
  const overlay = WoodTypes.getOverlay(wood);

  if (overlay) return wood.resId() + _O;
  else if (condOverlay) return wood.resId(condOverlay.overlayTexture);
  else return "minecraft:block/blank";
}

/**
 * @param {ModelledSide} sides
 * @param {number} idx
 */
function edgeResId(sides, idx) {
  /** @type {("0" | "1" | "l" | "r" | "2")[]} */
  const sideBits = [sides.slice(-1), ...sides, sides[0]];
  const [before, curr, after] = sideBits.slice(idx, idx + 3);
  if (curr !== "0") return "minecraft:block/blank";

  if (before === "0" && after === "0") return mcId(logEdges().SM);
  else if (before === "0") return mcId(logEdges().RIGHT);
  else if (after === "0") return mcId(logEdges().LEFT);
  else return "minecraft:block/blank";
}

/**
 * @param {string} content
 * @param {Replacement}
 */
function replaceTarget(content, { regex = /TEMPLATE_BLOCK/g, value }) {
  return content.replace(regex, value);
}

/** @param {TemplateDef} def */
function makeHorizontal(def) {
  const [withoutExt] = def.baseFile.split(".json");
  def.baseFile = `${withoutExt + _H}.json`;

  return def;
}

/**
 * @param {TemplateDef} def
 * @param {string} overlay
 */
function withOverlay(def, overlay = "") {
  const suffix = ["overlay", overlay].filter((str) => str).join("_");
  const [withoutExt] = def.baseFile.split(".json");
  def.baseFile = `${withoutExt}_${suffix}.json`;

  return def;
}

/** @type {TemplateProvider} */
const build = (T) => ({
  defineFor(wood) {
    let replacer = T.replacer;
    if (T.replacer instanceof Function) replacer = T.replacer(wood);

    const outFile = T.output instanceof Function ? T.output(wood) : T.output;
    execSync(`cp ${Ctx.WORK_DIR}/templates/${T.baseFile} ${outFile}`);

    let content = readFileSync(outFile).toLocaleString();
    if (replacer instanceof Array) {
      replacer.forEach((repl) => (content = replaceTarget(content, repl)));
    } else if (typeof replacer === "string") {
      content = replaceTarget(content, { value: replacer });
    } else if (replacer?.regex) {
      content = replaceTarget(content, replacer);
    }

    if (T.postProcess instanceof Function) {
      content = T.postProcess(content);
    }

    writeFileSync(outFile, content);
  },
});

/** @type {TemplateProvider} */
const buildCTM = build;
/** @type {TemplateProvider} */
const buildFusion = build;

const Models = {
  /** @type {LogModelTemplateProvider} */
  buildLog: (defProvider) => ({
    defineFor(wood) {
      const models = MODELLED_SIDES.map((sides) => [
        sides,
        logResId(wood, sides),
      ]);

      let transform = (def) => def;
      const overlay = WoodTypes.getOverlay(wood);
      if (overlay) transform = (def) => withOverlay(def, overlay);

      models
        .map(([sides, model]) => defProvider(sides, model))
        .map((def) => transform(def))
        .forEach((def) => build(def).defineFor(wood));

      models
        .map(([sides, model]) => defProvider(sides, model + _H))
        .map((def) => transform(def))
        .forEach((def) => build(makeHorizontal(def)).defineFor(wood));

      if (!WoodTypes.conditionalOverlay(wood)) return;

      const overlayModels = models
        .filter(([sides]) => sides.includes("0"))
        .map(([sides, model]) => [sides, model + _O]);

      overlayModels
        .map(([sides, model]) => withOverlay(defProvider(sides, model)))
        .forEach((def) => build(def).defineFor(wood));

      overlayModels
        .map(([sides, model]) => withOverlay(defProvider(sides, model + _H)))
        .forEach((def) => build(makeHorizontal(def)).defineFor(wood));
    },
  }),

  /** @type {TemplateProvider} */
  buildWood: (def) => ({
    defineFor(wood) {
      let transform = (def) => def;
      const overlay = WoodTypes.getOverlay(wood);
      if (overlay) transform = (def) => withOverlay(def, overlay);

      build(transform({ ...def })).defineFor(wood);
    },
  }),

  /** @type {SaplingModelTemplateProvider} */
  buildSapling: (templates, defProvider) => ({
    defineFor(wood) {
      const resolveForWood = (output = "") => `${wood.type}_${output}`;

      templates
        .map(([template, model, idx]) => ({
          template,
          model: resolveForWood(model),
          combos: Combos.forIdx(template, idx),
        }))
        .map(({ template: t, model, combos }) => defProvider(t, model, combos))
        .forEach((def) => build(def).defineFor(wood));
    },
  }),
};

/** @param {{ x: number; y: number; z: number }} axes */
function rotate(axes = {}) {
  const trimBrackets = /^\{([^]*)\}$/;
  const parsed = JSON.stringify(axes).match(trimBrackets)?.[1]?.trim();

  if (!parsed) return '"';
  return `", ${parsed}`;
}

/** @type {WoodMultiPredicate} */
const modelConditionReplacement = (wood) => ({
  regex: /CONDITION_PROP/g,
  value: WoodTypes.conditionalOverlay(wood)?.conditionName,
});

/** @type {Replacement[]} */
const modelOrientationReplacements = [
  { regex: /",[\s\n]*"X_0": "TEMPLATE"/g, value: rotate() },
  { regex: /",[\s\n]*"X_1": "TEMPLATE"/g, value: rotate({ x: -90 }) },
  { regex: /",[\s\n]*"X_2": "TEMPLATE"/g, value: rotate({ x: 180 }) },
  { regex: /",[\s\n]*"X_3": "TEMPLATE"/g, value: rotate({ x: 90 }) },

  { regex: /",[\s\n]*"Y_0": "TEMPLATE"/g, value: rotate() },
  { regex: /",[\s\n]*"Y_1": "TEMPLATE"/g, value: rotate({ y: -90 }) },
  { regex: /",[\s\n]*"Y_2": "TEMPLATE"/g, value: rotate({ y: 180 }) },
  { regex: /",[\s\n]*"Y_3": "TEMPLATE"/g, value: rotate({ y: 90 }) },

  { regex: /",[\s\n]*"Z_0": "TEMPLATE"/g, value: rotate({ y: 90 }) },
  { regex: /",[\s\n]*"Z_1": "TEMPLATE"/g, value: rotate({ x: -90, y: 90 }) },
  { regex: /",[\s\n]*"Z_2": "TEMPLATE"/g, value: rotate({ x: 180, y: 90 }) },
  { regex: /",[\s\n]*"Z_3": "TEMPLATE"/g, value: rotate({ x: 90, y: 90 }) },
];

/** @type {TemplateDef} */
const logBlockStateDef = {
  output: (wood) => `${wood.blockstates()}/${wood.logAsset}.json`,
  replacer: (wood) => [
    { regex: /TEMPLATE_LOG/g, value: wood.resId() },
    { regex: /_H/g, value: _H },

    ...modelOrientationReplacements,
    modelConditionReplacement(wood),
  ],
  postProcess: (json) => JSON.stringify(JSON.parse(json)),
};

export const Templates = {
  BLOCKSTATES: {
    LOG: build({
      baseFile: "blockstates/log.json",
      ...logBlockStateDef,
    }),

    LOG_OVERLAY: build({
      baseFile: "blockstates/log_conditional_overlay.json",
      ...logBlockStateDef,
    }),

    WOOD: build({
      baseFile: "blockstates/wood.json",
      output: (wood) => `${wood.blockstates()}/${wood.woodAsset}.json`,
      replacer: (wood) => ({
        regex: /TEMPLATE_WOOD/g,
        value: wood.resId(wood.woodAsset) + "_custom",
      }),
      postProcess: (json) => JSON.stringify(JSON.parse(json)),
    }),

    SAPLING: build({
      baseFile: "blockstates/sapling.json",
      // prettier-ignore
      output: (wood) => `${wood.blockstates(Packs.SAPLINGS)}/${wood.saplingAsset()}.json`,
      replacer: (wood) => [
        { regex: /TEMPLATE_SAPLING/g, value: wood.resId(wood.typeAsset) },
      ],
    }),

    SAPLING_STEM: build({
      baseFile: "blockstates/sapling_stem.json",
      // prettier-ignore
      output: (wood) => `${Dir.MOD.blockstates(Packs.SAPLINGS)}/${wood.saplingAsset()}_stem.json`,
      replacer: (wood) => [
        { regex: /TEMPLATE_SAPLING/g, value: wood.resId(wood.typeAsset) },
      ],
    }),

    SEED: build({
      baseFile: "blockstates/seed.json",
      // prettier-ignore
      output: (wood) => `${Dir.MOD.blockstates(Packs.SAPLINGS)}/${wood.seedAsset()}.json`,
      replacer: (wood) => [{ regex: /TEMPLATE_WOOD/g, value: wood.type }],
    }),
  },

  ITEMS: {
    SEED: build({
      baseFile: "items/seed.json",
      // prettier-ignore
      output: (wood) => `${Dir.MOD.items(Packs.SAPLINGS)}/${wood.seedAsset()}.json`,
      replacer: (wood) => [
        { regex: /TEMPLATE_SEED/g, value: wood.seedAsset() },
      ],
    }),
  },

  MODELS: {
    LOG: Models.buildLog((sides, model) => ({
      baseFile: "models/log.json",
      output: (wood) => `${wood.models()}/block/${model}.json`,
      replacer: (wood) => [
        { regex: /TEMPLATE_PARTICLE/g, value: particleResId(wood) },

        { regex: /TEMPLATE_SIDE0/g, value: sideResId(wood, sides[0]) },
        { regex: /TEMPLATE_SIDE1/g, value: sideResId(wood, sides[1]) },
        { regex: /TEMPLATE_SIDE2/g, value: sideResId(wood, sides[2]) },
        { regex: /TEMPLATE_SIDE3/g, value: sideResId(wood, sides[3]) },

        { regex: /TEMPLATE_TOPS/g, value: topResId(wood, sides) },

        { regex: /TEMPLATE_EDGE0/g, value: edgeResId(sides, 0) },
        { regex: /TEMPLATE_EDGE1/g, value: edgeResId(sides, 1) },
        { regex: /TEMPLATE_EDGE2/g, value: edgeResId(sides, 2) },
        { regex: /TEMPLATE_EDGE3/g, value: edgeResId(sides, 3) },

        { regex: /TEMPLATE_OVERLAY0/g, value: overlayResId(wood, sides[0]) },
        { regex: /TEMPLATE_OVERLAY1/g, value: overlayResId(wood, sides[1]) },
        { regex: /TEMPLATE_OVERLAY2/g, value: overlayResId(wood, sides[2]) },
        { regex: /TEMPLATE_OVERLAY3/g, value: overlayResId(wood, sides[3]) },
      ],
    })),

    WOOD: Models.buildWood({
      baseFile: "models/wood.json",
      output: (wood) => `${wood.models()}/block/${wood.woodAsset}_custom.json`,
      replacer: (wood) => [
        { regex: /TEMPLATE_PARTICLE/g, value: particleResId(wood) },
        { regex: /TEMPLATE_BARK/g, value: wood.resId() },
        { regex: /TEMPLATE_OVERLAY/g, value: overlayResId(wood) },
      ],
    }),

    SAPLING: Models.buildSapling(SAPLINGS, (template, model, combo) => ({
      baseFile: `models/${template}.json`,
      output: (wood) => `${wood.models(Packs.SAPLINGS)}/block/${model}.json`,
      replacer: (wood) => [
        { regex: /TEMPLATE_WOOD/g, value: wood.resId(wood.typeAsset) },
        { regex: /IDX_1/g, value: combo[1] },
        { regex: /IDX_2/g, value: combo[2] },
        { regex: /IDX/g, value: combo[0] },
      ],
    })),

    SEEDLING: Models.buildSapling(SEEDLINGS, (template, model, combo) => ({
      baseFile: `models/${template}.json`,
      output: `${Dir.MOD.models(Packs.SAPLINGS)}/block/${model}.json`,
      replacer: (wood) => [
        { regex: /TEMPLATE_WOOD/g, value: wood.type },
        { regex: /IDX_1/g, value: combo[1] },
        { regex: /IDX_2/g, value: combo[2] },
        { regex: /IDX/g, value: combo[0] },
      ],
    })),

    SEED: build({
      baseFile: "models/seed.json",
      // prettier-ignore
      output: (wood) => `${Dir.MOD.models(Packs.SAPLINGS)}/item/${wood.seedAsset()}.json`,
      replacer: (wood) => [
        { regex: /TEMPLATE_SEED/g, value: wood.seedAsset() },
      ],
    }),

    /* 
    pack_saplings/assets/knots_and_rings/textures/item/acacia_seeds.png
    pack_saplings/assets/minecraft/textures/block/acacia_stem_sides.png
    */
  },

  CTM: {
    VARIANTS: buildCTM({
      baseFile: "variants.ctm.properties",
      output: (wood) => `${Dir.CTM.variants(wood)}/variants.ctm.properties`,
      replacer: (wood) => ({ regex: /TEMPLATE_TILE/g, value: wood.resId() }),
    }),
  },

  Fusion: {
    VARIANTS: buildFusion({
      baseFile: "variants.png.mcmeta",
      // prettier-ignore
      output: (wood) => `${wood.textures(Packs.FUSION)}/block/${wood.logAsset}.png.mcmeta`,
    }),
  },
};
