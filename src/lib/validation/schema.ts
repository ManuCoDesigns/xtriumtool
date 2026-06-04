// Embedded JSON schemas (mirrors backend/schemas/*.json).
// Two datasets are supported: BGS Supplier Graph and NASA TPSX Materials.

export const bgsSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "bgs_supplier_graph_v1",
  title: "BGS Directory of Mines and Quarries — Supplier Graph",
  type: "object",
  required: [
    "company_name",
    "canonical_name",
    "supply_chain_tier",
    "manufacturing_sites",
    "products_offered",
    "sources",
  ],
  properties: {
    supplier_id: { type: ["string", "null"] },
    duns_number: { type: ["string", "null"] },
    company_name: { type: "string", minLength: 1 },
    canonical_name: { type: "string", minLength: 1, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
    headquarters_location: { type: ["string", "null"] },
    website: { type: ["string", "null"], format: "uri" },
    company_description: { type: ["string", "null"] },
    industry_sector: { type: ["string", "null"] },
    supply_chain_tier: { type: "integer", enum: [1, 2, 3] },
    typical_lead_time_days: { type: ["integer", "null"], minimum: 0 },
    manufacturing_sites: {
      type: "array",
      items: {
        type: "object",
        required: ["location", "country", "raw"],
        properties: {
          location: { type: "string", minLength: 1 },
          country: {
            type: "string",
            enum: ["England", "Scotland", "Wales", "Northern Ireland", "Channel Islands", "Isle of Man"],
          },
          site_type: { type: ["string", "null"] },
          raw: { type: "string", minLength: 1 },
        },
      },
    },
    certification_references: { type: "array", items: { type: "string" } },
    certifications_raw: { type: ["string", "null"] },
    regulation_references: { type: "array", items: { type: "string" } },
    products_offered: {
      type: "array",
      items: {
        type: "object",
        required: ["product_name", "product_id", "category"],
        properties: {
          product_name: { type: "string", minLength: 1 },
          grade: { type: ["string", "null"] },
          product_id: { type: "string", minLength: 1 },
          category: { type: "string", minLength: 1 },
          source_url: { type: ["string", "null"], format: "uri" },
          datasheet_url: { type: ["string", "null"], format: "uri" },
          cross_graph_material_id: { type: ["string", "null"] },
        },
      },
    },
    is_verified: { type: "boolean" },
    data_completeness_flags: {
      type: ["object", "null"],
      additionalProperties: { type: "string" },
    },
    sources: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["source_name", "source_url", "tier"],
        properties: {
          source_name: { type: "string", minLength: 1 },
          source_url: { type: "string", format: "uri" },
          doi: { type: ["string", "null"] },
          tier: { type: "string", enum: ["tier1", "tier2", "tier3"] },
        },
      },
    },
  },
} as const;

export const nasaSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "nasa_tpsx_materials_v1",
  title: "NASA TPSX Materials Graph",
  type: "object",
  required: [
    "material_name",
    "canonical_name",
    "material_type",
    "supplier_context",
    "properties",
    "sources",
  ],
  properties: {
    material_id: { type: ["string", "null"] },
    material_name: { type: "string", minLength: 1 },
    canonical_name: { type: "string", minLength: 1 },
    cas_number: { type: ["string", "null"] },
    uns_number: { type: ["string", "null"] },
    icsd_id: { type: ["string", "null"] },
    inchikey: { type: ["string", "null"] },
    external_id_type: { type: ["string", "null"] },
    chemical_formula: { type: ["string", "null"] },
    material_type: {
      type: "string",
      enum: ["polymer", "metal", "adhesive", "ceramic", "composite", "coating", "foam", "fabric", "other"],
    },
    material_subtype: { type: ["string", "null"] },
    grade: { type: ["string", "null"] },
    trade_names: { type: "array", items: { type: "string" } },
    is_variant: { type: "boolean" },
    base_material_canonical_name: { type: ["string", "null"] },
    supplier_context: {
      type: "object",
      required: ["supplier_canonical_name"],
      properties: {
        supplier_canonical_name: { type: "string", minLength: 1 },
        supplier_product_id: { type: ["string", "null"] },
        supplier_grade_name: { type: ["string", "null"] },
        datasheet_url: { type: ["string", "null"], format: "uri" },
      },
    },
    properties: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["name", "canonical_name", "value", "unit", "property_category", "source"],
        properties: {
          name: { type: "string", minLength: 1 },
          canonical_name: { type: "string", minLength: 1 },
          value: { type: ["string", "number"] },
          numeric_value: { type: ["number", "null"] },
          unit: { type: ["string", "null"] },
          condition: { type: ["string", "null"] },
          property_category: {
            type: "string",
            enum: ["mechanical", "thermal", "physical", "electrical", "optical", "chemical", "processing", "other"],
          },
          raw: { type: ["object", "null"] },
          source: {
            type: "object",
            required: ["source_name", "source_url", "tier"],
            properties: {
              source_name: { type: "string", minLength: 1 },
              source_url: { type: "string", format: "uri" },
              doi: { type: ["string", "null"] },
              tier: { type: "string", enum: ["tier1", "tier2", "tier3"] },
            },
          },
        },
      },
    },
    standards_referenced: { type: "array", items: { type: "string" } },
    compliance_references: { type: "array", items: { type: "string" } },
    applications_mentioned: { type: "array", items: { type: "string" } },
    processing_notes: { type: ["string", "null"] },
    hazard_flags: { type: "array", items: { type: "string" } },
    availability_notes: { type: ["string", "null"] },
    images: { type: "array", items: { type: "string", format: "uri" } },
    sources: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["source_name", "source_url", "tier"],
        properties: {
          source_name: { type: "string", minLength: 1 },
          source_url: { type: "string", format: "uri" },
          doi: { type: ["string", "null"] },
          tier: { type: "string", enum: ["tier1", "tier2", "tier3"] },
          raw: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

export type SchemaId = "bgs_supplier_graph_v1" | "nasa_tpsx_materials_v1";

export const SCHEMA_REGISTRY: Record<SchemaId, { label: string; description: string; schema: unknown }> = {
  bgs_supplier_graph_v1: {
    label: "BGS Supplier Graph",
    description: "BGS Directory of Mines and Quarries — one supplier per record.",
    schema: bgsSchema,
  },
  nasa_tpsx_materials_v1: {
    label: "NASA TPSX Materials",
    description: "NASA TPSX Materials Graph — one material record with properties.",
    schema: nasaSchema,
  },
};

// Back-compat alias (older imports referenced xtriumSchema).
export const xtriumSchema = bgsSchema;