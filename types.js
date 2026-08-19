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
 * @typedef {ReturnType<BaseWoodAssets["barkVariants"]>} VariantMapping
 *
 * @typedef {ReturnType<BaseWoodAssets["resId"]>} ModelId
 *
 * @typedef {{ [Key in keyof LogFaceMapping]: ModelId } & {
 *   VARIANTS: ModelId[];
 * }} WoodResIdMapping
 *
 *
 * @typedef {Omit<WoodResIdMapping, "BARK" | "CORE" | "TOP" | "VARIANTS">} EdgeResIdMapping
 *
 *
 * @typedef {keyof EdgeResIdMapping} EdgeSide
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
 *   defProvider: (
 *     arg1: T,
 *     model: LogFaceMapping[keyof LogFaceMapping],
 *   ) => TemplateDef<U>,
 * ) => PropTemplate<U>} LogModelTemplateProvider
 */

/**
 * @template T, U
 * @typedef {(
 *   defProvider: (arg1: T, model: VariantMapping[number]) => TemplateDef<U>,
 * ) => PropTemplate<U>} BarkModelTemplateProvider
 */

/**
 * @typedef {{
 *   baseFile: string;
 *   output: string;
 *   replacer: ReplaceTarget;
 *   postProcess?: (content: string) => string;
 * }} EdgeTemplateDef
 *
 *
 * @typedef {{ defineAll: () => void }} EdgePropTemplate
 *
 * @typedef {(
 *   defProvider: (side: EdgeSide, model: string) => EdgeTemplateDef,
 * ) => EdgePropTemplate} EdgeModelTemplateProvider
 */

/**
 * @typedef {{
 *   fileName: string;
 *   properties: Object[];
 *   matchBlocks: string;
 *   tiles: string;
 *   faces: string;
 * }} MappingCTM
 *
 *
 * @typedef {(wood: MappingCTM) => ReplaceTarget} MappingMultiPredicate
 *
 * @typedef {{ defineAll: (woodAssets: WoodAssetsCTM[]) => void }} EdgeCTMPropTemplate
 *
 *
 * @typedef {(
 *   defProvider: (mapping: MappingCTM) => EdgeTemplateDef,
 * ) => EdgeCTMPropTemplate} EdgeCTMTemplateProvider
 */

/**
 * @typedef {{
 *   packName: string;
 *   include: string[];
 *   exclude?: string[];
 *   mcMeta?: string;
 * }} ZipInfo
 */
