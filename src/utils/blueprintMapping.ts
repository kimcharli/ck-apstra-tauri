/**
 * Shared blueprint mapping for the application
 */

export interface Blueprint {
  label: string;
  id: string;
}

export const blueprints: Blueprint[] = [
  { label: 'DH50-Colo1', id: '32f27ec4-c6bf-4f2e-a00a-8cd7f674f369' },
  { label: 'DH2-Colo2', id: '9818f405-40e8-4b7d-92eb-527a4f7d6246' },
  { label: 'DH15-Colo1', id: '7f468d2b-94f2-4efa-a2fd-68653db7fa89' },
  { label: 'DH4-Colo2', id: '9059ee6c-5ac2-4fee-bd65-83d429ccf850' }
];

/**
 * Get blueprint ID by label name
 */
export const getBlueprintIdByLabel = (label: string): string | null => {
  const blueprint = blueprints.find(bp => bp.label === label);
  return blueprint ? blueprint.id : null;
};

/**
 * Get blueprint label by ID
 */
export const getBlueprintLabelById = (id: string): string | null => {
  const blueprint = blueprints.find(bp => bp.id === id);
  return blueprint ? blueprint.label : null;
};

/**
 * Get blueprint object by label
 */
export const getBlueprintByLabel = (label: string): Blueprint | null => {
  return blueprints.find(bp => bp.label === label) || null;
};

/**
 * Get blueprint object by ID
 */
export const getBlueprintById = (id: string): Blueprint | null => {
  return blueprints.find(bp => bp.id === id) || null;
};