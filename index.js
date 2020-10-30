const docker = require('./docker');
const humanitecFactory = require('./humanitec');
const fs = require('fs');
const core = require('@actions/core');

/**
 * Performs the GitHub action.
 */
async function runAction() {
  // Get GitHub Action inputs
  const token = core.getInput('humanitec-token', {required: true});
  const orgId = core.getInput('organization', {required: true});
  const moduleName = core.getInput('module-name') || process.env.GITHUB_REPOSITORY.replace(/.*\//, '');
  const dockerfile = core.getInput('dockerfile') || '.';
  const registryHost = core.getInput('humanitec-registry') || 'registry.humanitec.io';
  const apiHost = core.getInput('humanitec-api') || 'api.humanitec.io';
  const tag = core.getInput('tag') || '';
  const autoTag = /^\s*(true|1)\s*$/i.test(core.getInput('auto-tag'));

  if (!fs.existsSync(`${process.env.GITHUB_WORKSPACE}/.git`)) {
    core.error('It does not look like anything was checked out.');
    core.error('Did you run a checkout step before this step? ' +
      'http:/docs.humanitec.com/connecting-your-ci#github-actions');
    core.setFailed('No .git directory found in workspace.');
    return;
  }

  // As the user can choose their module name, we need to ensure it is a valid slug (i.e. lowercase kebab case)
  if (! moduleName.match(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)) {
    core.error('module-name must be all lowercase letters, numbers and the "-" symbol. ' +
      'It cannot start or end with "-".');
    core.setFailed('module-name: "${moduleName}" is not valid.');
    return;
  }

  if (!fs.existsSync(dockerfile)) {
    core.error(`Cannot find Dockerfile at ${dockerfile}`);
    core.setFailed('Cannot find Dockerfile.');
    return;
  }

  const humanitec = humanitecFactory(token, orgId, apiHost);

  let registryCreds;
  try {
    registryCreds = await humanitec.getRegistryCredentials();
  } catch (error) {
    core.error('Unable to fetch repository credentials.');
    core.error('Did you add the token to your Github Secrets? ' +
      'http:/docs.humanitec.com/connecting-your-ci#github-actions');
    core.setFailed('Unable to access Humanitec.');
    return;
  }

  if (!docker.login(registryCreds.username, registryCreds.password, registryHost)) {
    core.setFailed('Unable to connect to the humanitec registry.');
    return;
  }

  process.chdir(process.env.GITHUB_WORKSPACE);


  let localTag = `${orgId}/${moduleName}:${process.env.GITHUB_SHA}`;
  if (process.env.GITHUB_REF.includes('\/tags\/') && autoTag) {
    localTag = `${orgId}/${moduleName}:${process.env.GITHUB_REF.replace(/.*\/tags\//, '')}`;
  } else if (tag) {
    localTag = `${orgId}/${moduleName}:${tag}`;
  }

  const imageId = await docker.build(localTag, dockerfile);
  if (!imageId) {
    core.setFailed('Unable build image from Dockerfile.');
    return;
  }

  const remoteTag = `${registryHost}/${localTag}`;
  if (!docker.push(imageId, remoteTag)) {
    core.setFailed('Unable to push image to registry');
    return;
  }

  const payload = {
    commit: process.env.GITHUB_SHA,
    image: remoteTag,
  };
  if (process.env.GITHUB_REF.includes('\/heads\/')) {
    payload.branch = process.env.GITHUB_REF.replace(/.*\/heads\//, '');
    payload.tags = [];
  } else {
    payload.branch = '';
    payload.tags = [process.env.GITHUB_REF.replace(/.*\/tags\//, '')];
  }

  try {
    await humanitec.addNewBuild(moduleName, payload);
  } catch (error) {
    core.error('Unable to notify Humanitec about build.');
    core.error('Did you add the token to your Github Secrets? ' +
      'http:/docs.humanitec.com/connecting-your-ci#github-actions');
    core.setFailed('Unable to access Humanitec.');
    return;
  }
}

runAction();
