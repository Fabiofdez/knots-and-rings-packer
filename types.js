/**
 * @typedef {{
 *   name: string;
 *   optional?: boolean;
 *   values?: string[];
 *   default: string;
 * }} Arg
 */

/**
 * @typedef {`${string}:${string}`} Identifier
 *
 * @typedef {import("@util/Wood").WoodDef} WoodDef
 */

/**
 * @typedef {(typeof import("@const/LogSides"))["MODELLED_SIDES"]} ModelledSides
 *
 *
 * @typedef {ModelledSides[number]} ModelledSide
 *
 * @typedef {ReturnType<WoodDef["logFaces"]>} LogFaceMapping
 *
 * @typedef {ReturnType<WoodDef["barkVariants"]>} VariantMapping
 *
 * @typedef {ReturnType<WoodDef["resId"]>} ModelId
 *
 * @typedef {{ [Key in keyof LogFaceMapping]: ModelId } & {
 *   VARIANTS: ModelId[];
 * }} WoodResIdMapping
 *
 *
 * @typedef {Omit<WoodResIdMapping, "CORE" | "TOP" | "VARIANTS">} EdgeResIdMapping
 */

/**
 * @typedef {{ regex: RegExp; value: string }} Replacement
 *
 * @typedef {string | Replacement | Replacement[]} ReplaceTarget
 */

/**
 * @typedef {(wood: WoodDef) => string} WoodPredicate
 *
 * @typedef {(wood: WoodDef) => ReplaceTarget} WoodMultiPredicate
 */

/**
 * @typedef {{
 *   baseFile: string;
 *   output: string | WoodPredicate;
 *   replacer: ReplaceTarget | WoodMultiPredicate;
 *   postProcess?: (content: string) => string;
 * }} TemplateDef
 *
 *
 * @typedef {{ defineFor: (wood: WoodDef) => void }} PropTemplate
 *
 * @typedef {(def: TemplateDef) => PropTemplate} TemplateProvider
 */

/**
 * @typedef {(
 *   defProvider: (side: ModelledSide, model: string) => TemplateDef,
 * ) => PropTemplate} LogModelTemplateProvider
 */

/**
 * @typedef {[template: string, output: string, idx: number]} ResolvedModel
 *
 * @typedef {(
 *   templates: ResolvedModel[],
 *   defProvider: (
 *     template: string,
 *     model: string,
 *     combo: string[],
 *   ) => TemplateDef,
 * ) => PropTemplate} SaplingModelTemplateProvider
 */
