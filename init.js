// require("esm-wallaby");
require("module-alias/register");
require("core-js/stable");

const fs = require("fs");

const dotenv = require("dotenv");
const env =
  process.env.APP_ENV || (process.env.APP_TEST ? "test" : "development");
dotenv.config({ path: `${__dirname}/config/${env}.env` });
if (fs.existsSync(`${__dirname}/config/.env`)) {
  const envConfig = dotenv.parse(fs.readFileSync(`${__dirname}/config/.env`));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}
