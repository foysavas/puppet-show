import qs from "qs";
import _ from "lodash";
import puppeteer from "puppeteer";
import sha256 from "crypto-js/sha256";
import fs from "fs-extra";

const BASE_URL = process.env.APP_BASE_URL;
const LOG_BROWSER_CONSOLE = process.env.APP_LOG_BROWSER_CONSOLE;

const WAIT_FOR_TIME = process.env.APP_WAIT_FOR_TIME;
const WAIT_FOR_SELECTOR = process.env.APP_WAIT_FOR_SELECTOR;
const WAIT_FOR_SELECTOR_MISSING = process.env.APP_WAIT_FOR_SELECTOR_MISSING;
const CLIP_SELECTOR = process.env.APP_CLIP_SELECTOR;
const USE_FILE_CACHE = process.env.APP_USE_FILE_CACHE;
const FILE_CACHE_TTL = process.env.APP_FILE_CACHE_TTL;
const TMP_DIR = process.env.APP_TMP_DIR;
const REDIRECT_WITHOUT_SELECTOR = process.env.APP_REDIRECT_WITHOUT_SELECTOR;

function parseParams({ pathname, query }) {
  const queryParamsMixed = qs.parse(query);
  const queryParams = _.pickBy(queryParamsMixed, function (value, key) {
    return !_.startsWith(key, "PUPPET_SHOW_");
  });
  const puppetShowParams = _.pickBy(queryParamsMixed, function (value, key) {
    return _.startsWith(key, "PUPPET_SHOW_");
  });
  const url = `${BASE_URL}${pathname}${
    queryParams && Object.keys(queryParams).length
      ? `?${qs.stringify(queryParams)}`
      : ""
  }`;
  return { queryParams, puppetShowParams, url };
}

async function getPngWithPuppet({ url, puppetShowParams }) {
  if (USE_FILE_CACHE) {
    const hash = sha256(url + JSON.stringify(puppetShowParams));
    const fp = `${TMP_DIR}/${hash}.png`;
    if (fs.existsSync(fp)) {
      const stats = fs.statSync(fp);
      if (
        stats.birthtime <
        new Date(new Date() - 1000 * 60 * (FILE_CACHE_TTL || 0))
      ) {
        // noop
      } else {
        return { file: fp };
      }
    }
  }
  const puppeteerOpts = {
    headless: !process.env.APP_RENDER_WITH_HEAD || false,
    devtools: process.env.APP_RENDER_WITH_HEAD || false,
    // defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-web-security",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    timeout: process.env.APP_RENDER_TIMEOUT,
  };
  const browser = await puppeteer.launch(puppeteerOpts);
  const page = await browser.newPage();
  if (LOG_BROWSER_CONSOLE) {
    page.on("console", (msg) => {
      for (let i = 0; i < msg.args().length; ++i)
        console.log(`PUPPETEER: ${msg.args()[i]}`);
    });
  }
  let clip = null;
  const waitForTime =
    puppetShowParams.PUPPET_SHOW_WAIT_FOR_TIME ?? WAIT_FOR_TIME;
  const waitForSelector =
    puppetShowParams.PUPPET_SHOW_WAIT_FOR_SELECTOR ?? WAIT_FOR_SELECTOR;
  const waitForSelectorMissing =
    puppetShowParams.PUPPET_SHOW_WAIT_FOR_SELECTOR_MISSING ??
    WAIT_FOR_SELECTOR_MISSING;
  const clipSelector =
    puppetShowParams.PUPPET_SHOW_CLIP_SELECTOR ?? CLIP_SELECTOR;
  const redirectWithoutSelector = REDIRECT_WITHOUT_SELECTOR;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.evaluateHandle("document.fonts.ready");
    if (waitForTime) {
      await new Promise((resolve) => setTimeout(resolve, waitForTime));
    }
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector);
    }
    if (waitForSelectorMissing) {
      await page.waitForFunction(
        (selector) => {
          return !document.querySelector(selector);
        },
        {
          pooling: "raf",
        },
        waitForSelectorMissing
      );
    }
    if (redirectWithoutSelector) {
      const found = await page.evaluate((selector) => {
        return !!document.querySelector(selector);
      }, redirectWithoutSelector);
      if (!found) {
        return { redirect: url };
      }
    }
    if (clipSelector) {
      clip = await page.evaluate((selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        if (rect) {
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        } else {
          return null;
        }
      }, clipSelector);
    }
  } catch (err) {
    console.error(err);
    throw new Error("page.goto/waitFor/clip timed out.");
  }
  const img = await page.screenshot({
    type: "png",
    fullPage: false,
    omitBackground: true,
    clip,
  });
  await browser.close();

  if (USE_FILE_CACHE) {
    fs.ensureDir(TMP_DIR);
    const hash = sha256(url + JSON.stringify(puppetShowParams));
    const fp = `${TMP_DIR}/${hash}.png`;
    fs.writeFileSync(fp, img);
  }

  return { img };
}

export default async function render({ pathname, query }) {
  const { url, puppetShowParams } = parseParams({
    pathname,
    query,
  });

  return getPngWithPuppet({ url, puppetShowParams });
}
