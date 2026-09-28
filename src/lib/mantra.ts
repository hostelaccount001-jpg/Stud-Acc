import { useEffect, useState } from "react";

/**
 * Mantra MFS100 fingerprint scanner hardware bridge (browser side).
 *
 * Supports two distinct Mantra driver modes:
 * 1. Mantra MFS100 RD Service (UIDAI standard HTTP RD Service on ports 11100-11105)
 * 2. Mantra MFS100 Client Service (Local JSON API on ports 8004, 8005, 8003)
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
  | {
      ok: true;
      template: string;
      quality: number;
      serial?: string | undefined;
      model?: string | undefined;
      driverType?: string | undefined;
    }
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
const CLIENT_PORTS = [8031, 8032, 8004, 8005, 8003];

let cachedDevice: DiscoveredDevice | null = null;
let isCaptureInFlight = false;

const MFS100_CLIENT_BASE = "http://127.0.0.1:8003";

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

async function probeRDServiceUrl(
  base: string,
  port: number,
  timeoutMs = 600,
): Promise<DiscoveredDevice | null> {
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

    const mi = parseXmlAttribute(xml, "DeviceInfo", "mi") || "MFS100";
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

/** Check if Mantra RD Service is available on a port */
async function probeRDService(port: number, timeoutMs = 600): Promise<DiscoveredDevice | null> {
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  if (isHttps) {
    const httpsDev = await probeRDServiceUrl(`https://127.0.0.1:${port}`, port, timeoutMs);
    if (httpsDev) return httpsDev;
    return await probeRDServiceUrl(`http://127.0.0.1:${port}`, port, timeoutMs);
  }
  return await probeRDServiceUrl(`http://127.0.0.1:${port}`, port, timeoutMs);
}

async function probeClientServiceUrl(
  base: string,
  port: number,
  timeoutMs = 600,
): Promise<DiscoveredDevice | null> {
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
    const model = typeof info["Model"] === "string" ? info["Model"] : "MFS100";
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

/** Check if Mantra Client JSON service is available on a port */
async function probeClientService(port: number, timeoutMs = 600): Promise<DiscoveredDevice | null> {
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  if (isHttps) {
    const httpsDev = await probeClientServiceUrl(`https://127.0.0.1:${port}`, port, timeoutMs);
    if (httpsDev) return httpsDev;
    return await probeClientServiceUrl(`http://127.0.0.1:${port}`, port, timeoutMs);
  }
  return await probeClientServiceUrl(`http://127.0.0.1:${port}`, port, timeoutMs);
}

/** Keep connection warm: probe official MFS100 port 8003 first without probing 11 ports every time */
export async function initMantraConnection(force = false): Promise<DiscoveredDevice | null> {
  if (cachedDevice && !force) return cachedDevice;

  // 1. Direct probe to official MFS100 Client Service (Port 8003) via 127.0.0.1 (avoids IPv6 DNS delay)
  const official = await probeClientService(8003, 500);
  if (official) {
    cachedDevice = official;
    return official;
  }

  // 2. Fallback probe across common Client Ports & RD Service
  return await findDevice();
}

/** Finds the active Mantra scanner device with fast parallel probing */
export async function findDevice(): Promise<DiscoveredDevice | null> {
  if (typeof window === "undefined") return null;

  // Check 8003 directly first
  const primary = await probeClientService(8003, 400);
  if (primary) {
    cachedDevice = primary;
    return primary;
  }

  // Parallel probe remaining Client ports and RD Service ports
  const otherClientPorts = [8004, 8005, 8032, 8031];
  const clientPromises = otherClientPorts.map((port) => probeClientService(port, 600));
  const rdPromises = RD_PORTS.map((port) => probeRDService(port, 600));

  const results = await Promise.all([...clientPromises, ...rdPromises]);
  const found = results.find((dev): dev is DiscoveredDevice => dev !== null) ?? null;

  if (found) {
    cachedDevice = found;
  }

  return found;
}

export async function deviceInfo(): Promise<DeviceInfo> {
  const dev = await initMantraConnection();
  if (!dev) return { connected: false };

  return {
    connected: true,
    model: dev.model || "MFS100",
    serial: dev.serial,
    status: "READY",
    driverType: dev.type,
    port: dev.port,
  };
}

/** React Hook for live Mantra MFS100 device status */
export function useMantraDevice(pollIntervalMs = 5000) {
  const [device, setDevice] = useState<DeviceInfo | null>(() => {
    if (cachedDevice) {
      return {
        connected: true,
        model: cachedDevice.model || "MFS100",
        serial: cachedDevice.serial,
        status: "READY",
        driverType: cachedDevice.type,
        port: cachedDevice.port,
      };
    }
    return null;
  });
  const [checking, setChecking] = useState(() => !cachedDevice);

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

    if (!cachedDevice) {
      void check();
    }
    const interval = setInterval(check, pollIntervalMs);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pollIntervalMs]);

  return { device, checking, isConnected: Boolean(device?.connected) };
}

