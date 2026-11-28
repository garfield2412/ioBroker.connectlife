const assert = require("node:assert/strict");
const { MetadataClient } = require("./lib/metadata-client");
const { anonymize, DiagnosticsCollector } = require("./lib/diagnostics");

const device = { puid: "synthetic-device", deviceTypeCode: "030", deviceFeatureCode: "synthetic-feature", deviceNickName: "Private appliance", roomName: "Private room" };

function fixture() {
    const calls = [];
    const auth = [];
    let responder = async () => ({ data: { response: { resultCode: 0, data: { propertyKey: "machine_status" } } } });
    const client = {
        baseUrl: "https://example.invalid",
        login: "synthetic@example.invalid", password: "synthetic-password", accessToken: "synthetic-access", refreshToken: "synthetic-refresh",
        async ensureToken(force = false) { auth.push(force); return "synthetic-access"; },
        getCommonRequestData() { return { randStr: `nonce-${calls.length}` }; },
        getSignature(data) { assert.equal(data.accessToken, "synthetic-access"); return "synthetic-signature"; },
        http: {
            async get(url, options) { calls.push({ method: "GET", url, data: options.params, options }); return responder(); },
            async post(url, data, options) { calls.push({ method: "POST", url, data, options }); return responder(); },
        },
    };
    return { client, calls, auth, respond(fn) { responder = fn; } };
}

describe("Read-only metadata client", () => {
    it("uses only the four referenced read endpoints and the existing token/signature", async () => {
        const f = fixture();
        const api = new MetadataClient(f.client);
        for (const name of ["properties", "staticData", "selfCheck", "systemData"]) await api.query(name, device);
        assert.deepEqual(f.calls.map(call => [call.method, new URL(call.url).pathname]), [
            ["GET", "/clife-svc/get_property_list"], ["POST", "/clife-svc/pu/query_static_data"], ["POST", "/basic/self_check/info"],
            ["POST", "/clife-svc/pu/query_system_data"],
        ]);
        assert.equal(f.calls[0].data.deviceFeatureCode, device.deviceFeatureCode);
        assert.equal(f.calls[0].data.puid, undefined);
        assert.equal(f.calls[1].data.puid, device.puid);
        assert.equal(f.calls[2].data.noRecord, "1");
        assert.equal(f.calls[3].data.puid, device.puid);
        assert.equal(f.calls[3].data.noRecord, undefined);
        assert.equal(f.calls[3].data.properties, undefined);
        assert.ok(f.calls.every(call => call.data.sign === "synthetic-signature"));
        assert.deepEqual(f.auth, [false, false, false, false]);
    });

    it("renews a rejected token once and rebuilds the nonce before retrying", async () => {
        const f = fixture();
        f.respond(async () => ({ data: { response: f.calls.length === 1 ? { resultCode: 1, errorCode: 100026 } : { resultCode: 0, data: [] } } }));
        await new MetadataClient(f.client).query("staticData", device);
        assert.deepEqual(f.auth, [false, true, false]);
        assert.notEqual(f.calls[0].data.randStr, f.calls[1].data.randStr);
    });

    it("bounds repeated token and nonce errors instead of recursive retries", async () => {
        for (const code of [100026, 101005]) {
            const f = fixture();
            f.respond(async () => ({ data: { response: { resultCode: 1, errorCode: code } } }));
            await assert.rejects(() => new MetadataClient(f.client).query("staticData", device));
            assert.equal(f.calls.length, 2);
        }
    });

    it("rejects malformed replies and reports unsupported requests without raw exception details", async () => {
        const f = fixture();
        const api = new MetadataClient(f.client);
        for (const response of ["not JSON", { response: [] }, { response: {} }]) {
            f.respond(async () => ({ data: response }));
            await assert.rejects(() => api.query("staticData", device), error => error.kind === "invalidResponse");
        }
        f.respond(async () => { throw { message: "sensitive-error-text", response: { status: 404, data: { token: "private" } } }; });
        await assert.rejects(() => api.query("staticData", device), error => error.kind === "unsupported" && !error.message.includes("sensitive"));
    });

    it("honors Retry-After without automatic retries and rejects unlisted endpoints", async () => {
        const f = fixture();
        f.respond(async () => { throw { response: { status: 429, headers: { "retry-after": "120" } } }; });
        const api = new MetadataClient(f.client);
        await assert.rejects(() => api.query("properties", device), error => error.kind === "rateLimited" && error.retryAfterMs === 120000);
        assert.equal(f.calls.length, 1);
        await assert.rejects(() => api.query("control", device), error => error.kind === "invalidRequest");
        await assert.rejects(() => api.query("__proto__", device), error => error.kind === "invalidRequest");
        assert.equal(f.calls.length, 1);
    });

    it("does not make requests after shutdown", async () => {
        const f = fixture();
        const api = new MetadataClient(f.client);
        api.close();
        await assert.rejects(() => api.query("staticData", device), error => error.kind === "cancelled");
        assert.equal(f.calls.length, 0);
    });
});

