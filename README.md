# Build Push to Humanitec Action

This action builds a container image from a Dockerfile, then pushes the image to the Humanitec registry and finally
notifies the Humanitec platform that a new version is available.

## Inputs

### `humanitec-token`

**Required** The API token provided by the platform. This should be stored as a GitHub Repository Secret and then passed
to the action using a variable expansion. For example, if the token is store as a secret with name `HUMANITEC_TOKEN`,
the following code should be used to pass it to the action:

```yaml
    uses: humanitec/build-push-to-humanitec@v1
      with:
        humanitec-token: ${{ secrets.HUMANITEC_TOKEN }}
        organization: awesome-company
```

### `organization`

**Required** The name of the organization that the image will be built for.

### `image-name`

_Optional_ The name you want to use in the Docker registry. The name can only contain lowercase letters, numbers, hyphens ("-"), and underscores ("_").

### `existing-image`

_Optional_ Use an existing image instead of building an image. The image name needs to include a tag or digest.

### `file`

_Optional_ Name of the Dockerfile, defaults to `$context/Dockerfile`.

### `context`

_Optional_ Build context path. Defaults to the root of repository.

### `dockerfile` (deprecated)

_Optional_ The same as `context`, use `context` instead.

### `tag`

_Optional_ Define your own tag for the docker image to be tagged with.

```yaml
    uses: humanitec/build-push-to-humanitec@v1
      with:
        humanitec-token: ${{ secrets.HUMANITEC_TOKEN }}
        organization: awesome-company
        tag: latest
```
### `ref`

_Optional_ Define your own ref to be sent to Humanitec instead of GitHub action's GITHUB_REF.

```yaml
    uses: humanitec/build-push-to-humanitec@v1
      with:
        humanitec-token: ${{ secrets.HUMANITEC_TOKEN }}
        organization: awesome-company
        ref: refs/heads/main
```

> **_NOTE:_**  For auto-deployment to work on GitHub action trigger: `on: pull_request`, set `ref: refs/pr_head/${{ github.event.pull_request.head.ref }}` 

### `auto-tag`

_Optional_ Use `auto-tag` when you want to push tags/release by their git name (e.g. `refs/tags/MY_TAG_NAME`).  
> **_CAUTION:_** Images produced by this feature can be overwritten by branches with the same name - without a way to restore.

```yaml
    uses: humanitec/build-push-to-humanitec@v1
      with:
        humanitec-token: ${{ secrets.HUMANITEC_TOKEN }}
        organization: awesome-company
        auto-tag: true
```

### `additional-docker-arguments`

_Optional_ Use `additional-docker-arguments` if you need to provide additional arguments (e.g.,build arguments) to the docker build process.
> NOTE: You can provide multiple argument by placing them in one long list of commands, e.g., `--build-arg env1=value1 --build-arg env2=value2`.

```yaml
    uses: humanitec/build-push-to-humanitec@v1
      with:
        humanitec-token: ${{ secrets.HUMANITEC_TOKEN }}
        organization: awesome-company
        additional-docker-arguments: --build-arg env=staging
```

### `external-registry-url`

_Optional_ Push the image to an external container registry. This registry does not need to be [registered with Humanitec](https://docs.humanitec.com/guides/connect-ci-setup/container-registries) and authentication needs to be done before calling this action (e.g. using workload identity). 

```yaml
    uses: humanitec/build-push-to-humanitec@v1
      with:
        humanitec-token: ${{ secrets.HUMANITEC_TOKEN }}
        organization: awesome-company
        external-registry-url: europe-west3-docker.pkg.dev/gcp-project/repository
```

Will push the resulting image to `europe-west3-docker.pkg.dev/gcp-project/repository/{image-name}`.

## Outputs

* `image` : The full name of the image that was built and pushed.

## Example usage

```yaml
uses: humanitec/build-push-to-humanitec@v1
  with:
    humanitec-token: ${{ secrets.HUMANITEC_TOKEN }}
    organization: awesome-company
```


## Development

Running the tests requires an Humanitec account. Once this is created, the following environment variables need to be configure:

* `HUMANITEC_ORG`
* `HUMANITEC_TOKEN`
