import { execSync } from "node:child_process";
import { getExecOutput as actionsExec } from "@actions/exec";
import { parseArgsStringToArgv } from "string-argv";

/**
 * Authenticates with a remote docker registry.
 * @param {string} username - The username to log in with.
 * @param {string} password - The password to log in with.
 * @param {string} server - The host to connect to to log in.
 * @return {boolean} - true if successful, otherwise false.
 */
export const login = function (
  username: string,
  password: string,
  server: string,
): boolean {
  try {
    execSync(`docker login -u ${username} --password-stdin ${server}`, {
      input: password,
    });
  } catch {
    return false;
  }
  return true;
};

/**
 * Builds the image described by the Dockerfile and tags it locally.
 * @param {string} tag - The local tag to use for the built image.
 * @param {string} file - A path to an alternative dockerfile.
 * @param {string} additionalDockerArguments - Additional docker arguments
 * @param {string} contextPath - A directory of a build's context.
 * @return {string} - The container ID assuming a successful build, falsy otherwise.
 */
export const build = async function (
  tag: string,
  file: string,
  additionalDockerArguments: string,
  contextPath: string,
): Promise<string> {
  try {
    const args = ["build", "-t", tag];
    if (file != "") {
      args.push("-f", file);
    }
    if (additionalDockerArguments != "") {
      const argArray = parseArgsStringToArgv(additionalDockerArguments).filter(
        (a) => a !== "\\",
      );
      args.push(...argArray);
    }
    args.push(contextPath);
    await actionsExec("docker", args);

    return execSync(`docker images -q "${tag}"`).toString().trim();
  } catch {
    return "";
  }
};

/**
 * Pushes the specified local image to a the remote server. Assumes docker.login has already been called.
 * @param {string} imageId - The id of the tag being pushed. (Usually returned from docker.build)
 * @param {string} remoteTag - The tag that the image will use remotely. (Should indclude registry host, name and tags.)
 * @return {boolean} - true if successful, otherwise false.
 */
export const push = async function (
  imageId: string,
  remoteTag: string,
): Promise<boolean> {
  try {
    await actionsExec("docker", ["tag", imageId, remoteTag]);
    await actionsExec("docker", ["push", remoteTag]);
  } catch {
    return false;
  }
  return true;
};
