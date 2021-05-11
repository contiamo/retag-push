# retag and push

## Publish a distribution

Actions are run from GitHub repos so we will checkin the packed dist folder.

Then run [ncc](https://github.com/zeit/ncc) and push the results:
```bash
$ npm run package
$ git add dist
$ git commit -a -m "prod dependencies"
```

## Usage:

This action is a small wrapper around `docker tag` and `docker push` which allows you to use
to split the `build` and the `push` into two steps. We use this so that we can run image security
scans before we push images to any registries, like this:


```yaml
name: test
on:
  # push:
  pull_request:
    types:
      - synchronize
      - opened
      - reopened

jobs:
  # Label of the container job
  tests:
    # Containers must run in Linux based operating systems
    runs-on: ubuntu-latest
    steps:
      # Downloads a copy of the code in your repository before running CI tests
      - name: Check out repository code
        uses: actions/checkout@v2
      - uses: actions/setup-go@v1
        with:
          go-version: '1.16'
      - name: Get Short SHA
        id: vars
        run: echo "::set-output name=sha_short::$(git rev-parse --short HEAD)"
      # build phase
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v1
      - name: Login to Docker Registry
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - name: Build local docker image
        uses: docker/build-push-action@v2
        with:
          context: .
          file: ./Dockerfile
          push: false
          load: true
          cache-from: type=local,src=/tmp/.buildx-cache
          cache-to: type=local,dest=/tmp/.buildx-cache
          tags: |
            repo:${{ steps.vars.outputs.sha_short }}
      - name: Scan image
        id: scan
        uses: anchore/scan-action@v2
        with:
          debug: false
          fail-build: true
          severity-cutoff: critical
          image: "repo:${{ steps.vars.outputs.sha_short }}"

      # publish phase
      - name: Push PR Preview image
        uses: contiamo/retag-push@main
        with:
          source: repo:${{ steps.vars.outputs.sha_short }}
          target: |
            repo-pr:${{ github.event.pull_request.number }}
            repo-pr:${{ steps.vars.outputs.sha_short }}
```