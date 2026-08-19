import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { WoodFacts } from "@util/Wood";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

/** @type {{ [k: WoodType]: WoodResIdMapping }} */
const MODEL_CACHE = {};

const SIDES_TO_TOP = [
  "0000",
  "0100",
  "0101",
  "0001",
  "0110",
  "0011",
  "1110",
  "0111",
  "rl11",
  "1rl1",
  "l1r2",
  "2l1r",
  "0010",
  "0rl0",
  "0r2l",
  "00rl",
  "1100",
  "1001",
  "1101",
  "1011",
  "l11r",
  "11rl",
  "1r2l",
  "r2l1",
  "1010",
  "r2l0",
  "2222",
  "l0r2",
  "1rl0",
  "01rl",
  "rl10",
  "0rl1",
  "2lr2",
  "22lr",
  "rlrl",
  "lrlr",
  "1000",
  "rl00",
  "2l0r",
  "l00r",
  "rl01",
  "l01r",
  "l10r",
  "10rl",
  "lr22",
  "r22l",
  "1111",
];

const NUMBERED_TOPS = [...SIDES_TO_TOP.keys()].slice(1);

const _H = "_horizontal";

/**
 * @param {BaseWoodAssets} wood
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

/**
 * @param {string} content
 * @param {Replacement}
 */
function replaceTarget(content, { regex = /TEMPLATE_BLOCK/g, value }) {
  return content.replace(regex, value);
}

/** @param {TemplateDef<BaseWoodAssets} def */
function makeHorizontal(def) {
  const [withoutExt] = def.baseFile.split(".json");
  def.baseFile = `${withoutExt + _H}.json`;

  return def;
}

/**
 * @param {TemplateDef<BaseWoodAssets} def
 * @param {string} overlay
 */
function withOverlay(def, overlay = "") {
  const suffix = ["overlay", overlay].filter((str) => str).join("_");
  const [withoutExt] = def.baseFile.split(".json");
  def.baseFile = `${withoutExt}_${suffix}.json`;

  return def;
}

/**
 * @param {WoodAssetsCTM} wood
 * @param {Object[]} properties
 */
function withProperties(wood, properties = [], withOverlay = false) {
  const output = wood.logBlock;

  let woodProperties = properties;
  const overlay = WoodTypes.conditionalOverlay(wood);
  if (overlay) {
    woodProperties = [
      ...properties,
      { [overlay.conditionName]: `${withOverlay}` },
    ];
  }

  const parsedProps = woodProperties
    .map((propEntry) => Object.entries(propEntry)[0])
    .map(([prop, values]) => `${prop}=${values.replace(/\|/g, ",")}`);

  if (parsedProps.length) return [output, ...parsedProps].join(":");
  return output;
}

/**
 * @param {BaseWoodAssets} wood
 * @param {keyof LogFaceMapping} side
 * @returns {Replacement}
 */
function sideTexture(wood, side) {
  return {
    regex: /TEMPLATE_TEXTURE/g,
    value: side === "BARK" ? wood.resId() : resIds(wood)[side],
  };
}

/** @type {TemplateProvider<BaseWoodAssets>} */
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

/** @type {TemplateProvider<WoodAssetsCTM>} */
const buildCTM = build;
/** @type {TemplateProvider<WoodAssetsFusion>} */
const buildFusion = build;

