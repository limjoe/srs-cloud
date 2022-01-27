'use strict';

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
['.', '..', '../..', '../mgmt', '../../mgmt'].map(envDir => {
  if (fs.existsSync(path.join(envDir, '.env'))) {
    dotenv.config({path: path.join(envDir, '.env')});
  }
});

const Koa = require('koa');
const Router = require('koa-router');
const Cors = require('koa2-cors');
const BodyParser = require('koa-bodyparser');
const hooks = require('./hooks');

const app = new Koa();

app.use(Cors());
app.use(BodyParser());

const router = new Router();
hooks.handle(router);
app.use(router.routes());

app.listen(2021, () => {
  console.log(`Server start on http://localhost:2021`);
});

