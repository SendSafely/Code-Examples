const crypto = require("node:crypto");

/**
 * Calculate SendSafely request signature
 */
function calculateSignature(apiKey, apiSecret, path, body, timestamp) {
  let data = apiKey + path + timestamp + body;
  return crypto.createHmac("sha256", apiSecret).update(data).digest("hex");
}

/**
 * SendSafely request wrapper – axios-compatible shape, implemented with fetch
 */
async function sendsafelyThen(credentials, method, path, config = {}) {
  const { ssHost, ssApiKey, ssApiSecret } = credentials;
  let { body = '""', rowIndex, pageSize, params = {} } = config;

  let internalParams = {};

  // Copy params if provided
  if (params) {
    internalParams = { ...params };
  }
  if (rowIndex !== undefined) {
    internalParams.rowIndex = rowIndex;
  }
  if (pageSize !== undefined) {
    internalParams.pageSize = pageSize;
  }
  if (body === undefined || body === null) {
    body = "";
  }
  // Build full URL with query params
  const urlObj = new URL(path, ssHost);
  Object.entries(internalParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlObj.searchParams.set(key, value);
    }
  });
  const url = urlObj.toString();

  const timestamp = `${new Date().toISOString().substr(0, 19)}+0000`;
  const signature = calculateSignature(ssApiKey, ssApiSecret, path, body, timestamp);

  const headers = {
    "ss-api-key": ssApiKey,
    "ss-api-secret": ssApiSecret,
    "ss-request-signature": signature,
    "ss-request-timestamp": timestamp,
    "content-type": "application/json"
  };

  const requestInit = {
    method,
    headers,
    // only send body for non-GET methods
    body:
      method.toUpperCase() === "GET"
        ? undefined
        : (typeof body === "string" ? body : JSON.stringify(body))
  };

  const res = await fetch(url, requestInit);

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    // Fallback if not JSON
    data = text;
  }

  // Return something close to an axios response
  return {
    data,
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    config: {
      url,
      method,
      params: internalParams,
      data: body
    },
    request: null
  };
}

module.exports = sendsafelyThen;