const LogModels = {
  /** @type {LogModelTemplateProvider<keyof LogFaceMapping, BaseWoodAssets>} */
  buildSides: (defProvider) => ({
    defineFor(wood) {
      const { TOP, ...logSides } = wood.logFaces();

      const overlay = WoodTypes.getOverlay(wood);
      if (typeof overlay === "string") {
        const barkModel = logSides.BARK;
        delete logSides.BARK;

        let def = withOverlay(defProvider("BARK", barkModel), overlay);
        build(def).defineFor(wood);

        def = withOverlay(defProvider("BARK", barkModel + _H), overlay);
        build(makeHorizontal(def)).defineFor(wood);
      }

      Object.entries(logSides)
        .map(([side, model]) => defProvider(side, model))
        .forEach((def) => build(def).defineFor(wood));

      Object.entries(logSides)
        .map(([side, model]) => defProvider(side, model + _H))
        .forEach((def) => build(makeHorizontal(def)).defineFor(wood));
    },
  }),

  /** @type {LogModelTemplateProvider<Number, BaseWoodAssets>} */
  buildTops: (defProvider) => ({
    defineFor(wood) {
      const model = wood.logFaces().TOP;

      NUMBERED_TOPS.map((idx) => defProvider(idx, model)).forEach((def) =>
        build(def).defineFor(wood),
      );
    },
  }),

  /** @type {LogModelTemplateProvider<Number, BaseWoodAssets>} */
  buildDefaultTops: (defProvider) => ({
    defineFor(wood) {
      const model = wood.logFaces().TOP;
      return build(defProvider(0, model)).defineFor(wood);
    },
  }),

  /** @type {EdgeModelTemplateProvider} */
  buildEdges: (defProvider) => ({
    defineAll() {
      const edges = logEdges();

      Object.entries(edges)
        .map(([side, model]) => defProvider(side, model))
        .forEach((def) => build(def).defineFor());

      Object.entries(edges)
        .map(([side, model]) => defProvider(side, model + _H))
        .forEach((def) => build(makeHorizontal(def)).defineFor());
    },
  }),
};

const BarkModels = {
  /** @type {BarkModelTemplateProvider<Number, BaseWoodAssets>} */
  buildVariants: (defProvider) => ({
    defineFor(wood) {
      const variants = wood.barkVariants();
      if (WoodFacts.isStripped(wood)) variants.push(wood.logFaces().BARK);

      variants
        .map((model, idx) => defProvider(idx, model))
        .forEach((def) => build(def).defineFor(wood));

      variants
        .map((model, idx) => defProvider(idx, model + _H))
        .forEach((def) => build(makeHorizontal(def)).defineFor(wood));
    },
  }),

  /** @type {BarkModelTemplateProvider<Number, BaseWoodAssets>} */
  buildOverlayVariants: (defProvider) => ({
    defineFor(wood) {
      const variants = [...wood.barkVariants(), wood.logFaces().BARK].map(
        (model) => `${model}_overlay`,
      );

      variants
        .map((model, idx) => withOverlay(defProvider(idx, model)))
        .forEach((def) => build(def).defineFor(wood));

      variants
        .map((model, idx) => withOverlay(defProvider(idx, model + _H)))
        .forEach((def) => build(makeHorizontal(def)).defineFor(wood));
    },
  }),
};

