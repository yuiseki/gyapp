#!/usr/bin/env node
var os = require("os");
var path = require("path");
var fs = require("fs");

const yargs = require("yargs");
const puppeteer = require('puppeteer');
const fetch = require("node-fetch");

const { GyappInstagram } = require('../lib/instagram');
const { GyappUtils } = require('../lib/utils');

const argv = yargs
  .command('user [username]', 'Gyazo all images of specific instagram user.', (yargs) => {
    return yargs.positional('username', {
      describe: 'Instagram username.',
      require: true
    })
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

  const instagram = new GyappInstagram({
    browser: browser,
    userName: argv.username
  });

  const url = `https://www.instagram.com/${argv.username}`;
  await page.goto(url, {waitUntil: ['load', 'networkidle2']});
  await GyappUtils.scrollToLimit(page);
  await instagram.getAllPostsURL(page);
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
