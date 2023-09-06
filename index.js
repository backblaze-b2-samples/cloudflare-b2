//
// Proxy Backblaze S3 compatible API requests, sending notifications to a webhook
//
// Adapted from https://github.com/obezuk/worker-signed-s3-template
//
import { AwsClient } from 'aws4fetch'

// These headers appear in the request, but are not passed upstream
const UNSIGNABLE_HEADERS = [
    'x-forwarded-proto',
    'x-real-ip',
]

// Filter out cf-* and any other headers we don't want to include in the signature
function filterHeaders(headers) {
    return Array.from(headers.entries())
      .filter(pair => !UNSIGNABLE_HEADERS.includes(pair[0]) && !pair[0].startsWith('cf-'));
}

async function handleRequest(event, client) {
    const request = event.request;

    // Only allow GET and HEAD methods
    if (!['GET', 'HEAD'].includes(request.method)){
        return new Response(null, {
            status: 405,
            statusText: "Method Not Allowed"
        });
    }

    const url = new URL(request.url);

    // Remove leading slashes from path
    let path = url.pathname.replace(/^\//, '');
    // Remove trailing slashes
    path = path.replace(/\/$/, '');
    // Split the path into segments
    const pathSegments = path.split('/');

    if (ALLOW_LIST_BUCKET !== "true") {
        // Don't allow list bucket requests
        if ((BUCKET_NAME === "$path" && pathSegments.length < 2) // https://endpoint/bucket-name/
            || (BUCKET_NAME !== "$path" && path.length === 0)) {   // https://bucket-name.endpoint/ or https://endpoint/
            return new Response(null, {
                status: 404,
                statusText: "Not Found"
            });
        }
    }

    // Set upstream target hostname.
    switch (BUCKET_NAME) {
        case "$path":
            // Bucket name is initial segment of URL path
            url.hostname = B2_ENDPOINT;
            break;
        case "$host":
            // Bucket name is initial subdomain of the incoming hostname
            url.hostname = url.hostname.split('.')[0] + '.' + B2_ENDPOINT;
            break;
        default:
            // Bucket name is specified in the BUCKET_NAME variable
            url.hostname = BUCKET_NAME + "." + B2_ENDPOINT;
            break;
    }

    // Certain headers, such as x-real-ip, appear in the incoming request but
    // are removed from the outgoing request. If they are in the outgoing
    // signed headers, B2 can't validate the signature.
    const headers = filterHeaders(request.headers);

    // Sign the outgoing request
    const signedRequest = await client.sign(url.toString(), {
        method: request.method,
        headers: headers,
        body: request.body
    });

    // Send the signed request to B2, returning the upstream response
    return fetch(signedRequest);
}


// Extract the region from the endpoint
const endpointRegex = /^s3\.([a-zA-Z0-9-]+)\.backblazeb2\.com$/;
const [ , aws_region] = B2_ENDPOINT.match(endpointRegex);

// Create an S3 API client that can sign the outgoing request
const client = new AwsClient({
    "accessKeyId": B2_APPLICATION_KEY_ID,
    "secretAccessKey": B2_APPLICATION_KEY,
    "service": "s3",
    "region": aws_region,
});

addEventListener('fetch', function(event) {
    event.respondWith(handleRequest(event, client))
});
