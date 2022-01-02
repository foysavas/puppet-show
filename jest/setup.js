// require('leaked-handles').set({
//   fullStack: true, // use full stack traces
//   timeout: 5000, // run every 30 seconds instead of 5.
//   debugSockets: true // pretty print tcp thrown exceptions.
// });

import jestRuntime from "jest-runtime";
import dbDropMigrate from ":/actions/db/drop_migrate";

// disable jests module registry
// https://github.com/facebook/jest/blob/e998c9230cb78b3befe0b1b57b36fd5353e766f0/packages/jest-runtime/src/index.js#L452
// jestRuntime.prototype.requireModuleOrMock = function (from, moduleName) {
  // console.log({from, moduleName});
  // delete require.cache[require.resolve()];
  // return require(tmpl)(req, res);
  // return require(this._resolveModule(from, moduleName));
// };

export default async function () {
  return dbDropMigrate();
}
