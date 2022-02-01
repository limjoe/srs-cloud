'use strict';

const utils = require('./utils');
const pkg = require('./package.json');
const { spawn } = require('child_process');
const metadata = require('./metadata');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const axios = require('axios');
const srs = require('./srs');
const consts = require('./consts');

exports.handle = (router) => {
  router.all('/terraform/v1/mgmt/status', async (ctx) => {
    const {token} = ctx.request.body;
    const decoded = await utils.verifyToken(token);

    console.log(`status ok, decoded=${JSON.stringify(decoded)}, token=${token.length}B`);
    ctx.body = utils.asResponse(0, {
      version: `v${pkg.version}`,
      releases: {
        stable: metadata.releases.releases.stable,
        latest: metadata.releases.releases.latest,
      },
    });
  });

  router.all('/terraform/v1/mgmt/upgrade', async (ctx) => {
    const {token} = ctx.request.body;
    const decoded = await utils.verifyToken(token);

    const releaseServer = process.env.NODE_ENV === 'development' ? `http://localhost:${consts.config.port}` : 'http://api.ossrs.net';
    const {data: releases} = await axios.get(`${releaseServer}/terraform/v1/releases`, {
      params: {
        version: `v${pkg.version}`,
        ts: new Date().getTime(),
      }
    });
    metadata.releases = releases;

    let target = releases?.latest || 'lighthouse';
    console.log(`Start upgrade to target=${target}, current=${pkg.version}, releases=${JSON.stringify(releases)}`);

    await new Promise((resolve, reject) => {
      const child = spawn('bash', ['upgrade', target]);
      child.stdout.on('data', (chunk) => {
        console.log(chunk.toString());
      });
      child.stderr.on('data', (chunk) => {
        console.log(chunk.toString());
      });
      child.on('close', (code) => {
        console.log(`upgrading exited with code ${code}`);
        if (code !== 0) return reject(code);
        resolve();
      });
    });

    console.log(`upgrade ok, decoded=${JSON.stringify(decoded)}, token=${token.length}B`);
    ctx.body = utils.asResponse(0, {
      version: pkg.version,
    });
  });

  router.all('/terraform/v1/mgmt/srs', async (ctx) => {
    const {token, action} = ctx.request.body;
    const decoded = await utils.verifyToken(token);

    if (action === 'restart') {
      // We must rm the container to get a new ID.
      await exec(`docker rm -f ${metadata.srs.name}`);

      const previousContainerID = metadata.srs.container.ID;
      for (let i = 0; i < 20; i++) {
        // Wait util running and got another container ID.
        const [all, running] = await srs.queryContainer();
        // Please note that we don't update the metadata of SRS, client must request the updated status.
        if (all && all.ID && running && running.ID && running.ID !== previousContainerID) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`srs ok, action=${action} decoded=${JSON.stringify(decoded)}, token=${token.length}B`);
    ctx.body = utils.asResponse(0, {
      name: metadata.srs.name,
      container: {
        ID: metadata.srs.container.ID,
        State: metadata.srs.container.State,
        Status: metadata.srs.container.Status,
      },
    });
  });

  router.all('/terraform/v1/mgmt/hooks', async (ctx) => {
    const {token, action} = ctx.request.body;
    const decoded = await utils.verifyToken(token);

    console.log(`srs ok, action=${action} decoded=${JSON.stringify(decoded)}, token=${token.length}B`);
    ctx.body = utils.asResponse(0, {
      name: metadata.market.hooks.name,
      container: {
        ID: metadata.market.hooks.container.ID,
        State: metadata.market.hooks.container.State,
        Status: metadata.market.hooks.container.Status,
      },
    });
  });

  return router;
};

