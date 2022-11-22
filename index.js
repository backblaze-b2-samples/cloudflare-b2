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

    // Don't allow clients to list the bucket contents!
    //
    // Remove leading slashes from path
    let path = url.pathname.replace(/^\//, '');
    // Remove trailing slashes
    path = path.replace(/\/$/, '');
    // Split the path into segments
    const pathSegments = path.split('/');
    // Now see if it's a list bucket request
    if ((BUCKET_IN_PATH && pathSegments[0].length < 2) // https://endpoint/bucket-name/
        || (!BUCKET_IN_PATH && path.length === 0)) {   // https://bucket-name.endpoint/
        return new Response(null, {
            status: 404,
            statusText: "Not Found"
        });
    }

    // Set upstream target hostname.
    url.hostname = BUCKET_IN_PATH
        ? AWS_S3_ENDPOINT
        : url.hostname.split('.')[0] + '.' + AWS_S3_ENDPOINT;

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
const [ , aws_region] = AWS_S3_ENDPOINT.match(endpointRegex);

// Create an S3 API client that can sign the outgoing request
const client = new AwsClient({
    "accessKeyId": AWS_ACCESS_KEY_ID,
    "secretAccessKey": AWS_SECRET_ACCESS_KEY,
    "service": "s3",
    "region": aws_region,
});

addEventListener('fetch', function(event) {
    event.respondWith(handleRequest(event, client))
});
