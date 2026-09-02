import { useEffect, useState } from "react";

/**
 * Mantra MFS110 / MFS100 fingerprint scanner hardware bridge (browser side).
 *
 * Supports:
 * 1. Mantra MFS110 L1 RD Service (UIDAI standard HTTP RD Service on ports 11100-11105)
 * 2. Mantra MFS100 / MFS110 Client Service (Local JSON API on ports 8004, 8005, 8003)
 *
 * Fully hardware-driven — simulation mode has been completely removed.
 */

export const MAX_FINGERS = 6;

export const FINGER_OPTIONS = [
  "Right thumb",
  "Right index",
  "Right middle",
  "Left thumb",
  "Left index",
  "Left middle",
] as const;

export type FingerRecord = {
  finger: string;
  template: string;
  quality: number;
  enrolled_at: string;
  serial?: string | undefined;
  nfc_no?: string | undefined;
  suid?: string | undefined;
};

export type CaptureOutcome =
  | { ok: true; template: string; quality: number; serial?: string | undefined; model?: string | undefined; driverType?: string | undefined }
  | { ok: false; error: string };

export type DeviceInfo = {
  connected: boolean;
  serial?: string | undefined;
  model?: string | undefined;
  status?: string | undefined;
  driverType?: "RDSERVICE" | "CLIENT" | undefined;
  port?: number | undefined;
};

type DiscoveredDevice = {
  base: string;
  type: "RDSERVICE" | "CLIENT";
  model: string;
  serial?: string | undefined;
  port: number;
};

const RD_PORTS = [11100, 11101, 11102, 11103, 11104, 11105];
const CLIENT_PORTS = [8004, 8005, 8003];

let cachedDevice: DiscoveredDevice | null = null;

function parseXmlAttribute(xml: string, tag: string, attr: string): string | null {
  const tagRegex = new RegExp(`<${tag}[^>]*>`, "i");
  const match = xml.match(tagRegex);
  if (!match) return null;
  const attrRegex = new RegExp(`${attr}=["']([^"']*)["']`, "i");
  const attrMatch = match[0].match(attrRegex);
  return attrMatch ? (attrMatch[1] ?? null) : null;
}

function parseParamValue(xml: string, paramName: string): string | null {
  const regex1 = new RegExp(`<Param[^>]*name=["']${paramName}["'][^>]*value=["']([^"']*)["']`, "i");
  const match1 = xml.match(regex1);
  if (match1 && match1[1]) return match1[1];
  const regex2 = new RegExp(`<Param[^>]*value=["']([^"']*)["'][^>]*name=["']${paramName}["']`, "i");
  const match2 = xml.match(regex2);
  if (match2 && match2[1]) return match2[1];
  return null;
}

function parseXmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match && match[1] ? match[1].trim() : null;
}

async function probeRDServiceUrl(base: string, port: number, timeoutMs = 800): Promise<DiscoveredDevice | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/rd/info`, {
      method: "DEVICEINFO",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const xml = await res.text();
    if (!xml.includes("DeviceInfo") && !xml.includes("RDService")) return null;

    const mi = parseXmlAttribute(xml, "DeviceInfo", "mi") || "MFS110";
    const serial = parseParamValue(xml, "srno") || parseParamValue(xml, "SerialNo") || undefined;

    return {
      base,
      type: "RDSERVICE",
      model: mi,
      serial,
      port,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Check if Mantra RD Service is available on a port (supports HTTPS and HTTP fallback) */
async function probeRDService(port: number, timeoutMs = 800): Promise<DiscoveredDevice | null> {
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  if (isHttps) {
    const httpsDev = await probeRDServiceUrl(`https://127.0.0.1:${port}`, port, timeoutMs);
    if (httpsDev) return httpsDev;
    return await probeRDServiceUrl(`http://127.0.0.1:${port}`, port, timeoutMs);
  }
  return await probeRDServiceUrl(`http://127.0.0.1:${port}`, port, timeoutMs);
}

