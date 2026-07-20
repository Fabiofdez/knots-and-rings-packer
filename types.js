/**
 * @typedef {import("@util/Wood")["Wood"]} _utils_Wood
 *
 * @typedef {`${string}:${string}`} WoodType
 *
 * @typedef {import("@util/Wood").BaseWoodAssets} BaseWoodAssets
 *
 * @typedef {ReturnType<_utils_Wood["assetsCTM"]>} WoodAssetsCTM
 *
 * @typedef {ReturnType<_utils_Wood["assetsFusion"]>} WoodAssetsFusion
 */

/**
 * @typedef {ReturnType<BaseWoodAssets["logFaces"]>} LogFaceMapping
 *
 * @typedef {ReturnType<BaseWoodAssets["resId"]>} ModelId
 *
 * @typedef {keyof LogFaceMapping} LogFace
 *
 * @typedef {{ [k in LogFace]: ModelId }} ResIdMapping
 */

/**
 * @typedef {{ regex: RegExp; value: string }} Replacement
 *
 * @typedef {string | Replacement | Replacement[]} ReplaceTarget
 */

/**
 * @template T
 * @typedef {(wood: T) => string} WoodPredicate
 */

/**
 * @template T
 * @typedef {(wood: T) => ReplaceTarget} WoodMultiPredicate
 */

/**
 * @template T
 * @typedef {{
 *   baseFile: string;
 *   output: string | WoodPredicate<T>;
 *   replacer: ReplaceTarget | WoodMultiPredicate<T>;
 *   postProcess?: (content: string) => string;
 * }} TemplateDef
 */

/**
 * @template T
 * @typedef {{ defineFor: (wood: T) => void }} PropTemplate
 */

/**
 * @template T
 * @typedef {(def: TemplateDef<T>) => PropTemplate<T>} TemplateProvider
 */

/**
 * @template T, U
 * @typedef {(
 *   defProvider: (arg1: U, model: LogFaceMapping[LogFace]) => TemplateDef<T>,
 * ) => PropTemplate<T>} TemplateMultiProvider
 */
