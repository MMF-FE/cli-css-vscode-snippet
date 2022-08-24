#!/usr/bin/env node

const { snippet } = require('../dist/index.js')
const yargs = require('yargs')
const pkg = require('../package.json')

yargs.command(snippet).version(pkg.version).alias('version', 'v').help().argv
