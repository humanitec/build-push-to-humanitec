import {describe, expect, test, beforeEach, afterAll, afterEach} from '@jest/globals';
import {join as pathJoin} from 'node:path';
import {runAction} from './action';
import {randomBytes} from 'crypto';
import fetch, {RequestInit} from 'node-fetch';
import {mkdir} from 'node:fs/promises';

// Emulate https://github.com/actions/toolkit/blob/819157bf8/packages/core/src/core.ts#L128
const setInput = (name: string, value: string): void => {
  process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] = value;
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


const humanitecReq = (path: string, options: RequestInit) => {
  options = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'gh-action-build-push-to-humanitec/latest',
    },
    ...options,
  };

  return fetch(`https://api.humanitec.io/${path}`, options);
};

const orgId = ensureEnv('HUMANITEC_ORG');

const tenMinInMs = 10 * 60 * 1000;

describe('action', () => {
  let repo: string;
  let commit: string;


  afterAll(async () => {
    const res = await humanitecReq(`orgs/${orgId}/artefacts?type=container`, {method: 'GET'});

    // eslint-disable-next-line jest/no-standalone-expect
    expect(res.status).toBe(200);

    const body = await res.json();

    for (const artefact of body) {
      if (!artefact.name.startsWith(`registry.humanitec.io/${orgId}/test-`)) {
        continue;
      }

      if (Date.now() - Date.parse(artefact.createdAt) < tenMinInMs) {
        continue;
      }

      const res = await humanitecReq(`orgs/${orgId}/artefacts/${artefact.id}`, {method: 'DELETE'});

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
  });

  test('succeeds', async () => {
    await runAction();
    expect(process.exitCode).toBeFalsy();

    const res = await humanitecReq(`orgs/${orgId}/artefact-versions`, {method: 'GET'});
    expect(res.status).toBe(200);

    const body = await res.json();

    expect(body).toEqual(
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

    const res = await humanitecReq(`orgs/${orgId}/artefact-versions`, {method: 'GET'});
    expect(res.status).toBe(200);

    const body = await res.json();

    expect(body).toEqual(
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

    const res = await humanitecReq(`orgs/${orgId}/artefact-versions`, {method: 'GET'});
    expect(res.status).toBe(200);

    const body = await res.json();

    expect(body).toEqual(
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
});
