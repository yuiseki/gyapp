#!/usr/bin/env node
var os = require('os');
var path = require('path');
var fs = require('fs');

var yargs = require("yargs");
var puppeteer = require("puppeteer");

const { GyappUtils } = require('../lib/utils');

const argv = yargs
  .option('res', {
    alias: 'r',
    description: 'Browser Resolution. [SD, HD, FHD, 2K, 4K]',
    type: 'string',
    default: 'HD'
  })
  .option('width', {
    alias: 'w',
    description: 'Browser Width. It override resolution option.',
    type: 'number'
  })
  .option('height', {
    alias: 'h',
    description: 'Browser Height. It override resolution option.',
    type: 'number'
  })
  .option('xpath', {
    alias: 'x',
    description: 'XPath for elements to screenshot and upload.',
    type: 'string'
  })
  .option('number', {
    alias: 'n',
    description: 'Number of element to screenshot and upload if XPath matched multiple elements. 0 means to screenshot and upload all mathed elements.',
    type: 'number'
  })
  .option('click', {
    alias: 'c',
    description: 'XPath for elements to click before screenshot',
    type: 'string'
  })
  .option('scroll', {
    alias: 's',
    description: 'Scroll pages before screenshot. 0 means to scroll the limit of web page.',
    type: 'number'
  })
  .option('cookie', {
    description: 'cookie file path to set puppeteer.',
    type: 'string'
  })
  .help()
  .argv;

// check first arg is URL
const url = argv._[0];
if(!url || url===""){
  console.log("Usage:");
  console.log("\tgyapp [URL] {options}");
  console.log("\tgyapp --help");
  process.exit(1);
}
if(url.indexOf('http') !== 0){
  console.log('first arg is not URL!');
  process.exit(1);
}

const res = {
  'SD':{width:720, height:480},
  'HD':{width:1280, height:720},
  'FHD':{width:1920, height:1080},
  '2K':{width:2560, height:1440},
  '4K':{width:4096, height:2160}
};

const main = async () => {

  console.log('capture start: '+url)
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // set browser resolution
    const browserRes = res[argv.res];
    if(argv.width){
      browserRes.width = argv.width;
    }
    if(argv.height){
      browserRes.height = argv.height;
    }
    console.log('resolution: '+JSON.stringify(browserRes));
    page.setViewport(browserRes);

    // set cookie
    if(argv.cookie){
      let cookieJSON = fs.readFileSync(argv.cookie);
      let cookie = JSON.parse(cookieJSON);
      page.setCookie(...cookie)
    }

    await page.goto(url, {waitUntil: ['load', 'networkidle2'], timeout: 0});

    // get title
    const pageTitle = await page.title();

    if(argv.click){
      // click by xpath
      try{
        console.log('click by xpath: '+argv.click);
        await page.waitForXPath(argv.click, {timeout:5000})
        const clickElements = await page.$x(argv.click)
        await GyappUtils.clickAllElements(clickElements, 0)
      }catch{}
    }

    if(argv.scroll !== undefined){
      console.log('scroll: '+argv.scroll);
      if(argv.scroll===0){
        await GyappUtils.scrollToLimit(page)
      }else{
        await GyappUtils.scrollTo(page, argv.scroll)
      }
    }

    const utils = new GyappUtils({
      url: url,
      title: pageTitle,
      xpath: argv.xpath
    })
    if(argv.xpath){
      // screenshot by xpath
      try {
        console.log('screenshot by xpath: '+argv.xpath)
        await page.waitForXPath(argv.xpath, {timeout:5000})
        const elements = await page.$x(argv.xpath);
        if(argv.number === undefined){
          argv.number = 1
        }
        if(argv.number === 0){
          // screenshot all matched elements
          await utils.uploadAllElements(elements, 0);
        }else{
          // screenshot one element
          const filepath = utils.getTmpFilePath(argv.number)
          await elements[argv.number-1].screenshot({ path: filepath })
          await utils.uploadWithMetadata(filepath)
        }
      } catch (err) {
        console.error('Element not found by xpath: '+argv.xpath);
        console.error(err);
        process.exit(1)
      }
    }else{
      // screenshot page
      const filepath = utils.getTmpFilePath();
      await page.screenshot({ path: filepath });
      await utils.uploadWithMetadata(filepath)
    }
    await browser.close();
  } catch (err) {
    console.error(err)
  }
}





(async () => {
  try {
    await main()
  } catch (err) {
    console.error(err);
  }
})()