async function probeClientServiceUrl(base: string, port: number, timeoutMs = 800): Promise<DiscoveredDevice | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/mfs100/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const info = (await res.json()) as Record<string, unknown>;
    const model = typeof info["Model"] === "string" ? info["Model"] : "MFS110";
    const serial = typeof info["SerialNo"] === "string" ? info["SerialNo"] : undefined;

    return {
      base,
      type: "CLIENT",
      model,
      serial,
      port,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Check if Mantra Client JSON service is available on a port (supports HTTPS and HTTP fallback) */
async function probeClientService(port: number, timeoutMs = 800): Promise<DiscoveredDevice | null> {
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  if (isHttps) {
    const httpsDev = await probeClientServiceUrl(`https://127.0.0.1:${port}`, port, timeoutMs);
    if (httpsDev) return httpsDev;
    return await probeClientServiceUrl(`http://127.0.0.1:${port}`, port, timeoutMs);
  }
  return await probeClientServiceUrl(`http://127.0.0.1:${port}`, port, timeoutMs);
}

/** Finds the active Mantra scanner device with fast parallel probing */
export async function findDevice(): Promise<DiscoveredDevice | null> {
  if (typeof window === "undefined") return null;

  // 1. Check cached device first if still responsive
  if (cachedDevice) {
    let live = null;
    if (cachedDevice.type === "RDSERVICE") live = await probeRDService(cachedDevice.port, 600);
    else live = await probeClientService(cachedDevice.port, 600);

    if (live) {
      cachedDevice = live;
      return live;
    }
    cachedDevice = null;
  }

  // 2. Parallel probe Client ports and RD Service ports
  const clientPromises = CLIENT_PORTS.map((port) => probeClientService(port, 800));
  const rdPromises = RD_PORTS.map((port) => probeRDService(port, 800));

  const results = await Promise.all([...clientPromises, ...rdPromises]);
  const found = results.find((dev): dev is DiscoveredDevice => dev !== null) ?? null;

  if (found) {
    cachedDevice = found;
  }

  return found;
}

export async function deviceInfo(): Promise<DeviceInfo> {
  const dev = await findDevice();
  if (!dev) return { connected: false };

  return {
    connected: true,
    model: dev.model || "MFS110",
    serial: dev.serial,
    status: "READY",
    driverType: dev.type,
    port: dev.port,
  };
}

/** React Hook for live Mantra MFS110 device status */
export function useMantraDevice(pollIntervalMs = 3000) {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const d = await deviceInfo();
        if (active) {
          setDevice(d);
          setChecking(false);
        }
      } catch {
        if (active) {
          setDevice({ connected: false });
          setChecking(false);
        }
      }
    };

    void check();
    const interval = setInterval(check, pollIntervalMs);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pollIntervalMs]);

  return { device, checking, isConnected: Boolean(device?.connected) };
}

/**
 * Real Fingerprint Capture on Mantra MFS110 / MFS100 hardware.
 * Strictly communicates with the connected device — no simulation mode.
 */
