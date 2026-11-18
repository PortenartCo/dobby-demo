// Test transport for the real local Storage service. Never reads app credentials.
import assert from 'node:assert/strict';

export const familyBucket = 'dobby-family-files';
const objectPath = (name, bucket) => `${encodeURIComponent(bucket)}/${name.split('/').map(encodeURIComponent).join('/')}`;

export function nativeTransport(fixture, user = 2) {
 const base = new URL(fixture.url);
 assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Only loopback Storage is allowed');
 assert.equal(base.protocol, 'http:');
 const bearer = typeof user === 'number' ? fixture.token(user) : user;
 async function request(method, path, { json, body, headers = {}, anonymous = false } = {}) {
  const url = new URL(path, base);
  assert.equal(url.origin, base.origin, 'Cross-origin request refused');
  const response = await fetch(url, {
   method, redirect: 'error', signal: AbortSignal.timeout(15000),
   headers: {
    ...(anonymous || !bearer ? {} : { Authorization: `Bearer ${bearer}` }),
    ...(json === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers,
   }, body: json === undefined ? body : JSON.stringify(json),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const text = bytes.toString('utf8');
  let data; try { data = JSON.parse(text); } catch { /* File bytes need not be JSON. */ }
  // Callers must never log data from a signing response or its request URL.
  return { status: response.status, ok: response.ok, bytes, text, data };
 }
 return {
  request,
  upload: (name, body, { bucket = familyBucket, upsert = false } = {}) => request('POST', `/object/${objectPath(name, bucket)}`, {
   body, headers: { 'Content-Type': 'application/pdf', 'x-upsert': String(upsert) },
  }),
  update: (name, body, bucket = familyBucket) => request('PUT', `/object/${objectPath(name, bucket)}`, { body, headers: { 'Content-Type': 'application/pdf' } }),
  download: (name, bucket = familyBucket) => request('GET', `/object/authenticated/${objectPath(name, bucket)}`),
  info: (name, bucket = familyBucket) => request('GET', `/object/info/authenticated/${objectPath(name, bucket)}`),
  head: (name, bucket = familyBucket) => request('HEAD', `/object/info/authenticated/${objectPath(name, bucket)}`),
  list: (prefix, bucket = familyBucket) => request('POST', `/object/list/${encodeURIComponent(bucket)}`, { json: { prefix, limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } } }),
  copy: (sourceKey, destinationKey, bucket = familyBucket, destinationBucket = bucket) => request('POST', '/object/copy', { json: { bucketId: bucket, sourceKey, destinationKey, destinationBucket } }),
  move: (sourceKey, destinationKey, bucket = familyBucket, destinationBucket = bucket) => request('POST', '/object/move', { json: { bucketId: bucket, sourceKey, destinationKey, destinationBucket } }),
  remove: (names, bucket = familyBucket) => request('DELETE', `/object/${encodeURIComponent(bucket)}`, { json: { prefixes: names } }),
  removeOne: (name, bucket = familyBucket) => request('DELETE', `/object/${objectPath(name, bucket)}`),
  sign: (name, bucket = familyBucket) => request('POST', `/object/sign/${objectPath(name, bucket)}`, { json: { expiresIn: 3600 } }),
  signMany: (paths, bucket = familyBucket) => request('POST', `/object/sign/${encodeURIComponent(bucket)}`, { json: { expiresIn: 3600, paths } }),
  signUpload: (name, bucket = familyBucket) => request('POST', `/object/upload/sign/${objectPath(name, bucket)}`, { json: {} }),
  signedDownload: path => request('GET', path, { anonymous: true }),
  signedUpload: (name, token, body, bucket = familyBucket) => request('PUT', `/object/upload/sign/${objectPath(name, bucket)}?token=${encodeURIComponent(token)}`, { body, anonymous: true, headers: { 'Content-Type': 'application/pdf' } }),
 };
}
