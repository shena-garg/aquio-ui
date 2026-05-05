// Canonical list — must match aquio-backend/src/config/units-of-measurement.json names exactly.
export const UOM_LIST = [
  // Weight
  "Kilogram", "Kilogram (Alt)", "Gram", "Gram (Alt)", "Milligram",
  "Metric Ton", "Ton", "Tonne", "Ounce", "Pound",
  // Length
  "Kilometer", "Meter", "Centimeter", "Millimeter", "Micrometer",
  "Nanometer", "Micron", "Foot", "Yard", "Inch",
  // Area
  "Square Meter", "Square Centimeter", "Square Millimeter", "Square Foot", "Square Inch",
  // Volume
  "Cubic Meter", "Cubic Centimeter", "Cubic Inch", "Cubic Foot", "Cubic Yard",
  "Liter", "Milliliter", "Microliter", "KiloLiter", "Gallon", "Quart", "Fluid Ounce", "Barrel",
  // Count / Pack
  "Piece", "Unit", "Each", "Nos",
  "Pack", "Package", "Box", "Carton", "Case", "Dozen", "Pair", "Pallet", "Set",
  // Container / Industrial
  "Roll", "Bundle", "Bag", "Bottle", "Drum", "Can", "Pouch", "Sachet",
  "Reel", "Reel Meter", "Rim", "Rim Meter", "Rim Foot",
  "Ream", "Sheet", "Stick", "Tube", "Bar", "Tin", "Coil",
  // Misc
  "Lot", "Batch",
] as const;

export type UOM = typeof UOM_LIST[number];

const UOM_MAP: Record<string, string> = {
  "Kilogram": "kg",
  "Kilogram (Alt)": "Kgs",
  "Gram": "g",
  "Gram (Alt)": "Gm",
  "Milligram": "mg",
  "Metric Ton": "MT",
  "Ton": "t",
  "Tonne": "Ton",
  "Tonne (Alt)": "tonne",
  "Ounce": "oz",
  "Pound": "lb",
  "Kilometer": "km",
  "Meter": "m",
  "Centimeter": "cm",
  "Millimeter": "mm",
  "Micrometer": "µm",
  "Nanometer": "nm",
  "Foot": "ft",
  "Yard": "yd",
  "Yard (Alt)": "yd",
  "Inch": "in",
  "Square Meter": "m²",
  "Square Meter (Alt)": "m²",
  "Square Centimeter": "cm²",
  "Square Millimeter": "mm²",
  "Square Foot": "ft²",
  "Square Foot (Alt)": "ft²",
  "Square Inch": "in²",
  "Square Inch (Alt)": "in²",
  "Cubic Meter": "m³",
  "Cubic Meter (Alt)": "m³",
  "Cubic Centimeter": "cm³",
  "Cubic Centimeter (Alt)": "ccm",
  "Cubic Inch": "in³",
  "Cubic Foot": "ft³",
  "Cubic Foot (Alt)": "ft³",
  "Cubic Yard": "yd³",
  "Liter": "l",
  "Milliliter": "ml",
  "MilliLiter": "ml",
  "Microliter": "µl",
  "KiloLiter": "KL",
  "Gallon": "gal",
  "Quart": "qt",
  "Fluid Ounce": "foz",
  "Barrel": "bbl",
  "Barrel (Alt)": "bar",
  "Piece": "pcs",
  "Unit": "unit",
  "Each": "ea",
  "Nos": "nos",
  "Pack": "pk",
  "Package": "Pak",
  "Box": "box",
  "Box (Alt)": "bx",
  "Carton": "ctn",
  "Case": "case",
  "Case (Alt)": "cs",
  "Dozen": "doz",
  "Pair": "prs",
  "Roll": "rol",
  "Bundle": "bdl",
  "Bag": "bag",
  "Pallet": "plt",
  "Set": "set",
  "Bottle": "btl",
  "Drum": "drum",
  "Can": "can",
  "Can (Alt)": "can",
  "Pouch": "pouch",
  "Sachet": "sachet",
  "Reel": "reel",
  "Reel Meter": "rmt",
  "Rim": "rim",
  "Rim Meter": "rmt",
  "Rim Foot": "rft",
  "Ream": "rm",
  "Ream Meter": "rm",
  "Sheet": "sht",
  "Stick": "stk",
  "Stick (Alt)": "st",
  "Tube": "tube",
  "Bar": "bar",
  "Tin": "tin",
  "Coil": "coi",
  "Lot": "lot",
  "Batch": "bch",
  "Paa": "paa",
  "Tro": "tro",
  "Tro Meter": "mtr",
  "Micron": "micron",
  "GigaJoule": "GJ",
  "MegaByte": "MB",
  "Meter Hour": "m/hr",
  "Meter Day": "m/day",
}

export function getUOMAbbreviation(uom: string): string {
  return UOM_MAP[uom] ?? uom
}

export function formatQuantity(value: number | undefined | null, uom: string): { display: string; full: string } {
  const abbr = getUOMAbbreviation(uom)
  if (value === undefined || value === null || isNaN(value)) {
    return { display: `— ${abbr}`, full: `— ${uom}` }
  }
  return {
    display: `${value.toLocaleString('en-IN')} ${abbr}`,
    full: `${value.toLocaleString('en-IN')} ${uom}`
  }
}

