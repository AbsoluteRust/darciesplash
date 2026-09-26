export const COLLECTION_OWNERS: Record<string, string[]> = {
  celestial: ["164429062238896129"],
  darcie:    ["665898420447215647"],
  tobi:      ["285239143041073155"],
  madolche:  ["138458918316802058"],
};

export type AccountRoles = {
  commissioner: boolean;
  darsubscribbler: boolean;
};

export function canEditCollectionOrder(
  userId: string | null | undefined,
  collection: string,
  roles: AccountRoles | null | undefined
): boolean {
  if (!userId) return false;
  if (!roles || !roles.darsubscribbler) return false;
  const owners = COLLECTION_OWNERS[collection];
  if (!owners) return false;
  return owners.includes(userId);
}