import assert from "node:assert/strict";

import {
  getPrismaDelegate,
  getMissingPrismaDelegates,
  hasRequiredPrismaDelegates,
} from "../lib/prisma-client-guards";

const completeClient = {
  quickTripEntrySession: { create() {}, findMany() {} },
  quickTripEntryItem: { create() {}, findMany() {} },
};

const staleClient = {
  quickTripEntryItem: { create() {}, findMany() {} },
};

assert.equal(hasRequiredPrismaDelegates(completeClient), true);
assert.equal(hasRequiredPrismaDelegates(staleClient), false);
assert.deepEqual(getMissingPrismaDelegates(staleClient), [
  "quickTripEntrySession",
]);
assert.equal(
  getPrismaDelegate(staleClient, completeClient, "quickTripEntrySession"),
  completeClient.quickTripEntrySession,
);
assert.throws(
  () => getPrismaDelegate(staleClient, staleClient, "quickTripEntrySession"),
  /Prisma delegate quickTripEntrySession is not available/,
);

console.log("prisma client guard checks passed");
