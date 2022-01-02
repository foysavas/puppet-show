import https from 'https';
import fs from 'fs';
import app from "../../app";

export default async function () {
  console.log("Running on %s", process.env.APP_DOMAIN_api_base_url);
  const server = process.env.APP_HTTPS
    ? https.createServer(
        {
          key: fs.readFileSync(
            `${__dirname}/../../../../tmp/dev.key`
          ),
          cert: fs.readFileSync(
            `${__dirname}/../../../../tmp/dev.crt`
          ),
          requestCert: false,
          rejectUnauthorized: false,
        },
        app
      )
    : app;
  const listener = server.listen(process.env.PORT || process.env.APP_PORT);
  await {
    then(r, f) {
      listener.on("listening", r);
      listener.on("error", f);
    },
  };
}
