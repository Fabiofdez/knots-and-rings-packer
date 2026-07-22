import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
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

/**
 * @param {TemplateDef<BaseWoodAssets} def
 * @returns {TemplateDef<BaseWoodAssets}
 */
function makeHorizontal(def) {
  let { baseFile } = def;
  const [withoutExt] = baseFile.split(".json");
  baseFile = `${withoutExt}_horizontal.json`;

  return { ...def, baseFile };
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

const LogModelPacker = {
  /** @type {LogModelTemplateProvider<LogFace, BaseWoodAssets>} */
  buildSides: (defProvider) => ({
    defineFor(wood) {
      const { TOP, ...logSides } = wood.logFaces();

      Object.entries(logSides)
        .map(([side, model]) => defProvider(side, model))
        .forEach((def) => build(def).defineFor(wood));

      Object.entries(logSides)
        .map(([side, model]) => defProvider(side, `${model}_horizontal`))
        .forEach((def) => build(makeHorizontal(def)).defineFor(wood));
    },
  }),

  /** @type {LogModelTemplateProvider<Number, BaseWoodAssets>} */
  buildTops: (defProvider) => ({
    defineFor(wood) {
      const model = wood.logFaces().TOP;

      SIDES_TO_TOP.keys()
        .map((idx) => defProvider(idx, model))
        .forEach((def) => build(def).defineFor(wood));
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
        .map(([side, model]) => defProvider(side, `${model}_horizontal`))
        .forEach((def) => build(makeHorizontal(def)).defineFor());
    },
  }),
};

const BarkModelPacker = {
  /** @type {BarkModelTemplateProvider<Number, BaseWoodAssets>} */
  buildVariants: (defProvider) => ({
    defineFor(wood) {
      const variants = wood.barkVariants();
      if (WoodFacts.isStripped(wood)) variants.push(wood.logFaces().BARK);

      variants
        .map((model, idx) => defProvider(idx, model))
        .forEach((def) => build(def).defineFor(wood));

      variants
        .map((model, idx) => defProvider(idx, `${model}_horizontal`))
        .forEach((def) => build(makeHorizontal(def)).defineFor(wood));
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
];

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
const logBlockstateDef = {
  output: (wood) => `${wood.blockstatesDir}/${wood.logAsset}.json`,
  replacer: (wood) => [
    { regex: /TEMPLATE_LOG_DEFAULT/g, value: wood.resId() },
    { regex: /TEMPLATE_LOG_SM/g, value: resIds(wood).SM },
    { regex: /TEMPLATE_LOG_LEFT/g, value: resIds(wood).LEFT },
    { regex: /TEMPLATE_LOG_RIGHT/g, value: resIds(wood).RIGHT },
    { regex: /TEMPLATE_LOG_CORE/g, value: resIds(wood).CORE },
    { regex: /TEMPLATE_LOG_TOP/g, value: resIds(wood).TOP },
    ...modelBarkReplacements(wood),

    { regex: /TEMPLATE_LOG_EDGES_SM/g, value: mcId(logEdges().SM) },
    { regex: /TEMPLATE_LOG_EDGES_LEFT/g, value: mcId(logEdges().LEFT) },
    { regex: /TEMPLATE_LOG_EDGES_RIGHT/g, value: mcId(logEdges().RIGHT) },

    ...modelOrientationReplacements,
  ],
  postProcess: (json) => JSON.stringify(JSON.parse(json)),
};

export const Templates = {
  BLOCKSTATES: {
    LOG: build({
      baseFile: "template_log_blockstates.json",
      ...logBlockstateDef,
    }),

    STRIPPED_LOG: build({
      baseFile: "template_stripped_log_blockstates.json",
      ...logBlockstateDef,
    }),

    WOOD: build({
      baseFile: "template_wood_blockstates.json",
      output: (wood) => `${wood.blockstatesDir}/${wood.woodAsset}.json`,
      replacer: (wood) => [
        ...modelBarkReplacements(wood),
        ...modelOrientationReplacements,
      ],
      postProcess: (json) => JSON.stringify(JSON.parse(json)),
    }),
  },

  MODELS: {
    LOG_SIDES: LogModelPacker.buildSides((side, model) => ({
      baseFile: "template_side_model.json",
      output: (wood) => `${wood.modelsDir}/${model}.json`,
      replacer: (wood) => ({
        regex: /TEMPLATE_TEXTURE/g,
        value: side === "BARK" ? wood.resId() : resIds(wood)[side],
      }),
    })),

    LOG_TOPS: LogModelPacker.buildTops((idx, model) => ({
      baseFile: "template_log_top_model.json",
      output: (wood) => `${wood.modelsDir}/${model}_${idx}.json`,
      replacer: (wood) => ({
        regex: /TEMPLATE_LOG_TEXTURE/g,
        value: `${resIds(wood).TOP}_${idx}`,
      }),
    })),

    DEFAULT_LOG_TOPS: LogModelPacker.buildDefaultTops((_, model) => ({
      baseFile: "template_log_top_model.json",
      output: (wood) => `${wood.modelsDir}/${model}.json`,
      replacer: (wood) => ({
        regex: /TEMPLATE_LOG_TEXTURE/g,
        value: resIds(wood).TOP,
      }),
    })),

    LOG_EDGES: LogModelPacker.buildEdges((side, model) => ({
      baseFile: "template_log_edge_model.json",
      output: `${Ctx.WORK_DIR}/${Dir.models()}/block/${model}.json`,
      replacer: {
        regex: /TEMPLATE_EDGE_TEXTURE/g,
        value: mcId(logEdges()[side]),
      },
    })),

    BARK_VARIANTS: BarkModelPacker.buildVariants((idx, model) => ({
      baseFile: "template_side_model.json",
      output: (wood) => `${wood.modelsDir}/${model}.json`,
      replacer: (wood) => ({
        regex: /TEMPLATE_TEXTURE/g,
        value: idx >= 12 ? wood.resId() : resIds(wood).VARIANTS[idx],
      }),
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