/**
 * Real Fingerprint Capture on Mantra MFS100 hardware.
 * Uses warm connection, in-flight guard, Quality 60, TimeOut in milliseconds.
 */
export async function captureFinger(quality = 60, timeoutMs = 10000): Promise<CaptureOutcome> {
  if (isCaptureInFlight) {
    return { ok: false, error: "Capture already in progress" };
  }

  isCaptureInFlight = true;
  try {
    const dev = cachedDevice || (await initMantraConnection());
    if (!dev) {
      return {
        ok: false,
        error: "Mantra scanner is not connected. Please connect USB cable.",
      };
    }

    if (dev.type === "CLIENT") {
      // Official Mantra Client JSON Service (port 8003)
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs + 1500);

      try {
        const res = await fetch(`${dev.base}/mfs100/capture`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Quality: quality, TimeOut: timeoutMs }),
          signal: controller.signal,
        });

        if (!res.ok) {
          cachedDevice = null;
          return { ok: false, error: "MFS100 Client service response error." };
        }

        const data = (await res.json()) as Record<string, unknown>;
        const code = Number(data["ErrorCode"] ?? -1);
        if (code !== 0) {
          return {
            ok: false,
            error: String(data["ErrorDescription"] ?? "Fingerprint capture failed."),
          };
        }

        const template = String(data["IsoTemplate"] ?? data["AnsiTemplate"] ?? "");
        if (!template) return { ok: false, error: "Scanner returned empty template." };

        return {
          ok: true,
          template,
          quality: Number(data["Quality"] ?? quality),
          serial: dev.serial,
          model: dev.model,
          driverType: "CLIENT",
        };
      } catch (err: unknown) {
        cachedDevice = null;
        if (err instanceof Error && err.name === "AbortError") {
          return { ok: false, error: "Capture timed out. Please place finger on sensor." };
        }
        return { ok: false, error: "Mantra scanner did not respond. Check cable." };
      } finally {
        clearTimeout(timer);
      }
    } else {
      // RD Service fallback
      const pidOptionsXml = `<?xml version="1.0" encoding="UTF-8"?>
<PidOptions ver="1.0">
  <Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="${timeoutMs}" env="P" />
  <CustOpts></CustOpts>
</PidOptions>`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs + 2000);

      try {
        const res = await fetch(`${dev.base}/rd/capture`, {
          method: "CAPTURE",
          headers: { "Content-Type": "text/xml" },
          body: pidOptionsXml,
          signal: controller.signal,
        });

        if (!res.ok) {
          cachedDevice = null;
          return { ok: false, error: `RD Service returned HTTP ${res.status}. Check Mantra driver.` };
        }

        const xml = await res.text();
        const errCode = parseXmlAttribute(xml, "Resp", "errCode") ?? "-1";
        const errInfo = parseXmlAttribute(xml, "Resp", "errInfo") ?? "Capture failed";
        const qScore = Number(parseXmlAttribute(xml, "Resp", "qScore") ?? 0);

        if (errCode !== "0") {
          return { ok: false, error: `Mantra: ${errInfo} (Code ${errCode})` };
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
      } catch {
        cachedDevice = null;
        return { ok: false, error: "Communication error with Mantra MFS100 scanner." };
      } finally {
        clearTimeout(timer);
      }
    }
  } finally {
    isCaptureInFlight = false;
  }
}

// Cached active matcher URL
let activeMatcherUrl: string | null = "http://127.0.0.1:8003/mfs100/match";
// MRU cache for recently verified students
const recentStudentIds = new Set<string>();

export function markRecentStudent(studentId: string) {
  if (!studentId) return;
  recentStudentIds.delete(studentId);
  recentStudentIds.add(studentId);
}

