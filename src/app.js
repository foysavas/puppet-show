import express from "express";
import compression from "compression";
import cors from "cors";
import pinoLogger from "express-pino-logger";
import render from "./actions/render/index";
import parseurl from "parseurl";
import path from "path";

export const createBaseApp = function () {
  const app = express();

  const pinoConfig =
    process.env.APP_ENV !== "production"
      ? {
          prettyPrint: {
            colorize: true,
            hideObject: true,
            singleLine: true,
            messageFormat: "{req.method} {req.url}\n",
          },
        }
      : {};

  if (!process.env.APP_TEST) {
    app.use(pinoLogger(pinoConfig));
  }
  app.use(compression({ filter: () => true }));

  // TODO filter by APP_CORS_ALLOWED_DOMAINS
  app.use(
    cors({
      credentials: true,
      // optionsSuccessStatus: 204,
      // methods: ["GET", "PUT", "POST", "DELETE"],
      origin: function (origin, cb) {
        cb(null, true);
        return true;
      },
    })
  );
  return app;
};

export const createApp = function () {
  const app = createBaseApp();
  app.get("/favicon.ico", (req, res) => res.status(204));
  app.get("*", async function (req, res) {
    const parsedUrl = parseurl(req);
    const r = await render({
      pathname: parsedUrl.pathname,
      query: parsedUrl.query,
    });
    if (r) {
      if (r.redirect) {
        return res.redirect(r.redirect);
      } 
      res.contentType("image/png");
      if (r.img) {
        res.send(r.img);
      } else if (r.file) {
        res.sendFile(path.resolve(r.file));
      }
    } else {
      if (process.env.APP_REDIRECT_MISSING_TO) {
        res.redirect(process.env.APP_REDIRECT_MISSING_TO);
      } else {
        res.sendStatus(404);
      }
    }
  });
  return app;
};

export default createApp();
