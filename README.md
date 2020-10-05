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
**Required** The name of the organization that the module will be built for.

### `module-name`
_Optional_ The name you want to refer to the module to in the Humanitec Platform. The id must be all lowercase letters,
numbers and the "-" symbol. It cannot start or end with "-".

### `dockerfile`
_Optional_ Directory containing the Dockerfile. Defaults to the root of repository.

### `tag`
_Optional_ Define your own tag for the docker image to be tagged with.
```

    uses: humanitec/build-push-to-humaniteic@v1
      with:
        humanitec-token: ${{ secrets.HUMANITEC_TOKEN }}
        organization: awesome-company
        tag: latest

```


### `tag_name`
_Optional_ Use `tag_name` when you want to push tags/release by their git name (e.g. `refs/tags/MY_TAG_NAME`).  
> CAUTION: Images produced by this feature can be override by branches with the same name - without a way to restore.
```

    uses: humanitec/build-push-to-humaniteic@v1
      with:
        humanitec-token: ${{ secrets.HUMANITEC_TOKEN }}
        organization: awesome-company
        tag_name: true

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
