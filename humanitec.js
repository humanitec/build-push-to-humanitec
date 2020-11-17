const fetch = require('node-fetch');
/**
 * @typedef {Object} Credentials
 * @property {string} username - The username used to access the registry
 * @property {string} password - The password used to access the registry
 */

/**
 * @typedef {Object} Payload
 * @property {string} commit - The GIT SHA of the commit being notified about.
 * @property {string} branch - The branch this commit is on.
 * @property {Array|string} tags - An array of tags refering to this commit.
 * @property {string} image - The fully qualidied image name that should be used for this build.
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
   * Notifies Humanitec that a build has completed
   * @param {string} imageName - The name of the image to be added to Huamnitec.
   * @param {Payload} payload - Details about the image.
   * @return {Promise} - A promise which resolves to true if successful, false otherwise.
   */
  function addNewBuild(imageName, payload) {
    return fetch(
      `https://${apiHost}/orgs/${orgId}/modules/${imageName}/builds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).then((res) => res.ok);
  }

  return {
    getRegistryCredentials,
    addNewBuild,
  };
};
