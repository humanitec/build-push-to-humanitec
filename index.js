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
  const imageName = core.getInput('image-name') || process.env.GITHUB_REPOSITORY.replace(/.*\//, '');
  const context = core.getInput('context') || core.getInput('dockerfile') || '.';
  const file = core.getInput('file') || '';
  const registryHost = core.getInput('humanitec-registry') || 'registry.humanitec.io';
  const apiHost = core.getInput('humanitec-api') || 'api.humanitec.io';
  const tag = core.getInput('tag') || '';
  const commit = process.env.GITHUB_SHA;
  const autoTag = /^\s*(true|1)\s*$/i.test(core.getInput('auto-tag'));
  const additionalDockerArguments = core.getInput('additional-docker-arguments') || '';

  const ref = process.env.GITHUB_REF;
  if (!fs.existsSync(`${process.env.GITHUB_WORKSPACE}/.git`)) {
    core.error('It does not look like anything was checked out.');
    core.error('Did you run a checkout step before this step? ' +
      'http:/docs.humanitec.com/connecting-your-ci#github-actions');
    core.setFailed('No .git directory found in workspace.');
    return;
  }

  if (file != '' && !fs.existsSync(file)) {
    core.error(`Cannot find file ${file}`);
    core.setFailed('Cannot find file.');
    return;
  }

  if (!fs.existsSync(context)) {
    core.error(`Context path does not exist: ${context}`);
    core.setFailed('Context path does not exist.');
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

  let version = '';
  if (autoTag && ref.includes('\/tags\/')) {
    version = ref.replace(/.*\/tags\//, '');
  } else if (tag) {
    version = tag;
  } else {
    version = commit;
  }
  const localTag = `${orgId}/${imageName}:${version}`;
  const imageId = await docker.build(localTag, file, additionalDockerArguments, context);
  if (!imageId) {
    core.setFailed('Unable build image from Dockerfile.');
    return;
  }

  const remoteTag = `${registryHost}/${localTag}`;
  if (!docker.push(imageId, remoteTag)) {
    core.setFailed('Unable to push image to registry');
    return;
  }

  let digest = await docker.getDigest(imageId);
  if (!digest) {
    core.error('Unable to retrieve the digest of the image');
    digest = '';
  }

  const payload = {
    name: `${registryHost}/${orgId}/${imageName}`,
    type: 'container',
    version,
    ref,
    commit,
    digest,
  };

  try {
    await humanitec.addNewVersion(payload);
  } catch (error) {
    core.error('Unable to notify Humanitec about build.');
    core.error('Did you add the token to your Github Secrets? ' +
      'http:/docs.humanitec.com/connecting-your-ci#github-actions');
    core.setFailed('Unable to access Humanitec.');
    return;
  }
}

runAction().catch((e) => {
  core.error('Action failed');
  core.error(`${e.name} ${e.message}`);
  core.setFailed(`${e.name} ${e.message}`);
});
