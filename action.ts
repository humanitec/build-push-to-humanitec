import * as docker from "./docker.js";
import { createApiClient } from "./humanitec.js";

import { existsSync } from "node:fs";
import * as core from "@actions/core";
import { CreateArtefactVersion } from "@humanitec/autogen";

const DOC_URL =
  "https://developer.humanitec.com/integration-and-extensions/ci-cd/overview/";
const humanitecRegId = "humanitec";

/**
 * Performs the GitHub action.
 */
export async function runAction() {
  // Get GitHub Action inputs
  const token = core.getInput("humanitec-token", { required: true });
  const orgId = core.getInput("organization", { required: true });
  const imageName =
    core.getInput("image-name") ||
    (process.env.GITHUB_REPOSITORY || "").replace(/.*\//, "");
  const existingImage = core.getInput("existing-image") || "";
  const context =
    core.getInput("dockerfile") || core.getInput("context") || ".";
  const file = core.getInput("file") || "";
  let registryHost =
    core.getInput("humanitec-registry") || "registry.humanitec.io";
  const apiHost = core.getInput("humanitec-api") || "api.humanitec.io";
  const tag = core.getInput("tag") || "";
  const commit = process.env.GITHUB_SHA || "";
  const autoTag = /^\s*(true|1)\s*$/i.test(core.getInput("auto-tag"));
  const additionalDockerArguments =
    core.getInput("additional-docker-arguments") || "";
  const externalRegistryUrl = core.getInput("external-registry-url") || "";

  const ref = core.getInput("ref") || process.env.GITHUB_REF || "";
  if (!existsSync(`${process.env.GITHUB_WORKSPACE}/.git`)) {
    core.error("It does not look like anything was checked out.");
    core.error(`Did you run a checkout step before this step? ${DOC_URL}`);
    core.setFailed("No .git directory found in workspace.");
    return;
  }

  if (file != "" && !existsSync(file)) {
    core.error(`Cannot find file ${file}`);
    core.setFailed("Cannot find file.");
    return;
  }

  if (!existsSync(context)) {
    core.error(`Context path does not exist: ${context}`);
    core.setFailed("Context path does not exist.");
    return;
  }

  const humanitec = createApiClient(apiHost, token);

  if (externalRegistryUrl == "") {
    const registryCreds = await humanitec.orgsOrgIdRegistriesRegIdCredsGet({
      orgId,
      regId: humanitecRegId,
    });
    if (!registryCreds.username || !registryCreds.password) {
      core.error(`No credentials found for the Humanitec registry.`);
      core.setFailed("No credentials found for the Humanitec registry.");
      return;
    }
    if (
      !docker.login(
        registryCreds.username,
        registryCreds.password,
        registryHost,
      )
    ) {
      core.setFailed("Unable to connect to the humanitec registry.");
      return;
    }
    registryHost = `${registryHost}/${orgId}`;
  } else {
    registryHost = externalRegistryUrl;
  }

  process.chdir(process.env.GITHUB_WORKSPACE || "");

  let version = "";
  if (autoTag && ref.includes("/tags/")) {
    version = ref.replace(/.*\/tags\//, "");
  } else if (tag) {
    version = tag;
  } else {
    version = commit;
  }
  const imageWithVersion = `${imageName}:${version}`;
  const remoteTag = `${registryHost}/${imageWithVersion}`;

  if (existingImage) {
    if (existingImage.startsWith(registryHost)) {
      core.setFailed(
        `The provided image seems to be already pushed, but the version tag is not matching.\n` +
          `Expected: ${remoteTag}\n` +
          `Provided: ${existingImage}`,
      );
      return;
    }
    const pushed = await docker.push(existingImage, remoteTag);
    if (!pushed) {
      core.setFailed("Unable to push image to registry");
      return;
    }
  } else {
    await docker.build(remoteTag, file, additionalDockerArguments, context);
  }

  const artefactName = `${registryHost}/${imageName}`;

  core.setOutput("image", remoteTag);

  const payload: CreateArtefactVersion = {
    name: artefactName,
    type: "container",
    version,
    ref,
    commit,
  };

  try {
    await humanitec.createArtefactVersion({
      orgId,
      CreateArtefactVersion: payload,
    });
  } catch (error) {
    core.error("Unable to notify Humanitec about build.");
    core.error(`Did you add the token to your Github Secrets? ${DOC_URL}`);

    if (error instanceof Error) {
      core.error(error);
    } else {
      core.error(`Unexpected error: ${error}`);
    }

    core.setFailed("Unable to access Humanitec.");
    return;
  }
}
