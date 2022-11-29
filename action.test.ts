import {describe, expect, test, beforeEach, afterAll} from '@jest/globals';
import {join as pathJoin} from 'node:path';
import {runAction} from './action';
import {randomBytes} from 'crypto';
import fetch from 'node-fetch';
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
const orgId = ensureEnv('HUMANITEC_ORG');

const tenMinInMs = 10 * 60 * 1000;

describe('action', () => {
  let repo: string;
  let commit: string;


  afterAll(async () => {
    const res = await fetch(
      `https://api.humanitec.io/orgs/${orgId}/artefacts?type=container`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'gh-action-build-push-to-humanitec/latest',
        },
      });

    expect(res.status).toBe(200);

    const body = await res.json();

    for (const artefact of body) {
      if (!artefact.name.startsWith(`registry.humanitec.io/${orgId}/test-`)) {
        continue;
      }

      if (Date.now() - Date.parse(artefact.createdAt) < tenMinInMs) {
        continue;
      }

      const res = await fetch(
        `https://api.humanitec.io/orgs/${orgId}/artefacts/${artefact.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'gh-action-build-push-to-humanitec/latest',
          },
        });
      expect(res.status).toBe(204);
    }
  });

  beforeEach(async () => {
    await mkdir(pathJoin(fixtures, '.git'));

    setInput('humanitec-token', token);
    setInput('organization', orgId);
    setInput('context', '.');

    commit = randomBytes(20).toString('hex');
    repo = `test-${randomBytes(20).toString('hex')}`;

    process.env['GITHUB_WORKSPACE'] = fixtures;
    process.env['GITHUB_SHA'] = commit;
    process.env['GITHUB_REPOSITORY'] = repo;
  });

  test('succeeds', async () => {
    await runAction();
    expect(process.exitCode).toBeFalsy;

    const res = await fetch(
      `https://api.humanitec.io/orgs/${orgId}/artefact-versions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'gh-action-build-push-to-humanitec/latest',
        },
      });

    expect(res.status).toBe(200);

    const body = await res.json();

    expect(body).toEqual(
      expect.arrayContaining(
        [expect.objectContaining({commit: commit})],
      ),
    );
  });
});
