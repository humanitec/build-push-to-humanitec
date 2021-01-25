# Build Push to Humanitec Action

This action builds a container image from a Dockerfile, then pushes the image to the Humanitec registry and finally
notifies the Humanitec platform that a new build is available.

## Inputs

### `humanitec-token`
**Required** The API token provided by the platform. This should be stored as a GitHub Repository Secret and then passed
to the action using a variable expansion. For example, if the token is store as a secret with name `HUMANITEC_TOKEN`,
the following code should be used to pass it to the action:
```

    uses: humanitec/build-push-to-humaniteic@v1
      with:
        humanitec-token: ${{ secrets.HUMANITEC_TOKEN }}
        organization: awesome-company

```
### `organization`
**Required** The name of the organization that the image will be built for.

### `image-name`
_Optional_ The name you want to refer to the image to in the Humanitec Platform. The id must be all lowercase letters,
numbers and the "-" symbol. It cannot start or end with "-".

### `file`
_Optional_ A path to an alternative Dockerfile.

### `context`
_Optional_ Context path. Defaults to ".".

### `dockerfile`
_Optional_ The same as `context`.

### `tag`
_Optional_ Define your own tag for the docker image to be tagged with.
```

    uses: humanitec/build-push-to-humaniteic@v1
      with:
        humanitec-token: ${{ secrets.HUMANITEC_TOKEN }}
        organization: awesome-company
        tag: latest

```


### `auto-tag`
_Optional_ Use `auto-tag` when you want to push tags/release by their git name (e.g. `refs/tags/MY_TAG_NAME`).  
> CAUTION: Images produced by this feature can be overwritten by branches with the same name - without a way to restore.
```

    uses: humanitec/build-push-to-humaniteic@v1
      with:
        humanitec-token: ${{ secrets.HUMANITEC_TOKEN }}
        organization: awesome-company
        auto-tag: true

```

### `additional-docker-arguments`
_Optional_ Use `additional-docker-arguments` if you need to provide additional arguments (e.g.,build arguments) to the docker build process.
```

    uses: humanitec/build-push-to-humaniteic@v1
      with:
        humanitec-token: ${{ secrets.HUMANITEC_TOKEN }}
        organization: awesome-company
        additional-docker-arguments: --build-arg env=staging

```

## Outputs

_None._

## Example usage

```

uses: humanitec/build-push-to-humanitec@v1
  with:
    humanitec-token: ${{ secret.HUMANITEC_TOKEN }}
    organization: awesome-company

```
