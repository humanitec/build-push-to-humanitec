const cp = require('child_process');
const exec = require('@actions/exec');
const { countReset } = require('console');

/**
 * Authenticates with a remote docker registry.
 * @param {string} username - The username to log in with.
 * @param {string} password - The password to log in with.
 * @param {string} server - The host to connect to to log in.
 * @return {boolean} - true if successful, otherwise false.
 */
function login(username, password, server) {
  try {
    cp.execSync(`docker login -u ${username} --password-stdin ${server}`, {
      input: password,
    });
  } catch (err) {
    return false;
  }
  return true;
}


/**
 * Builds the image described by the Dockerfile and tags it locally.
 * @param {string} tag - The local tag to use for the built image.
 * @param {string} file - A path to an alternative dockerfile.
 * @param {string} contextPath - A directory of a build's context.
 * @param {string} additionalDockerArguments - Additional docker arguments
 * @return {string} - The container ID assuming a successful build. falsy otherwise.
 */
async function build(tag, file, contextPath, additionalDockerArguments) {
  try {
    let args = ['build', '-t', tag]
    if(file != '') {
      args.push('-f', file)
    }
    args.push(additionalDockerArguments, contextPath)
    await exec.exec('docker', args);

    return cp.execSync(`docker images -q "${tag}"`).toString().trim();
  } catch (err) {
    return false;
  }
}


/**
 * Pushes the specified local image to a the remote server. Assumes docker.login has already been called.
 * @param {string} imagId - The id of the tag being pushed. (Usually returned from docker.build)
 * @param {string} remoteTag - The tag that the image will use remotely. (Should indclude registry host, name and tags.)
 * @return {boolean} - true if successful, otherwise false.
 */
function push(imagId, remoteTag) {
  try {
    cp.execSync(`docker tag "${imagId}" "${remoteTag}"`);
    cp.execSync(`docker push "${remoteTag}"`);
  } catch (err) {
    return false;
  }
  return true;
}

module.exports = {
  login,
  build,
  push,
};
