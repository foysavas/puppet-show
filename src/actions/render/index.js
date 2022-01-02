import qs from "qs";
import _ from "lodash";
import puppeteer from "puppeteer";
import sha256 from "crypto-js/sha256";
import fs from "fs-extra";
import checkDiskSpace from "check-disk-space";

const BASE_URL = "http://localhost:3000";
const LOG_BROWSER_LOGS = false;

const WAIT_FOR_TIME = 500;
const WAIT_FOR_SELECTOR = null;
const WAIT_FOR_SELECTOR_MISSING = null;
const CLIP_SELECTOR = null;
const USE_FILE_CACHE = true;
const FILE_CACHE_TTL = 0;
const TMP_DIR = "./tmp";

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

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  if (LOG_BROWSER_LOGS) {
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
  console.log({ puppetShowParams });

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
    if (clipSelector) {
      clip = await page.evaluate((selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
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
