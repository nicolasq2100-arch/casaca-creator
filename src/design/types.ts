// DesignState: el diseño completo como JSON. Es lo único que se guarda (borrador local y, más adelante, la base).
// Las etapas siguientes suman patrón, capas y nombre/número.

export const DESIGN_VERSION = 1 as const;

export interface DesignState {
  version: typeof DESIGN_VERSION;
  garmentId: string;
  /** Color por zona (id de zona de garment.config → HEX "#RRGGBB"). */
  colors: Record<string, string>;
}
