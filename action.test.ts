import {describe, expect, test, beforeEach, afterAll, afterEach} from '@jest/globals';
import {join as pathJoin} from 'node:path';
import {runAction} from './action';
import {randomBytes} from 'crypto';
import {mkdir} from 'node:fs/promises';
import {createApiClient} from './humanitec';
import {exec as actionsExec} from '@actions/exec';

// Emulate https://github.com/actions/toolkit/blob/819157bf8/packages/core/src/core.ts#L128
const setInputWithState = (state: string[], name: string, value: string): void => {
  const envName = `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
  process.env[envName] = value;

  state.push(envName);
};

const clearInputs = (envNames: string[]) => {
  for (const envName of envNames) {
    process.env[envName] = '';
  }
};

const fixtures = pathJoin(__dirname, './fixtures');

const ensureEnv = (name: string): string => {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Required environment variables ${name} is empty.`);
  }

  return val;
};

const token = ensureEnv('HUMANITEC_TOKEN');
const humanitecClient = createApiClient('api.humanitec.io', token);

const orgId = ensureEnv('HUMANITEC_ORG');

const tenMinInMs = 10 * 60 * 1000;

describe('action', () => {
  let repo: string;
  let commit: string;

  const inputs: string[] = [];
  const setInput = (name: string, value: string): void => {
    return setInputWithState(inputs, name, value);
  };

  afterAll(async () => {
    const res = await humanitecClient.orgsOrgIdArtefactsGet({
      orgId,
      type: 'container',
    });

    // eslint-disable-next-line jest/no-standalone-expect
    expect(res.status).toBe(200);

    for (const artefact of res.data) {
      if (!artefact.name.startsWith(`registry.humanitec.io/${orgId}/test-`)) {
        continue;
      }

      if (!artefact.created_at || Date.now() - Date.parse(artefact.created_at) < tenMinInMs) {
        continue;
      }
      const res = await humanitecClient.orgsOrgIdArtefactsArtefactIdDelete({
        orgId,
        artefactId: artefact.id,
      });

      // Multiple tests might delete artifacts
      // eslint-disable-next-line jest/no-standalone-expect
      expect([204, 404]).toContain(res.status);
    }
  });

  beforeEach(async () => {
    await mkdir(pathJoin(fixtures, '.git'), {recursive: true});

    setInput('ref', '');
    setInput('humanitec-token', token);
    setInput('organization', orgId);
    setInput('context', '.');

    commit = randomBytes(20).toString('hex');
    repo = `test-${randomBytes(20).toString('hex')}`;

    process.env['GITHUB_WORKSPACE'] = fixtures;
    process.env['GITHUB_SHA'] = commit;
    process.env['GITHUB_REPOSITORY'] = repo;
  });

  afterEach(() => {
    process.exitCode = undefined;
    clearInputs(inputs);
  });

  test('succeeds', async () => {
    await runAction();
    expect(process.exitCode).toBeFalsy();

    const res = await humanitecClient.orgsOrgIdArtefactVersionsGet({orgId});
    expect(res.status).toBe(200);
    expect(res.data).toEqual(
      expect.arrayContaining(
        [
          expect.objectContaining({
            commit: commit,
            name: `registry.humanitec.io/${orgId}/${repo}`,
          }),
        ],
      ),
    );
  });

  test('fails with an invalid ref', async () => {
    setInput('ref', 'invalid');

    await runAction();
    expect(process.exitCode).toBeTruthy();
  });

  test('with slashed docker build args', async () => {
    setInput('additional-docker-arguments', `
    --build-arg version=123 \\
    --build-arg build_time=123 \\
    --build-arg gitsha=132

    `);

    await runAction();
    expect(process.exitCode).toBeFalsy();

    const res = await humanitecClient.orgsOrgIdArtefactVersionsGet({orgId});
    expect(res.status).toBe(200);
    expect(res.data).toEqual(
      expect.arrayContaining(
        [
          expect.objectContaining({
            commit: commit,
            name: `registry.humanitec.io/${orgId}/${repo}`,
          }),
        ],
      ),
    );
  });

  test('supports an external registry', async () => {
    repo = 'test-image';
    process.env['GITHUB_REPOSITORY'] = repo;

    setInput('external-registry-url', 'ghcr.io/humanitec/build-push-to-humanitec');

    await runAction();
    expect(process.exitCode).toBeFalsy();

    const res = await humanitecClient.orgsOrgIdArtefactVersionsGet({orgId});
    expect(res.status).toBe(200);
    expect(res.data).toEqual(
      expect.arrayContaining(
        [
          expect.objectContaining({
            commit: commit,
            name: `ghcr.io/humanitec/build-push-to-humanitec/${repo}`,
          }),
        ],
      ),
    );
  });

  test('supports pushing an already existing image', async () => {
    actionsExec('docker', ['pull', 'hello-world:latest']);

    setInput('existing-image', 'hello-world:latest');

    await runAction();
    expect(process.exitCode).toBeFalsy();

    const res = await humanitecClient.orgsOrgIdArtefactVersionsGet({orgId});
    expect(res.status).toBe(200);
    expect(res.data).toEqual(
      expect.arrayContaining(
        [
          expect.objectContaining({
            commit: commit,
            name: `registry.humanitec.io/${orgId}/${repo}`,
          }),
        ],
      ),
    );
  });

  test('fails when trying to specific an image on the same registry with a different tag', async () => {
    actionsExec('docker', ['pull', 'hello-world:latest']);
    actionsExec('docker', ['tag', 'hello-world:latest', `registry.humanitec.io/${orgId}/hello-world:latest`]);

    setInput('existing-image', `registry.humanitec.io/${orgId}/hello-world:latest`);

    await runAction();
    expect(process.exitCode).toBeTruthy();
  });
});
