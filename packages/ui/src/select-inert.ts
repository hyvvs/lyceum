/**
 * Private ownership registry for Radix Select's aria-hidden background.
 * Concurrent overlays must never release another overlay's inert lock.
 * This module is not part of the public @lyceum/ui surface.
 */
const backgroundOwners = new Map<HTMLElement, { count: number; originallyInert: boolean }>();

export function acquireSelectBackgroundInert(
  element: HTMLElement,
  heldByThisSelect: Set<HTMLElement>,
): void {
  if (heldByThisSelect.has(element)) return;
  heldByThisSelect.add(element);
  const owners = backgroundOwners.get(element);
  if (owners) {
    owners.count++;
    return;
  }
  backgroundOwners.set(element, { count: 1, originallyInert: element.inert });
  element.inert = true;
}

export function releaseSelectBackgroundInert(heldByThisSelect: Set<HTMLElement>): void {
  for (const element of heldByThisSelect) {
    const owners = backgroundOwners.get(element);
    if (!owners) continue;
    owners.count--;
    if (owners.count === 0) {
      element.inert = owners.originallyInert;
      backgroundOwners.delete(element);
    }
  }
  heldByThisSelect.clear();
}
