import {
  CookieInstrument,
  JavascriptInstrument,
  HttpInstrument,
} from "openwpm-webext-instrumentation";

import * as loggingDB from "./loggingdb.js";

async function foo() {
  // Read the browser configuration from file
  let filename = "browser_params.json";
  let config = await browser.profileDirIO.readFile(filename);
  if (config) {
    config = JSON.parse(config);
    console.log("Browser Config:", config);
  } else {
    console.log("WARNING: config not found. Assuming this is a test run of",
                "the extension. Outputting all queries to console.");
    config = {
      aggregator_address:null,
      logger_address:null,
      cookie_instrument:true,
      js_instrument:true,
      http_instrument:true,
      save_javascript:true,
      save_all_content:true,
      testing:true,
      crawl_id:''
    };
  }

  loggingDB.open(config['aggregator_address'],
                 config['logger_address'],
                 config['crawl_id']);

  if (config['cookie_instrument']) {
    loggingDB.logDebug("Cookie instrumentation enabled");
    let cookieInstrument = new CookieInstrument(loggingDB);
    cookieInstrument.run(config['crawl_id']);
  }

  if (config['js_instrument']) {
    loggingDB.logDebug("Javascript instrumentation enabled");
    let jsInstrument = new JavascriptInstrument(loggingDB);
    jsInstrument.run(config['crawl_id'], config['testing']);
  }

  if (config['http_instrument']) {
    loggingDB.logDebug("HTTP Instrumentation enabled");
    let httpInstrument = new HttpInstrument(loggingDB);
    httpInstrument.run(config['crawl_id'], config['save_javascript'],
                       config['save_all_content']);
  }
}

foo();
