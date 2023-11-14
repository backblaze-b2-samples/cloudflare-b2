# Cloudflare Worker for Backblaze B2

Provide access to one or more private [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html) buckets via a [Cloudflare Worker](https://developers.cloudflare.com/workers/), so that objects in the bucket may only be publicly accessed via Cloudflare. The worker must be configured with a Backblaze application key with access to the buckets you wish to expose.

Informal testing suggests that there is negligible performance overhead imposed by signing the request.

## Worker Configuration

Copy `wrangler.toml.template` to `wrangler.toml` and configure `B2_APPLICATION_KEY_ID`, `B2_ENDPOINT` and `BUCKET_NAME`. You may also configure `ALLOWED_HEADERS` to restrict the set of headers that will be signed and included in the upstream request to Backblaze B2.

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
# If set, these headers will be included in the signed upstream request
# alongside the minimal set of headers required for an AWS v4 signature:
# "authorization", "x-amz-content-sha256" and "x-amz-date".
#
# Note that, if "x-amz-content-sha256" is not included in ALLOWED_HEADERS, then
# any value supplied in the incoming request is discarded and
# "x-amz-content-sha256" will be set to "UNSIGNED-PAYLOAD".
#
# If you set ALLOWED_HEADERS, it is your responsibility to ensure that the
# list of headers that you specify supports the functionality that your client
# apps use, for example, "range". The list below is a suggested starting point.
#
# Note that HTTP headers are not case-sensitive. "host" will match "host",
# "Host" and "HOST".
#ALLOWED_HEADERS = [
#    "content-type",
#    "date",
#    "host",
#    "if-match",
#    "if-modified-since",
#    "if-none-match",
#    "if-unmodified-since",
#    "range",
#    "x-amz-content-sha256",
#    "x-amz-date",
#    "x-amz-server-side-encryption-customer-algorithm",
#    "x-amz-server-side-encryption-customer-key",
#    "x-amz-server-side-encryption-customer-key-md5"
#]
```

You must also configure `B2_APPLICATION_KEY` as a [secret](https://blog.cloudflare.com/workers-secrets-environment/):

```bash
echo "<your b2 application key>" | wrangler secret put B2_APPLICATION_KEY
```

### Running in Wrangler's Local Server

Wrangler's local server loads configuration from `wrangler.toml`, but cannot access secrets. Instead, the local server
loads additional configuration from `.dev.vars`.

Copy `.dev.vars.template` to `.dev.vars` and configure `B2_APPLICATION_KEY`:

````toml
# Configuration for running the app in local dev mode
B2_APPLICATION_KEY = "<your b2 application key>"
````

### Passing the Bucket Name

Set `BUCKET_NAME` to:

* A Backblaze B2 bucket name, such as `my-bucket`, to direct all incoming requests to the specified bucket.
* `$path` to use the initial segment in the incoming URL path as the bucket name, e.g. `https://my.domain.com/my-bucket/path/to/file.png`
* `$host` to use the initial subdomain in the incoming URL hostname as the bucket name, e.g. `https://my-bucket.my.domain.com/path/to/file.png`

If you are using the default `*.workers.dev` subdomain, you must either specify a bucket name in the configuration, or set `BUCKET_NAME` to `$path` and pass the bucket name in the path.

Note that, if you use the `$host` configuration, you must configure a [Route](https://developers.cloudflare.com/workers/platform/triggers/routes) or a [Custom Domain](https://developers.cloudflare.com/workers/platform/triggers/custom-domains/) for each bucket name. You **cannot** simply route `*.my.domain.com/*` to your worker. 

### Restricting Signed HTTP Headers in the Upstream Request

By default, all HTTP headers in the downstream request from the client are signed and included in the upstream request to Backlaze B2, except the following:

* Cloudflare headers with the prefix `cf-`, plus `x-forwarded-proto` and `x-real-ip`: these are set in the downstream request by Cloudflare, rather than by the client. In addition, `x-real-ip` is removed from the upstream request.
* `accept-encoding`: No matter what the client passes, Cloudflare sets `accept-encoding` in the incoming request to `gzip, br` and then modifies the outgoing request, setting `accept-encoding` to `gzip`. This breaks the AWS v4 signature.

If you wish to further restrict the set of headers that will be signed and included, you can configure `ALLOWED_HEADERS` in `wrangler.toml`. If `ALLOWED_HEADERS` is set, then the listed  headers will be included in the signed upstream request alongside the minimal set of headers required for an AWS v4 signature: `authorization`, `x-amz-content-sha256` and `x-amz-date`.

Note that, if `x-amz-content-sha256` is not included in `ALLOWED_HEADERS`, then any value supplied in the incoming request will be discarded and `x-amz-content-sha256` will be set to `UNSIGNED-PAYLOAD` in the outgoing request.

If you do set `ALLOWED_HEADERS`, it is your responsibility to ensure that the list of headers that you specify supports the functionality that your client apps use, for example, `range` for [HTTP range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests). The list below, the HTTP headers listed in the [AWS S3 GetObject documentation](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html) currently supported by Backblaze B2, is a suggested starting point:

ALLOWED_HEADERS = [
    "content-type",
    "date",
    "host",
    "if-match",
    "if-modified-since",
    "if-none-match",
    "if-unmodified-since",
    "range",
    "x-amz-content-sha256",
    "x-amz-date",
    "x-amz-server-side-encryption-customer-algorithm",
    "x-amz-server-side-encryption-customer-key",
    "x-amz-server-side-encryption-customer-key-md5"
]

Note that HTTP headers are not case-sensitive. `host` will match `host`, `Host` and `HOST`.

## Bucket Configuration

Since the bucket is private, the Cloudflare Worker signs each request to Backblaze B2 using the application key, and includes the signature in the request’s `Authorization` HTTP header. By default, [Cloudflare does not cache content](https://developers.cloudflare.com/cache/concepts/cache-control/#conditions) where the request contains the `Authorization` header, so you must set your bucket’s info to include a cache-control directive.

* Sign in to your Backblaze account.
* In the left navigation menu under B2 Cloud Storage, click **Buckets**.
* Locate your bucket in the list and click **Bucket Settings**.
* Set **Bucket Info** to `{"Cache-Control":"public"}`. If you wish, you can set additional [cache-control directives](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#directives), for example, to direct Cloudflare to cache each file for a day, you would set **Bucket Info** to `{"Cache-Control": "public, max-age=86400"}`.
* Click **Update Bucket**.

## Wrangler

You can use this repository as a template for your own worker using [`wrangler`](https://github.com/cloudflare/wrangler):

```bash
wrangler generate projectname https://github.com/backblaze-b2-samples/cloudflare-b2
```

## Serverless

To deploy using serverless add a [`serverless.yml`](https://serverless.com/framework/docs/providers/cloudflare/) file.

## Range Requests

When the worker forwards a range request for a large file (bigger than about 2 GB), Cloudflare may return the entire file, rather than the requested range. The worker includes logic adapted from [this Cloudflare Community reply](https://community.cloudflare.com/t/cloudflare-worker-fetch-ignores-byte-request-range-on-initial-request/395047/4) by [julian.cox](https://community.cloudflare.com/u/julian.cox) to abort and retry the request if the response to a range request does not contain the content-range header. 

## Acknowledgements

Based on [https://github.com/obezuk/worker-signed-s3-template](https://github.com/obezuk/worker-signed-s3-template)
