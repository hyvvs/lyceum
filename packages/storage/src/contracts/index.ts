import { describe } from "vitest";
import { contentProjectionContract } from "./content-projections.contract";
import { eventContract } from "./events.contract";
import type { StorageFactory } from "./fixtures";
import { serializationContract } from "./serialization.contract";
import { transactionContract } from "./transactions.contract";

/** Factory-driven public Storage contract, shared unchanged with later SQLite adapters. */
export function describeStorageContract(label: string, factory: StorageFactory): void {
  describe(`Storage contract: ${label}`, () => {
    eventContract(factory);
    contentProjectionContract(factory);
    transactionContract(factory);
    serializationContract(factory);
  });
}