const PropetiesCTM = {
  /** @type {EdgeCTMTemplateProvider} */
  buildLogEdges: (defProvider) => ({
    defineAll(woodAssets) {
      const mappingsFile = `${Ctx.WORK_DIR}/templates/log_edges_ctm_mapping.json`;

      /** @type {MappingCTM[]} */
      const mappings = JSON.parse(readFileSync(mappingsFile).toString())?.files;

      const isBase = (wood) => !WoodTypes.getOverlay(wood);
      const isAlt = (wood) => {
        return WoodTypes.getOverlay(wood) || WoodTypes.conditionalOverlay(wood);
      };

      const baseWoods = woodAssets.filter(isBase);
      const altWoods = woodAssets.filter(isAlt);

      mappings.forEach((mapping) => {
        /** @type {typeof mapping} */
        const baseMapping = JSON.parse(JSON.stringify(mapping));
        baseMapping.matchBlocks = baseWoods
          .map((wood) => withProperties(wood, baseMapping.properties))
          .join(" ");

        build(defProvider(baseMapping)).defineFor();
        if (!altWoods.length) return;

        /** @type {typeof mapping} */
        const altMapping = JSON.parse(JSON.stringify(mapping));
        altMapping.fileName += "_alt";
        altMapping.tiles += "_alt";
        altMapping.matchBlocks = altWoods
          .map((wood) => withProperties(wood, altMapping.properties, true))
          .join(" ");

        build(defProvider(altMapping)).defineFor();
      });
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

/** @type {WoodMultiPredicate<BaseWoodAssets>} */
const modelBarkReplacements = (wood) => [
  { regex: /T_LOG_BARK/g, value: resIds(wood).BARK },
  { regex: /T_BARK/g, value: wood.resId(wood.bark()) },
  { regex: /_H/g, value: _H },
];

/** @type {WoodMultiPredicate<BaseWoodAssets>} */
const modelConditionReplacement = (wood) => ({
  regex: /CONDITION_PROP/g,
  value: WoodTypes.conditionalOverlay(wood)?.conditionName,
});

/** @type {Replacement[]} */
const modelOrientationReplacements = [
  { regex: /",[\s\n]*"X_0": "TEMPLATE"/g, value: rotate() },
  { regex: /",[\s\n]*"X_1": "TEMPLATE"/g, value: rotate({ x: 90 }) },
  { regex: /",[\s\n]*"X_2": "TEMPLATE"/g, value: rotate({ x: 180 }) },
  { regex: /",[\s\n]*"X_3": "TEMPLATE"/g, value: rotate({ x: 270 }) },

  { regex: /",[\s\n]*"Y_0": "TEMPLATE"/g, value: rotate() },
  { regex: /",[\s\n]*"Y_1": "TEMPLATE"/g, value: rotate({ y: 90 }) },
  { regex: /",[\s\n]*"Y_2": "TEMPLATE"/g, value: rotate({ y: 180 }) },
  { regex: /",[\s\n]*"Y_3": "TEMPLATE"/g, value: rotate({ y: 270 }) },

  { regex: /",[\s\n]*"Z_0": "TEMPLATE"/g, value: rotate({ y: 90 }) },
  { regex: /",[\s\n]*"Z_1": "TEMPLATE"/g, value: rotate({ x: 90, y: 90 }) },
  { regex: /",[\s\n]*"Z_2": "TEMPLATE"/g, value: rotate({ x: 180, y: 90 }) },
  { regex: /",[\s\n]*"Z_3": "TEMPLATE"/g, value: rotate({ x: -90, y: 90 }) },
];

/** @type {TemplateDef<BaseWoodAssets>} */
const logBlockStateDef = {
  output: (wood) => `${wood.blockstatesDir}/${wood.logAsset}.json`,
  replacer: (wood) => [
    { regex: /TEMPLATE_LOG_DEFAULT/g, value: wood.resId() },
    { regex: /TEMPLATE_LOG_SM/g, value: resIds(wood).SM },
    { regex: /TEMPLATE_LOG_LEFT/g, value: resIds(wood).LEFT },
    { regex: /TEMPLATE_LOG_RIGHT/g, value: resIds(wood).RIGHT },
    { regex: /TEMPLATE_LOG_CORE/g, value: resIds(wood).CORE },
    { regex: /TEMPLATE_LOG_TOP/g, value: resIds(wood).TOP },
    ...modelBarkReplacements(wood),

    modelConditionReplacement(wood),

    { regex: /TEMPLATE_LOG_EDGES_SM/g, value: mcId(logEdges().SM) },
    { regex: /TEMPLATE_LOG_EDGES_LEFT/g, value: mcId(logEdges().LEFT) },
    { regex: /TEMPLATE_LOG_EDGES_RIGHT/g, value: mcId(logEdges().RIGHT) },

    ...modelOrientationReplacements,
  ],
  postProcess: (json) => JSON.stringify(JSON.parse(json)),
};

/** @type {TemplateDef<BaseWoodAssets>} */
const woodBlockStateDef = {
  output: (wood) => `${wood.blockstatesDir}/${wood.woodAsset}.json`,
  replacer: (wood) => [
    ...modelBarkReplacements(wood),
    ...modelOrientationReplacements,
  ],
  postProcess: (json) => JSON.stringify(JSON.parse(json)),
};

export const Templates = {
  BLOCKSTATES: {
    LOG: build({
      baseFile: "blockstates/log.json",
      ...logBlockStateDef,
    }),

    LOG_NO_VARIANTS: build({
      baseFile: "blockstates/log_no_variants.json",
      ...logBlockStateDef,
    }),

    LOG_OVERLAY: build({
      baseFile: "blockstates/log_conditional_overlay.json",
      ...logBlockStateDef,
    }),

    STRIPPED_LOG: build({
      baseFile: "blockstates/stripped_log.json",
      ...logBlockStateDef,
    }),

    WOOD: build({
      baseFile: "blockstates/wood.json",
      ...woodBlockStateDef,
    }),

    WOOD_NO_VARIANTS: build({
      baseFile: "blockstates/wood_no_variants.json",
      ...woodBlockStateDef,
    }),
  },

  MODELS: {
    LOG_SIDES: LogModels.buildSides((side, model) => ({
      baseFile: "models/side.json",
      output: (wood) => `${wood.modelsDir}/${model}.json`,
      replacer: (wood) => sideTexture(wood, side),
    })),

    LOG_TOPS: LogModels.buildTops((idx, model) => ({
      baseFile: "models/log_top.json",
      output: (wood) => `${wood.modelsDir}/${model}_${idx}.json`,
      replacer: (wood) => ({
        regex: /TEMPLATE_LOG_TEXTURE/g,
        value: `${resIds(wood).TOP}_${idx}`,
      }),
    })),

    DEFAULT_LOG_TOPS: LogModels.buildDefaultTops((_, model) => ({
      baseFile: "models/log_top.json",
      output: (wood) => `${wood.modelsDir}/${model}.json`,
      replacer: (wood) => ({
        regex: /TEMPLATE_LOG_TEXTURE/g,
        value: resIds(wood).TOP,
      }),
    })),

    LOG_EDGES: LogModels.buildEdges((side, model) => ({
      baseFile: "models/log_edge.json",
      output: `${Ctx.WORK_DIR}/${Dir.models()}/block/${model}.json`,
      replacer: {
        regex: /TEMPLATE_EDGE_TEXTURE/g,
        value: mcId(logEdges()[side]),
      },
    })),

    BARK_VARIANTS: BarkModels.buildVariants((idx, model) => ({
      baseFile: "models/side.json",
      output: (wood) => `${wood.modelsDir}/${model}.json`,
      replacer: (wood) => ({
        regex: /TEMPLATE_TEXTURE/g,
        value: idx >= 12 ? wood.resId() : resIds(wood).VARIANTS[idx],
      }),
    })),

    BARK_OVERLAY_VARIANTS: BarkModels.buildOverlayVariants((idx, model) => ({
      baseFile: "models/side.json",
      output: (wood) => `${wood.modelsDir}/${model}.json`,
      replacer: (wood) => [
        {
          regex: /TEMPLATE_TEXTURE_overlay/g,
          value: wood.resId(WoodTypes.conditionalOverlay(wood).overlayTexture),
        },
        {
          regex: /TEMPLATE_TEXTURE/g,
          value: idx >= 12 ? wood.resId() : resIds(wood).VARIANTS[idx],
        },
      ],
    })),
  },

  CTM: {
    LOG_VARIANTS: buildCTM({
      baseFile: "template_log.properties",
      output: (wood) => `${wood.variantsDir}/log.properties`,
      replacer: (wood) => wood.logAsset,
    }),

    WOOD_VARIANTS: buildCTM({
      baseFile: "template_wood.properties",
      output: (wood) => `${wood.variantsDir}/wood.properties`,
      replacer: (wood) => wood.woodBlock,
    }),

    TOP: buildCTM({
      baseFile: "top.ctm.properties",
      output: (wood) => `${wood.topsDir}/ctm.properties`,
      replacer: (wood) => wood.logBlock,
    }),

    // TODO: fill in ctm.properties for log edges,
    // replacing the following:

    // TEMPLATE_MATCH_BLOCKS
    // TEMPLATE_TILES
    // TEMPLATE_FACES
    LOG_EDGES: PropetiesCTM.buildLogEdges((mapping) => ({
      baseFile: "template_log_edges.ctm.properties",
      output: `${Ctx.WORK_DIR}/${Dir.CTM.ROOT}/log_edges/${mapping.fileName}.ctm.properties`,
      replacer: [
        { regex: /TEMPLATE_MATCH_BLOCKS/g, value: mapping.matchBlocks },
        { regex: /TEMPLATE_TILES/g, value: mapping.tiles },
        { regex: /TEMPLATE_FACES/g, value: mapping.faces },
      ],
    })),
  },

  Fusion: {
    LOG_VARIANTS: buildFusion({
      baseFile: "variants.png.mcmeta",
      output: (wood) => `${wood.texturesDir}/${wood.logAsset}.png.mcmeta`,
    }),

    WOOD_VARIANTS: buildFusion({
      baseFile: "variants.png.mcmeta",
      output: (wood) => `${wood.texturesDir}/${wood.woodAsset}.png.mcmeta`,
    }),

    TOP: buildFusion({
      baseFile: "top.png.mcmeta",
      output: (wood) => `${wood.texturesDir}/${wood.logAsset}_top.png.mcmeta`,
      replacer: (w) => w.logBlock,
    }),
  },
};
