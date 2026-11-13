// lib/collection-owners.ts
export const COLLECTION_OWNERS: Record<string, string[]> = {
  celestial: ["164429062238896129"],
  darcie:    ["665898420447215647"],
  tobi:      ["285239143041073155"],
  madolche:  ["138458918316802058"],
  lunalux:   ["142200534781132800"],
};

export type AccountRoles = {
  commissioner: boolean;
  darsubscribbler: boolean;
};

/**
 * Whether the given user is one of the designated owners of this collection,
 * regardless of darsubscriber status. Useful for showing "you'd be able to
 * edit this if you were a Darsubscriber" states.
 */
export function isCollectionOwner(
  userId: string | null | undefined,
  collection: string
): boolean {
  if (!userId) return false;
  const owners = COLLECTION_OWNERS[collection];
  if (!owners) return false;
  return owners.includes(userId);
}

export function canEditCollectionOrder(
  userId: string | null | undefined,
  collection: string,
  roles: AccountRoles | null | undefined
): boolean {
  if (!userId) return false;
  if (!roles || !roles.darsubscribbler) return false;
  return isCollectionOwner(userId, collection);
}