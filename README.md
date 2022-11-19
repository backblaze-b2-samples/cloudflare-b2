# Cloudflare Worker for Backblaze B2

Provide access to one or more private [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html) buckets via a [Cloudflare Worker](https://developers.cloudflare.com/workers/), so that objects in the bucket may only be publicly accessed via Cloudflare. The worker must be configured with a Backblaze application key with access to the buckets you wish to expose.

Informal testing suggests that there is negligible performance overhead imposed by signing the request.

## Configuration

You must configure `AWS_ACCESS_KEY_ID`, `AWS_S3_ENDPOINT` and `BUCKET_IN_PATH` in `wrangler.toml`.

```toml
[vars]
AWS_ACCESS_KEY_ID = "<your b2 application key id>"
AWS_S3_ENDPOINT = "<your S3 endpoint - e.g. s3.us-west-001.backblazeb2.com >"
# set BUCKET_IN_PATH to true, if clients pass the bucket name in the URL path, false otherwise
BUCKET_IN_PATH = true
```

You must also configure `AWS_SECRET_ACCESS_KEY` as a [secret](https://blog.cloudflare.com/workers-secrets-environment/):

```bash
echo "<your b2 application key>" | wrangler secret put AWS_SECRET_ACCESS_KEY
```

### Passing the Bucket Name

Set `BUCKET_IN_PATH` to `true` if clients will pass the bucket name in the URL path, for example:

```text
https://my.domain.com/my-bucket/path/to/file.png
```

In this configuration, you need only route `my.domain.com` to the worker. All buckets accessible by the application key will be available to clients.

Set `BUCKET_IN_PATH` to `false` if clients will pass the bucket name as a subdomain, for example:

```text
https://my-bucket.my.domain.com/path/to/file.png
```

Note that, in this configuration, you must configure a [Route](https://developers.cloudflare.com/workers/platform/triggers/routes) or a [Custom Domain](https://developers.cloudflare.com/workers/platform/triggers/custom-domains/) for each bucket name. You **cannot** simply route `*.my.domain.com/*` to your worker. 

## Wrangler

You can use this repository as a template for your own worker using [`wrangler`](https://github.com/cloudflare/wrangler):

```bash
wrangler generate projectname https://github.com/backblaze-b2-samples/cloudflare-b2
```

## Serverless

To deploy using serverless add a [`serverless.yml`](https://serverless.com/framework/docs/providers/cloudflare/) file.

## Acknowledgements

Based on [https://github.com/obezuk/worker-signed-s3-template](https://github.com/obezuk/worker-signed-s3-template)
