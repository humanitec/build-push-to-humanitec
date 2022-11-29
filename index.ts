import * as core from '@actions/core';
import {runAction} from './action';

runAction().catch((e) => {
  core.error('Action failed');
  core.error(`${e.name} ${e.message}`);
  core.setFailed(`${e.name} ${e.message}`);
});
