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

function releaseOneSelectBackgroundInert(
  element: HTMLElement,
  heldByThisSelect: Set<HTMLElement>,
): void {
  if (!heldByThisSelect.delete(element)) return;
  const owners = backgroundOwners.get(element);
  if (!owners) return;
  owners.count--;
  if (owners.count === 0) {
    element.inert = owners.originallyInert;
    backgroundOwners.delete(element);
  }
}

/** Match only the nodes *currently* hidden by Radix, including on marker removal. */
export function reconcileSelectBackgroundInert(
  currentlyHidden: Iterable<HTMLElement>,
  heldByThisSelect: Set<HTMLElement>,
): void {
  const hidden = new Set(currentlyHidden);
  for (const element of hidden) acquireSelectBackgroundInert(element, heldByThisSelect);
  for (const element of [...heldByThisSelect]) {
    if (!hidden.has(element)) releaseOneSelectBackgroundInert(element, heldByThisSelect);
  }
}

export function releaseSelectBackgroundInert(heldByThisSelect: Set<HTMLElement>): void {
  for (const element of [...heldByThisSelect]) {
    releaseOneSelectBackgroundInert(element, heldByThisSelect);
  }
}
