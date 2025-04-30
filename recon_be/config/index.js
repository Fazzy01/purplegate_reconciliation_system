require('dotenv').config()

const ENV = process.env.NODE_ENV || 'dev'
const fs = require('fs')
const path = require('path')
const dbConfig = loadConfig('DATABASE_URL', 'db')
const cacheConfig = loadConfig('CACHE_URL', 'cache')
const appConfig = require('./app')
const envConfig = require(path.join(__dirname, 'environments', ENV))
const   config = Object.assign({
  [ENV]: true,
  env: ENV,
  cache: cacheConfig,
  app: appConfig,
}, envConfig)

function loadConfig (url, file) {
  if (fs.existsSync(path.join(__dirname, `./${file}.js`))) {
    return require(`./${file}`)[ENV]
  }

  return process.env[url]
}

module.exports = config;