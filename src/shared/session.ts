var deviceId: string | null = null;
var userAgent: string | null = null;
var cookieJar: Record<string, Record<string, string>> = {};

var USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
];

function randomHex(len: number): string {
  var chars = "0123456789abcdef";
  var out = "";
  for (var i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * 16));
  }
  return out;
}

export function getDeviceId(): string {
  if (deviceId === null) {
    deviceId = randomHex(16);
  }
  return deviceId;
}

export function getUserAgent(): string {
  if (userAgent === null) {
    userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }
  return userAgent;
}

function domainOf(url: string): string {
  var m = url.match(/^https?:\/\/([^\/]+)/);
  return m ? m[1] : "";
}

export function setCookies(url: string, setCookieHeader: string[] | string | undefined): void {
  if (!setCookieHeader) return;
  var domain = domainOf(url);
  if (!domain) return;
  var list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  if (!cookieJar[domain]) cookieJar[domain] = {};
  for (var i = 0; i < list.length; i++) {
    var raw = list[i];
    var firstPair = raw.split(";")[0];
    var eq = firstPair.indexOf("=");
    if (eq <= 0) continue;
    var name = firstPair.substring(0, eq).trim();
    var value = firstPair.substring(eq + 1).trim();
    cookieJar[domain][name] = value;
  }
}

export function getCookieHeader(url: string): string {
  var domain = domainOf(url);
  var jar = cookieJar[domain];
  var pairs: string[] = [];
  pairs.push("device_id=" + getDeviceId());
  if (jar) {
    for (var k in jar) {
      if (k === "device_id") continue;
      pairs.push(k + "=" + jar[k]);
    }
  }
  return pairs.join("; ");
}

export function resetSession(): void {
  deviceId = null;
  userAgent = null;
  cookieJar = {};
}