describe("Diagnostic anonymization", () => {
    it("removes identities and secrets recursively, including JSON strings and dynamic keys", () => {
        const source = {
            deviceTypeCode: "030", deviceFeatureCode: "synthetic-feature", propertyKey: "machine_status", programId: 8,
            deviceId: "private-id", userId: 123, serialNumber: "private-serial", accessToken: "secret-token",
            APIKey: "private-api-key", lat: 42,
            nested: JSON.stringify({ sessionInfo: { cookieValue: "cookie-secret" }, puid: "private-device", description: "Private room" }),
            records: [{ detail: "mail: person@example.invalid ip 192.168.1.4 ipv6 2001:db8::1 mac AA:BB:CC:DD:EE:FF https://example.invalid?token=hidden" }],
            "private-device": "Bearer arbitrary-sensitive-value",
        };
        const result = anonymize(source, ["Private room", "private-device"]);
        const encoded = JSON.stringify(result);
        for (const secret of ["private-id", "private-serial", "private-api-key", "secret-token", "cookie-secret", "private-device", "Private room", "person@example", "192.168.1.4", "2001:db8::1", "AA:BB:CC", "arbitrary-sensitive-value"]) {
            assert.ok(!encoded.includes(secret), secret);
        }
        assert.equal(result.propertyKey, "machine_status");
        assert.equal(result.programId, 8);
        assert.equal(result.lat, "[redacted]");
        assert.equal(result.deviceFeatureCode, "synthetic-feature");
        assert.equal(source.deviceId, "private-id");
    });

    it("bounds nested data and does not expose malformed embedded JSON", () => {
        assert.equal(anonymize('{"token":broken'), "[redacted-unparseable-json]");
        assert.equal(anonymize("x".repeat(17000)), "[redacted-large-text]");
        assert.equal(anonymize(new Array(2000).fill(1)).length, 1000);
        assert.equal(anonymize('prefix: {"token":"unknown-secret"}'), "[redacted-auth-text]");
    });
});

describe("Explicit diagnostic collection", () => {
    it("sanitizes system descriptions and keeps their failure independent of the completed self-check", async () => {
        const f = fixture();
        f.respond(async () => ({ data: { response: { resultCode: 0, puid: device.puid, data: [{
            programId: 77, duration: 90, account: "private-account", label: device.roomName,
        }] } } }));
        const report = await new DiagnosticsCollector(f.client).collect(device);
        assert.equal(report.queries.systemData.status, "ok");
        assert.equal(report.queries.systemData.data.data[0].programId, 77);
        assert.equal(report.queries.systemData.data.data[0].account, "[redacted]");
        assert.ok(!JSON.stringify(report).includes(device.puid));
        assert.ok(!JSON.stringify(report).includes(device.roomName));
        const unsupported = fixture();
        unsupported.respond(async () => {
            if (unsupported.calls.length === 4) throw { response: { status: 404 } };
            return { data: { response: { resultCode: 0, data: null } } };
        });
        const partial = await new DiagnosticsCollector(unsupported.client).collect(device);
        assert.equal(partial.ok, false);
        assert.equal(partial.queries.selfCheck.status, "ok");
        assert.equal(partial.queries.systemData.status, "unsupported");
    });
    it("makes no requests until triggered, coalesces callers and caches only anonymized results", async () => {
        const f = fixture();
        let now = 1000000;
        const collector = new DiagnosticsCollector(f.client, () => now);
        assert.equal(f.calls.length, 0);
        f.respond(async () => ({ data: { response: { resultCode: 0, data: { token: "secret-response", label: device.roomName, propertyKey: "machine_status" } } } }));
        const [first, second] = await Promise.all([collector.collect(device), collector.collect(device)]);
        assert.equal(f.calls.length, 4);
        assert.equal(first.ok, true);
        assert.equal(second.ok, true);
        assert.ok(!JSON.stringify(first).includes("secret-response"));
        assert.ok(!JSON.stringify(first).includes(device.roomName));
        assert.equal((await collector.collect(device)).cached, true);
        assert.equal(f.calls.length, 4);
        now += 300001;
        await collector.collect(device);
        assert.equal(f.calls.length, 8);
    });

    it("keeps unsupported queries separate and still collects the other descriptions", async () => {
        const f = fixture();
        f.respond(async () => {
            if (f.calls.length === 1) throw { response: { status: 405 } };
            return { data: { response: { resultCode: 0, data: [] } } };
        });
        const report = await new DiagnosticsCollector(f.client).collect(device);
        assert.equal(report.ok, false);
        assert.equal(report.queries.properties.status, "unsupported");
        assert.equal(report.queries.staticData.status, "ok");
        assert.equal(report.queries.systemData.status, "ok");
        assert.equal(f.calls.length, 4);
    });

    it("stops after a rate limit and applies a shared cooldown to other devices", async () => {
        const f = fixture();
        const collector = new DiagnosticsCollector(f.client);
        f.respond(async () => { throw { response: { status: 429, headers: { "retry-after": "180" } } }; });
        const report = await collector.collect(device);
        assert.equal(report.queries.properties.status, "rateLimited");
        assert.equal(report.queries.staticData.status, "skipped");
        assert.equal(report.queries.systemData.status, "skipped");
        assert.equal((await collector.collect({ ...device, puid: "other-synthetic" })).error, "rateLimited");
        assert.equal(f.calls.length, 1);
    });

    it("serializes different devices and stops queued requests when the account is rate-limited", async () => {
        const f = fixture();
        const collector = new DiagnosticsCollector(f.client);
        f.respond(async () => { throw { response: { status: 429 } }; });
        const [first, second] = await Promise.all([
            collector.collect(device), collector.collect({ ...device, puid: "other-synthetic" }),
        ]);
        assert.equal(first.ok, false);
        assert.equal(second.ok, false);
        assert.equal(second.queries.properties.status, "skipped");
        assert.equal(f.calls.length, 1);
        collector.close();
        assert.equal((await collector.collect(device)).error, "cancelled");
    });
});
