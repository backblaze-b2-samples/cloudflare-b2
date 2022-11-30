# Cloudflare Worker for Backblaze B2

Provide access to one or more private [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html) buckets via a [Cloudflare Worker](https://developers.cloudflare.com/workers/), so that objects in the bucket may only be publicly accessed via Cloudflare. The worker must be configured with a Backblaze application key with access to the buckets you wish to expose.

Informal testing suggests that there is negligible performance overhead imposed by signing the request.

## Configuration

You must configure `B2_APPLICATION_KEY_ID`, `B2_ENDPOINT` and `BUCKET_NAME` in `wrangler.toml`.

```toml
[vars]
B2_APPLICATION_KEY_ID = "<your b2 application key id>"
B2_ENDPOINT = "<your S3 endpoint - e.g. s3.us-west-001.backblazeb2.com >"
# Set BUCKET_NAME to:
#   "A Backblaze B2 bucket name" - direct all requests to the specified bucket
#   "$path" - use the initial segment in the incoming URL path as the bucket name
#           e.g. https://images.example.com/bucket-name/path/to/object.png
#   "$host" - use the initial subdomain in the hostname as the bucket name
#           e.g. https://bucket-name.images.example.com/path/to/object.png
BUCKET_NAME = "$path"
# Backblaze B2 buckets with public-read visibility do not allow anonymous clients
# to list the bucket’s objects. You can allow or deny this functionality in the
# Worker via ALLOW_LIST_BUCKET
ALLOW_LIST_BUCKET = "<true, if you want to allow clients to list objects, otherwise false>"
```

You must also configure `B2_APPLICATION_KEY` as a [secret](https://blog.cloudflare.com/workers-secrets-environment/):

```bash
echo "<your b2 application key>" | wrangler secret put B2_APPLICATION_KEY
```

### Passing the Bucket Name

Set `BUCKET_NAME` to:

* A Backblaze B2 bucket name, such as `my-bucket`, to direct all incoming requests to the specified bucket.
* `$path` to use the initial segment in the incoming URL path as the bucket name, e.g. `https://my.domain.com/my-bucket/path/to/file.png`
* `$host` to use the initial subdomain in the incoming URL hostname as the bucket name, e.g. `https://my-bucket.my.domain.com/path/to/file.png`

If you are using the default `*.workers.dev` subdomain, you must either specify a bucket name in the configuration, or set `BUCKET_NAME` to `$path` and pass the bucket name in the path.

Note that, if you use the `$host` configuration, you must configure a [Route](https://developers.cloudflare.com/workers/platform/triggers/routes) or a [Custom Domain](https://developers.cloudflare.com/workers/platform/triggers/custom-domains/) for each bucket name. You **cannot** simply route `*.my.domain.com/*` to your worker. 

## Wrangler

You can use this repository as a template for your own worker using [`wrangler`](https://github.com/cloudflare/wrangler):

```bash
wrangler generate projectname https://github.com/backblaze-b2-samples/cloudflare-b2
```

## Serverless

To deploy using serverless add a [`serverless.yml`](https://serverless.com/framework/docs/providers/cloudflare/) file.

## Acknowledgements

Based on [https://github.com/obezuk/worker-signed-s3-template](https://github.com/obezuk/worker-signed-s3-template)
