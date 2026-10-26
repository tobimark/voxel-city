// Catalogue-only style variants.
//
// Each entry is keyed by the base asset id and describes the "· 2" edition of
// that object: a different palette / silhouette for the same type. The objects
// here never reach the procedural city — `object-catalog.js` pairs them with
// their base asset for the archive page only.
import { BUILDING_VARIANTS_A } from "./buildings-a.js";
import { BUILDING_VARIANTS_B } from "./buildings-b.js";
import { SKYSCRAPER_VARIANTS, CONSTRUCTION_VARIANTS } from "./towers.js";
import { PARK_VARIANTS, ATTRACTION_VARIANTS, VEHICLE_VARIANTS } from "./leisure.js";
import { STREET_VARIANTS, NATURE_VARIANTS, MARITIME_VARIANTS } from "./streetscape.js";

export const VARIANTS = {
  buildings: { ...BUILDING_VARIANTS_A, ...BUILDING_VARIANTS_B },
  skyscrapers: SKYSCRAPER_VARIANTS,
  construction: CONSTRUCTION_VARIANTS,
  parks: PARK_VARIANTS,
  attractions: ATTRACTION_VARIANTS,
  vehicles: VEHICLE_VARIANTS,
  street: STREET_VARIANTS,
  nature: NATURE_VARIANTS,
  maritime: MARITIME_VARIANTS,
};
