#!/usr/bin/env node
var os = require("os");
var path = require("path");
var fs = require("fs");

const yargs = require("yargs");
const puppeteer = require('puppeteer');
const fetch = require("node-fetch");

const { GyappInstagram } = require('../lib/instagram');
const { GyappUtils } = require('../lib/utils');
const { resolve } = require("path");

const argv = yargs
  .command('user [username]', 'Gyazo all images of specific instagram user.', (yargs) => {
    return yargs.positional('username', {
      describe: 'Instagram username.',
      require: true
    })
  })
  .option('limit', {
    alias: 'l',
    description: 'Load limit of images. 0 means no limit.',
    type: 'number',
    default: 0
  })
  .option('cookie', {
    description: 'cookie file path to set puppeteer.',
    type: 'string'
  })
  .help()
  .argv;

const arg = argv._[0];
if(!arg || arg===""){
  console.log("Usage:");
  console.log("\tgyapp-twitter --help");
  process.exit(1);
}


const main = async () => {
  const browser = await puppeteer.launch();
  const [page] = await browser.pages();

  // set cookie
  if(argv.cookie){
    let cookieJSON = fs.readFileSync(argv.cookie);
    let cookie = JSON.parse(cookieJSON);
    page.setCookie(...cookie)
  }

  const instagram = new GyappInstagram({
    browser: browser,
    userName: argv.username
  });

  const url = `https://www.instagram.com/${argv.username}`;
  await page.goto(url, {waitUntil: ['load', 'networkidle2']});
  await GyappUtils.scrollToLimit(page, (p)=>{
    new Promise(async (resolve, reject) => {
      await instagram.getAllPostsURL(p);
      resolve(true)
    })
  });
  await instagram.uploadAllPosts(0);
  await browser.close();
}

(async () => {
  try {
    await main()
  } catch (err) {
    console.error(err);
  }
})()
