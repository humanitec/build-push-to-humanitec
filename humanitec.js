const fetch = require('node-fetch');
/**
 * @typedef {Object} Credentials
 * @property {string} username - The username used to access the registry
 * @property {string} password - The password used to access the registry
 */

/**
 * @typedef {Object} Payload
 * @property {string} name - The full image name excluding the tag. It should include the registry and the repository.
 * @property {string} version - The tag for the docker image to be tagged with.
 * @property {string} ref - The ref of the image.
 * @property {string} commit - The GIT SHA of the commit being notified about.
 */

module.exports = function(token, orgId, apiHost) {
  apiHost = apiHost || 'api.humanitec.io';

  const validId = /^[a-z0-9][a-z0-9-]+[a-z0-9]$/;
  if (!orgId || typeof orgId !== 'string' || !orgId.match(validId)) {
    throw new Error(`'${orgId}' is not a valid id`);
  }

  /**
   * Fetches the registry credentials from Humanitec
   * @return {Promise} - A promise wich returns a {Credentials} object.
   */
  function getRegistryCredentials() {
    return fetch(
      `https://${apiHost}/orgs/${orgId}/registries/humanitec/creds`, {
        headers: {'Authorization': `Bearer ${token}`},
      }).then((res) => {
      if (res.ok && res.headers.get('Content-Type') && res.headers.get('Content-Type').startsWith('application/json')) {
        return res.json();
      }
      throw new Error('Unable to access Humanitec.');
    });
  }

  /**
   * Notifies Humanitec that a version has been added
   * @param {Payload} payload - Details about the artefact version.
   * @return {Promise} - A promise which resolves to true if successful, false otherwise.
   */
  function addNewVersion(payload) {
    return fetch(
      `https://${apiHost}/orgs/${orgId}/artefact-versions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'gh-action-build-push-to-humanitec/latest',
        },
        body: JSON.stringify(payload),
      }).then((res) => res.ok);
  }

  return {
    getRegistryCredentials,
    addNewVersion,
  };
};
