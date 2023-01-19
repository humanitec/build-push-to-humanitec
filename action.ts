import * as docker from './docker';
import {createApiClient} from './humanitec';

import {existsSync} from 'node:fs';
import * as core from '@actions/core';
import {AddArtefactVersionPayloadRequest} from '@humanitec/autogen';

const DOC_URL = 'https://docs.humanitec.com/guides/connect-ci-setup/connect-ci-pipelines#github-actions-workflow';
const humanitecRegId = 'humanitec';

/**
 * Performs the GitHub action.
 */
export async function runAction() {
  // Get GitHub Action inputs
  const token = core.getInput('humanitec-token', {required: true});
  const orgId = core.getInput('organization', {required: true});
  const imageName = core.getInput('image-name') || (process.env.GITHUB_REPOSITORY || '').replace(/.*\//, '');
  const context = core.getInput('context') || core.getInput('dockerfile') || '.';
  const file = core.getInput('file') || '';
  let registryHost = core.getInput('humanitec-registry') || 'registry.humanitec.io';
  const apiHost = core.getInput('humanitec-api') || 'api.humanitec.io';
  const tag = core.getInput('tag') || '';
  const commit = process.env.GITHUB_SHA || '';
  const autoTag = /^\s*(true|1)\s*$/i.test(core.getInput('auto-tag'));
  const additionalDockerArguments = core.getInput('additional-docker-arguments') || '';
  const externalRegistryUrl = core.getInput('external-registry-url') || '';

  const ref = core.getInput('ref') || process.env.GITHUB_REF || '';
  if (!existsSync(`${process.env.GITHUB_WORKSPACE}/.git`)) {
    core.error('It does not look like anything was checked out.');
    core.error(`Did you run a checkout step before this step? ${DOC_URL}`);
    core.setFailed('No .git directory found in workspace.');
    return;
  }

  if (file != '' && !existsSync(file)) {
    core.error(`Cannot find file ${file}`);
    core.setFailed('Cannot find file.');
    return;
  }

  if (!existsSync(context)) {
    core.error(`Context path does not exist: ${context}`);
    core.setFailed('Context path does not exist.');
    return;
  }

  const humanitec = createApiClient(apiHost, token);

  if (externalRegistryUrl == '') {
    const registryCreds = await humanitec.orgsOrgIdRegistriesRegIdCredsGet(orgId, humanitecRegId);
    if (registryCreds.status != 200) {
      throw new Error(
        `Unexpected response fetching registry credentials: ${registryCreds.status}, ${registryCreds.data}`,
      );
    }

    if (!docker.login(registryCreds.data.username, registryCreds.data.password, registryHost)) {
      core.setFailed('Unable to connect to the humanitec registry.');
      return;
    }
    registryHost = `${registryHost}/${orgId}`;
  } else {
    registryHost = externalRegistryUrl;
  }

  process.chdir((process.env.GITHUB_WORKSPACE || ''));

  let version = '';
  if (autoTag && ref.includes('/tags/')) {
    version = ref.replace(/.*\/tags\//, '');
  } else if (tag) {
    version = tag;
  } else {
    version = commit;
  }
  const imageWithVersion = `${imageName}:${version}`;
  const localTag = `${orgId}/${imageWithVersion}`;
  const imageId = await docker.build(localTag, file, additionalDockerArguments, context);
  if (!imageId) {
    core.setFailed('Unable build image from Dockerfile.');
    return;
  }

  const remoteTag = `${registryHost}/${imageWithVersion}`;
  const pushed = await docker.push(imageId, remoteTag);
  if (!pushed) {
    core.setFailed('Unable to push image to registry');
    return;
  }

  const payload: AddArtefactVersionPayloadRequest = {
    name: `${registryHost}/${imageName}`,
    type: 'container',
    version,
    ref,
    commit,
  };

  try {
    const versionReq = await humanitec.orgsOrgIdArtefactVersionsPost(orgId, payload);
    if (versionReq.status != 204) {
      throw new Error(
        `Unexpected response creating artefact version: ${versionReq.status}, ${versionReq.data}`,
      );
    }
  } catch (error) {
    core.error('Unable to notify Humanitec about build.');
    core.error(`Did you add the token to your Github Secrets? ${DOC_URL}`);

    if (error instanceof Error) {
      core.error(error);
    } else {
      core.error(`Unexpected error: ${error}`);
    }

    core.setFailed('Unable to access Humanitec.');
    return;
  }
}
