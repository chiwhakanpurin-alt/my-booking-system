const encoder = new TextEncoder();

function base64urlEncode(str: string): string {
  return btoa(str)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const secretBytes = encoder.encode(secret);
  return await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJWT(payload: any, secret: string, expiresInSeconds = 3600 * 24): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const headerBase64 = base64urlEncode(JSON.stringify(header));
  const payloadBase64 = base64urlEncode(JSON.stringify(fullPayload));
  const tokenData = `${headerBase64}.${payloadBase64}`;

  const key = await getCryptoKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(tokenData)
  );

  const signatureBase64 = arrayBufferToBase64Url(signatureBuffer);
  return `${tokenData}.${signatureBase64}`;
}

export async function verifyJWT(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerBase64, payloadBase64, signatureBase64] = parts;
    const tokenData = `${headerBase64}.${payloadBase64}`;

    const key = await getCryptoKey(secret);
    const signatureBytes = base64UrlToArrayBuffer(signatureBase64);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(tokenData)
    );

    if (!isValid) return null;

    const payload = JSON.parse(base64urlDecode(payloadBase64));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}
