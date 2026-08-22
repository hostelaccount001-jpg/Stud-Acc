import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mantra-DG5I9wM5.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var RD_PORTS = [
	11100,
	11101,
	11102,
	11103,
	11104,
	11105
];
var CLIENT_PORTS = [
	8004,
	8005,
	8003
];
var cachedDevice = null;
function parseXmlAttribute(xml, tag, attr) {
	const tagRegex = new RegExp(`<${tag}[^>]*>`, "i");
	const match = xml.match(tagRegex);
	if (!match) return null;
	const attrRegex = new RegExp(`${attr}=["']([^"']*)["']`, "i");
	const attrMatch = match[0].match(attrRegex);
	return attrMatch ? attrMatch[1] ?? null : null;
}
function parseParamValue(xml, paramName) {
	const regex1 = new RegExp(`<Param[^>]*name=["']${paramName}["'][^>]*value=["']([^"']*)["']`, "i");
	const match1 = xml.match(regex1);
	if (match1 && match1[1]) return match1[1];
	const regex2 = new RegExp(`<Param[^>]*value=["']([^"']*)["'][^>]*name=["']${paramName}["']`, "i");
	const match2 = xml.match(regex2);
	if (match2 && match2[1]) return match2[1];
	return null;
}
function parseXmlTag(xml, tag) {
	const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
	const match = xml.match(regex);
	return match && match[1] ? match[1].trim() : null;
}
/** Check if Mantra RD Service is available on a port */
async function probeRDService(port, timeoutMs = 800) {
	const base = `http://127.0.0.1:${port}`;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(`${base}/rd/info`, {
			method: "DEVICEINFO",
			signal: controller.signal
		});
		if (!res.ok) return null;
		const xml = await res.text();
		if (!xml.includes("DeviceInfo") && !xml.includes("RDService")) return null;
		return {
			base,
			type: "RDSERVICE",
			model: parseXmlAttribute(xml, "DeviceInfo", "mi") || "MFS110",
			serial: parseParamValue(xml, "srno") || parseParamValue(xml, "SerialNo") || void 0,
			port
		};
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}
/** Check if Mantra Client JSON service is available on a port */
async function probeClientService(port, timeoutMs = 800) {
	const base = `http://127.0.0.1:${port}`;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(`${base}/mfs100/info`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{}",
			signal: controller.signal
		});
		if (!res.ok) return null;
		const info = await res.json();
		return {
			base,
			type: "CLIENT",
			model: typeof info["Model"] === "string" ? info["Model"] : "MFS110",
			serial: typeof info["SerialNo"] === "string" ? info["SerialNo"] : void 0,
			port
		};
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}
/** Finds the active Mantra scanner device with fast parallel probing */
async function findDevice() {
	if (typeof window === "undefined") return null;
	if (cachedDevice) {
		const live = cachedDevice.type === "RDSERVICE" ? await probeRDService(cachedDevice.port, 600) : await probeClientService(cachedDevice.port, 600);
		if (live) {
			cachedDevice = live;
			return live;
		}
		cachedDevice = null;
	}
	const rdPromises = RD_PORTS.map((port) => probeRDService(port, 800));
	const clientPromises = CLIENT_PORTS.map((port) => probeClientService(port, 800));
	const found = (await Promise.all([...rdPromises, ...clientPromises])).find((dev) => dev !== null) ?? null;
	if (found) cachedDevice = found;
	return found;
}
async function deviceInfo() {
	const dev = await findDevice();
	if (!dev) return { connected: false };
	return {
		connected: true,
		model: dev.model || "MFS110",
		serial: dev.serial,
		status: "READY",
		driverType: dev.type,
		port: dev.port
	};
}
/** React Hook for live Mantra MFS110 device status */
function useMantraDevice(pollIntervalMs = 3e3) {
	const [device, setDevice] = (0, import_react.useState)(null);
	const [checking, setChecking] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
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
		check();
		const interval = setInterval(check, pollIntervalMs);
		return () => {
			active = false;
			clearInterval(interval);
		};
	}, [pollIntervalMs]);
	return {
		device,
		checking,
		isConnected: Boolean(device?.connected)
	};
}
/**
* Real Fingerprint Capture on Mantra MFS110 / MFS100 hardware.
* Strictly communicates with the connected device — no simulation mode.
*/
async function captureFinger(quality = 60, timeoutSeconds = 10) {
	const dev = await findDevice();
	if (!dev) return {
		ok: false,
		error: "Mantra MFS110 scanner is not connected. Please verify USB connection and RD Service."
	};
	if (dev.type === "RDSERVICE") {
		const pidOptionsXml = `<?xml version="1.0" encoding="UTF-8"?>
<PidOptions ver="1.0">
  <Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="${timeoutSeconds * 1e3}" env="P" />
  <CustOpts></CustOpts>
</PidOptions>`;
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), (timeoutSeconds + 5) * 1e3);
		try {
			const res = await fetch(`${dev.base}/rd/capture`, {
				method: "CAPTURE",
				headers: { "Content-Type": "text/xml" },
				body: pidOptionsXml,
				signal: controller.signal
			});
			if (!res.ok) return {
				ok: false,
				error: `RD Service returned HTTP ${res.status}. Check MFS110 driver.`
			};
			const xml = await res.text();
			const errCode = parseXmlAttribute(xml, "Resp", "errCode") ?? "-1";
			const errInfo = parseXmlAttribute(xml, "Resp", "errInfo") ?? "Capture failed";
			const qScore = Number(parseXmlAttribute(xml, "Resp", "qScore") ?? 0);
			if (errCode !== "0") return {
				ok: false,
				error: `Mantra MFS110: ${errInfo} (Code ${errCode})`
			};
			const dataTag = parseXmlTag(xml, "Data");
			const hmacTag = parseXmlTag(xml, "Hmac");
			return {
				ok: true,
				template: dataTag || hmacTag || xml,
				quality: qScore > 0 ? qScore : quality,
				serial: dev.serial,
				model: dev.model
			};
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") return {
				ok: false,
				error: "Scan timed out. Please place your finger firmly on the sensor."
			};
			return {
				ok: false,
				error: "Communication error with Mantra MFS110 scanner."
			};
		} finally {
			clearTimeout(timer);
		}
	} else {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), (timeoutSeconds + 5) * 1e3);
		try {
			const res = await fetch(`${dev.base}/mfs100/capture`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					Quality: quality,
					TimeOut: timeoutSeconds
				}),
				signal: controller.signal
			});
			if (!res.ok) return {
				ok: false,
				error: "MFS Client service error."
			};
			const data = await res.json();
			if (Number(data["ErrorCode"] ?? -1) !== 0) return {
				ok: false,
				error: String(data["ErrorDescription"] ?? "Fingerprint capture failed.")
			};
			const template = String(data["IsoTemplate"] ?? data["AnsiTemplate"] ?? "");
			if (!template) return {
				ok: false,
				error: "Scanner returned empty template."
			};
			return {
				ok: true,
				template,
				quality: Number(data["Quality"] ?? 0),
				serial: dev.serial,
				model: dev.model
			};
		} catch {
			return {
				ok: false,
				error: "Mantra scanner did not respond. Check cable."
			};
		} finally {
			clearTimeout(timer);
		}
	}
}
function toFingerRecords(value) {
	if (!Array.isArray(value)) return [];
	return value.flatMap((f) => {
		if (!f || typeof f !== "object") return [];
		const rec = f;
		if (typeof rec.finger !== "string") return [];
		return [{
			finger: rec.finger,
			template: typeof rec.template === "string" ? rec.template : "",
			quality: Number(rec.quality ?? 0),
			enrolled_at: String(rec.enrolled_at ?? ""),
			serial: typeof rec.serial === "string" ? rec.serial : void 0
		}];
	});
}
//#endregion
export { toFingerRecords as n, useMantraDevice as r, captureFinger as t };