export async function captureFinger(
  quality = 60,
  timeoutSeconds = 10,
): Promise<CaptureOutcome> {
  const dev = await findDevice();
  if (!dev) {
    return {
      ok: false,
      error: "Mantra MFS110 scanner is not connected. Please verify USB connection and RD Service.",
    };
  }

  if (dev.type === "RDSERVICE") {
    // Mantra L1 RD Service capture request
    const pidOptionsXml = `<?xml version="1.0" encoding="UTF-8"?>
<PidOptions ver="1.0">
  <Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="${timeoutSeconds * 1000}" env="P" />
  <CustOpts></CustOpts>
</PidOptions>`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), (timeoutSeconds + 5) * 1000);

    try {
      const res = await fetch(`${dev.base}/rd/capture`, {
        method: "CAPTURE",
        headers: { "Content-Type": "text/xml" },
        body: pidOptionsXml,
        signal: controller.signal,
      });

      if (!res.ok) {
        return { ok: false, error: `RD Service returned HTTP ${res.status}. Check MFS110 driver.` };
      }

      const xml = await res.text();
      const errCode = parseXmlAttribute(xml, "Resp", "errCode") ?? "-1";
      const errInfo = parseXmlAttribute(xml, "Resp", "errInfo") ?? "Capture failed";
      const qScore = Number(parseXmlAttribute(xml, "Resp", "qScore") ?? 0);

      if (errCode !== "0") {
        return { ok: false, error: `Mantra MFS110: ${errInfo} (Code ${errCode})` };
      }

      const dataTag = parseXmlTag(xml, "Data");
      const hmacTag = parseXmlTag(xml, "Hmac");
      const template = dataTag || hmacTag || xml;

      return {
        ok: true,
        template,
        quality: qScore > 0 ? qScore : quality,
        serial: dev.serial,
        model: dev.model,
        driverType: "RDSERVICE",
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return { ok: false, error: "Scan timed out. Please place your finger firmly on the sensor." };
      }
      return { ok: false, error: "Communication error with Mantra MFS110 scanner." };
    } finally {
      clearTimeout(timer);
    }
  } else {
    // Mantra Client JSON API
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), (timeoutSeconds + 5) * 1000);
    try {
      const res = await fetch(`${dev.base}/mfs100/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Quality: quality, TimeOut: timeoutSeconds }),
        signal: controller.signal,
      });

      if (!res.ok) return { ok: false, error: "MFS Client service error." };
      const data = (await res.json()) as Record<string, unknown>;
      const code = Number(data["ErrorCode"] ?? -1);
      if (code !== 0) {
        return { ok: false, error: String(data["ErrorDescription"] ?? "Fingerprint capture failed.") };
      }
      const template = String(data["IsoTemplate"] ?? data["AnsiTemplate"] ?? "");
      if (!template) return { ok: false, error: "Scanner returned empty template." };

      return {
        ok: true,
        template,
        quality: Number(data["Quality"] ?? 0),
        serial: dev.serial,
        model: dev.model,
        driverType: "CLIENT",
      };
    } catch {
      return { ok: false, error: "Mantra scanner did not respond. Check cable." };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** 1:1 verification of a probe template against stored template. */
export async function matchTemplate(probe: string, gallery: string): Promise<boolean> {
  if (!probe || !gallery) return false;
  if (probe === gallery) return true;

  // Try local Mantra Client Service matcher (ports 8004, 8005, 8003)
  const portsToTry = [8004, 8005, 8003];
  for (const p of portsToTry) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`http://127.0.0.1:${p}/mfs100/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ProbTemplate: probe, GalleryTemplate: gallery, GallaryTemplate: gallery }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        console.log(`Mantra Match Result (port ${p}):`, data);
        if (data["Status"] === true || data["Status"] === "true") {
          return true;
        }
        // If the service returned a response and Status is false, then this finger definitely does not match
        return false;
      }
    } catch {
      // Port not answering or timed out, try next
    }
  }

  // Exact template comparison fallback
  return probe === gallery;
}

/** 1:N identification against enrolled gallery */
export async function identify<T extends { templates: string[] }>(
  probe: string,
  gallery: T[],
): Promise<T | null> {
  for (const entry of gallery) {
    for (const template of entry.templates) {
      if (await matchTemplate(probe, template)) return entry;
    }
  }
  return null;
}

export function toFingerRecords(value: unknown): FingerRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((f) => {
    if (!f || typeof f !== "object") return [];
    const rec = f as Partial<FingerRecord>;
    if (typeof rec.finger !== "string") return [];
    return [
      {
        finger: rec.finger,
        template: typeof rec.template === "string" ? rec.template : "",
        quality: Number(rec.quality ?? 0),
        enrolled_at: String(rec.enrolled_at ?? ""),
        serial: typeof rec.serial === "string" ? rec.serial : undefined,
      },
    ];
  });
}
