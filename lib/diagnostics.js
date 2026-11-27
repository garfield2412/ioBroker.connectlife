"use strict";

const { MetadataClient } = require("./metadata-client");
const { isIP } = require("node:net");

const SENSITIVE_KEY =
    /password|passwd|token|cookie|authorization|secret|apikey|accesskey|privatekey|credential|gmid|signature|^sign$|^id$|^sn$|^uid$|^puid$|uuid|serial|macaddress|^mac$|^ip$|ipaddress|hostname|email|login|account|owner|user|latitude|longitude|^lat$|^lon$|^lng$|gps|location|address|wifiid|deviceid|devicecode|sourceid|phone|room|nickname|devicename|devicenickname|ssid|network|homeid|house|^name$/i;

function anonymize(value, sensitiveValues = []) {
    const knownValues = sensitiveValues
        .filter(item => typeof item === "string" && item.length > 0)
        .sort((left, right) => right.length - left.length);
    let nodes = 0;
    const text = input => {
        let output = input;
        for (const known of knownValues) {
            output = output.split(known).join("[redacted]");
        }
        return output
            .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
            .replace(/https?:\/\/[^\s"<>]+/gi, "[redacted-url]")
            .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, "[redacted-token]")
            .replace(/\bpu\d{3}[a-z0-9]{12,}\b/gi, "[redacted-device]")
            .replace(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[redacted-email]")
            .replace(/\b(?:[a-f0-9]{2}[:-]){5}[a-f0-9]{2}\b/gi, "[redacted-mac]")
            .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[redacted-ip]")
            .replace(/(?<![a-z0-9:])(?:[a-f0-9]{0,4}:){2,}[a-f0-9:.]*(?:%[a-z0-9_.-]+)?/gi, candidate =>
                isIP(candidate) === 6 ? "[redacted-ip]" : candidate,
            )
            .replace(/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, "[redacted-id]");
    };
    const visit = (item, depth) => {
        if (++nodes > 10000 || depth > 12) {
            return "[truncated]";
        }
        if (typeof item === "string") {
            if (item.length > 16384) {
                return "[redacted-large-text]";
            }
            if (/^\s*[[{]/.test(item)) {
                try {
                    return JSON.stringify(visit(JSON.parse(item), depth + 1));
                } catch {
                    return "[redacted-unparseable-json]";
                }
            }
            if (/(?:token|password|passwd|cookie|authorization|secret)["'\s\\]*[:=]/i.test(item)) {
                return "[redacted-auth-text]";
            }
            return text(item);
        }
        if (Array.isArray(item)) {
            return item.slice(0, 1000).map(child => visit(child, depth + 1));
        }
        if (item && typeof item === "object") {
            return Object.fromEntries(
                Object.entries(item)
                    .slice(0, 1000)
                    .map(([key, child]) => [
                        text(key),
                        SENSITIVE_KEY.test(key.replace(/[^a-z0-9]/gi, "")) ? "[redacted]" : visit(child, depth + 1),
                    ]),
            );
        }
        return item;
    };
    return visit(value, 0);
}

class DiagnosticsCollector {
    constructor(client, now = Date.now) {
        this.client = client;
        this.metadata = new MetadataClient(client);
        this.now = now;
        this.cache = new Map();
        this.pending = new Map();
        this.blockedUntil = 0;
        this.closed = false;
        this.queue = Promise.resolve();
    }

    async collect(device) {
        if (this.closed) {
            return { ok: false, error: "cancelled" };
        }
        const key = JSON.stringify([device.puid, device.deviceTypeCode, device.deviceFeatureCode]);
        if (this.pending.has(key)) {
            return this.pending.get(key);
        }
        const cached = this.cache.get(key);
        if (cached && cached.expires > this.now()) {
            return { ...cached.report, cached: true };
        }
        if (this.blockedUntil > this.now()) {
            return {
                ok: false,
                cached: false,
                error: "rateLimited",
                retryAt: new Date(this.blockedUntil).toISOString(),
            };
        }
        const pending = this.queue.then(() => this.load(device));
        this.queue = pending.catch(() => undefined);
        this.pending.set(key, pending);
        try {
            return await pending;
        } finally {
            this.pending.delete(key);
        }
    }

    async load(device) {
        const report = {
            schemaVersion: 1,
            ok: true,
            cached: false,
            fetchedAt: new Date(this.now()).toISOString(),
            queries: {},
        };
        let stop = false;
        for (const query of ["properties", "staticData", "selfCheck"]) {
            if (stop || this.blockedUntil > this.now()) {
                report.ok = false;
                report.queries[query] = { status: "skipped" };
                if (this.blockedUntil > this.now()) {
                    report.retryAt = new Date(this.blockedUntil).toISOString();
                }
                continue;
            }
            try {
                const result = await this.metadata.query(query, device);
                report.queries[query] = {
                    status: "ok",
                    data: anonymize(result, [
                        device.puid,
                        device.deviceId,
                        device.wifiId,
                        device.deviceNickName,
                        device.roomName,
                        this.client.login,
                        this.client.password,
                        this.client.accessToken,
                        this.client.refreshToken,
                    ]),
                };
            } catch (error) {
                report.ok = false;
                const knownKinds = [
                    "invalidRequest",
                    "missingFeatureCode",
                    "authentication",
                    "rateLimited",
                    "unsupported",
                    "forbidden",
                    "transport",
                    "invalidResponse",
                    "apiError",
                    "cancelled",
                ];
                const kind = knownKinds.includes(error.kind) ? error.kind : "internal";
                report.queries[query] = {
                    status: kind,
                    ...(Number.isInteger(error.httpStatus) ? { httpStatus: error.httpStatus } : {}),
                    ...(/^\d{1,12}$/.test(String(error.apiCode)) ? { apiCode: String(error.apiCode) } : {}),
                };
                if (["rateLimited", "authentication", "forbidden", "transport", "cancelled"].includes(kind)) {
                    stop = true;
                }
                if (kind === "rateLimited") {
                    this.blockedUntil = this.now() + Math.max(60000, error.retryAfterMs || 0);
                    report.retryAt = new Date(this.blockedUntil).toISOString();
                }
            }
        }
        // Only already anonymized reports enter the cache. No request payloads or exceptions are retained.
        const key = JSON.stringify([device.puid, device.deviceTypeCode, device.deviceFeatureCode]);
        if (!this.closed) {
            this.cache.set(key, { report, expires: this.now() + (report.ok ? 300000 : 60000) });
        }
        return report;
    }

    close() {
        this.closed = true;
        this.metadata.close();
        this.cache.clear();
    }
}

module.exports = { anonymize, DiagnosticsCollector };
