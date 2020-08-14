#!/usr/bin/env node
var pipe = require('../lib/pipe-args').load();
var yargs = require("yargs").argv;

const stdin = yargs._[0]

const images = stdin.split('\n')
images.map((i) => {
  console.log("upload: "+i)
})