export function sortGalleryByRecency<T extends { id?: string }>(gallery: T[]): T[] {
  if (recentStudentIds.size === 0) return gallery;
  const recentOrder = Array.from(recentStudentIds).reverse();
  const recentMap = new Map<string, T>();
  const remaining: T[] = [];

  for (const s of gallery) {
    if (s.id && recentStudentIds.has(s.id)) {
      recentMap.set(s.id, s);
    } else {
      remaining.push(s);
    }
  }

  const prioritized: T[] = [];
  for (const id of recentOrder) {
    const s = recentMap.get(id);
    if (s) prioritized.push(s);
  }

  return [...prioritized, ...remaining];
}

export async function matchTemplateWithSignal(
  probe: string,
  gallery: string,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!probe || !gallery) return false;
  if (probe.trim() === gallery.trim()) return true;

  const payload = {
    ProbTemplate: probe,
    GalleryTemplate: gallery,
    probeTemplate: probe,
    galleryTemplate: gallery,
    probe,
    gallery,
  };

  const endpoints = activeMatcherUrl
    ? [activeMatcherUrl, "http://127.0.0.1:8003/mfs100/match", "http://127.0.0.1:8005/mfs100/match"]
    : ["http://127.0.0.1:8003/mfs100/match", "http://127.0.0.1:8005/mfs100/match", "http://127.0.0.1:8004/mfs100/match"];

  for (const url of Array.from(new Set(endpoints))) {
    if (signal?.aborted) return false;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        ...(signal ? { signal } : {}),
      });

      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        activeMatcherUrl = url;
        const verified =
          data["verified"] === true ||
          data["Status"] === true ||
          data["status"] === true ||
          data["Status"] === "true";
        const score = Number(data["Score"] ?? data["score"] ?? data["MatchingScore"] ?? 0);
        return verified || score >= 100;
      }
    } catch {
      if (signal?.aborted) return false;
    }
  }

  return false;
}

/** 1:1 verification of a probe template against stored template */
export async function matchTemplate(probe: string, gallery: string): Promise<boolean> {
  return matchTemplateWithSignal(probe, gallery);
}

/**
 * 1:N identification against enrolled gallery with:
 * 1. MRU priority ordering (repeat students checked first)
 * 2. Exact match fast path (0ms)
 * 3. Fast 1:N local endpoint (15-30ms)
 * 4. 8-worker concurrent matching pool with early exit on first match
 */
export async function identify<T extends { id?: string; templates: string[] }>(
  probe: string,
  rawGallery: T[],
  concurrency = 8,
): Promise<T | null> {
  if (!probe || !rawGallery || rawGallery.length === 0) return null;

  // Put recently matched students at the front (MRU priority)
  const gallery = sortGalleryByRecency(rawGallery);

  // 1. Fast exact-string check (0ms)
  const probeTrim = probe.trim();
  for (const entry of gallery) {
    for (const tmpl of entry.templates) {
      if (tmpl && tmpl.trim() === probeTrim) {
        if (entry.id) markRecentStudent(entry.id);
        return entry;
      }
    }
  }

  // 2. High-speed 1:N local endpoint if running (port 8005 / 8003)
  try {
    const res = await fetch("http://127.0.0.1:8005/identify-fingerprint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ probeTemplate: probe, gallery }),
      signal: AbortSignal.timeout(300),
    });
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      if (data["matched"] === true && data["student"]) {
        const matchedId = (data["student"] as { id?: string })?.id;
        const match = gallery.find((g) => g.id === matchedId);
        if (match) {
          if (match.id) markRecentStudent(match.id);
          return match;
        }
      }
    }
  } catch {}

  // 3. Concurrent Worker Pool with Early Exit (6 to 8 parallel requests)
  const items: { student: T; template: string }[] = [];
  for (const entry of gallery) {
    for (const tmpl of entry.templates) {
      if (tmpl && tmpl.trim().length > 0) {
        items.push({ student: entry, template: tmpl });
      }
    }
  }

  if (items.length === 0) return null;

  let matchedStudent: T | null = null;
  const abortController = new AbortController();
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length && !matchedStudent && !abortController.signal.aborted) {
      const idx = currentIndex++;
      if (idx >= items.length) break;
      const candidate = items[idx];
      if (!candidate) break;
      const { student, template } = candidate;

      try {
        const isMatch = await matchTemplateWithSignal(probe, template, abortController.signal);
        if (isMatch && !matchedStudent) {
          matchedStudent = student;
          abortController.abort();
          break;
        }
      } catch {
        // cancelled or failed
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers: Promise<void>[] = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  if (matchedStudent && (matchedStudent as { id?: string }).id) {
    markRecentStudent((matchedStudent as { id: string }).id);
  }

  return matchedStudent;
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
