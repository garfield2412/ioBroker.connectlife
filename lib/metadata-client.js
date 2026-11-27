"use strict";

// Read operations observed in connectlife/api.py; no device control endpoint is exposed here.
const QUERIES = {
    properties: { method: "GET", path: "/clife-svc/get_property_list" },
    staticData: { method: "POST", path: "/clife-svc/pu/query_static_data" },
    selfCheck: { method: "POST", path: "/basic/self_check/info" },
};

class MetadataError extends Error {
    constructor(kind, httpStatus, apiCode, retryAfterMs = 0) {
        super(`Metadata request failed (${kind})`);
        this.kind = kind;
        this.httpStatus = httpStatus;
        this.apiCode = apiCode;
        this.retryAfterMs = retryAfterMs;
    }
}

function retryDelay(value) {
    if (value === undefined || value === null) {
        return 60000;
    }
    const seconds = Number(value);
    return Number.isFinite(seconds)
        ? Math.max(60000, seconds * 1000)
        : Math.max(60000, Date.parse(value) - Date.now() || 0);
}

class MetadataClient {
    constructor(client) {
        this.client = client;
        this.abortController = new AbortController();
    }

    async query(name, device) {
        if (
            typeof name !== "string" ||
            !Object.hasOwn(QUERIES, name) ||
            !device ||
            typeof device.puid !== "string" ||
            !device.puid
        ) {
            throw new MetadataError("invalidRequest");
        }
        const query = QUERIES[name];
        const payload =
            name === "properties"
                ? { deviceTypeCode: device.deviceTypeCode, deviceFeatureCode: device.deviceFeatureCode }
                : { puid: device.puid, ...(name === "selfCheck" ? { noRecord: "1" } : {}) };
        if (name === "properties" && (!payload.deviceTypeCode || !payload.deviceFeatureCode)) {
            throw new MetadataError("missingFeatureCode");
        }
        let renewed = false;
        let freshNonce = false;
        for (;;) {
            if (this.abortController.signal.aborted) {
                throw new MetadataError("cancelled");
            }
            let token;
            try {
                token = await this.client.ensureToken();
            } catch {
                throw new MetadataError("authentication");
            }
            const data = { ...this.client.getCommonRequestData(), ...payload, accessToken: token };
            data.sign = this.client.getSignature(data);
            let response;
            try {
                const url = `${this.client.baseUrl}${query.path}`;
                const options = {
                    maxContentLength: 1024 * 1024,
                    maxBodyLength: 1024 * 1024,
                    signal: this.abortController.signal,
                };
                response =
                    query.method === "GET"
                        ? await this.client.http.get(url, { ...options, params: data })
                        : await this.client.http.post(url, data, {
                              ...options,
                              headers: { "Content-Type": "application/json" },
                          });
            } catch (error) {
                const status = error?.response?.status;
                if (status === 429) {
                    throw new MetadataError(
                        "rateLimited",
                        status,
                        undefined,
                        retryDelay(error.response.headers?.["retry-after"]),
                    );
                }
                if (status === 401 && !renewed) {
                    renewed = true;
                    await this.renewToken();
                    continue;
                }
                const kind = [404, 405, 501].includes(status)
                    ? "unsupported"
                    : status === 401
                      ? "authentication"
                      : status === 403
                        ? "forbidden"
                        : "transport";
                throw new MetadataError(kind, status);
            }
            const body = response?.data?.response;
            if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length === 0) {
                throw new MetadataError("invalidResponse");
            }
            const code =
                body.errorCode !== undefined && String(body.errorCode) !== "0" ? body.errorCode : body.resultCode;
            if (String(code) === "403048") {
                throw new MetadataError("rateLimited", undefined, "403048", 60000);
            }
            if (String(code) === "100026" && !renewed) {
                renewed = true;
                await this.renewToken();
                continue;
            }
            if (String(code) === "101005" && !freshNonce) {
                freshNonce = true;
                continue;
            }
            if (
                (body.resultCode !== undefined && String(body.resultCode) !== "0") ||
                (body.errorCode !== undefined && String(body.errorCode) !== "0")
            ) {
                const numericCode = /^\d{1,12}$/.test(String(code)) ? String(code) : undefined;
                throw new MetadataError(
                    String(code) === "100026" ? "authentication" : "apiError",
                    undefined,
                    numericCode,
                );
            }
            return body;
        }
    }

    async renewToken() {
        try {
            await this.client.ensureToken(true);
        } catch {
            throw new MetadataError("authentication");
        }
    }

    close() {
        this.abortController.abort();
    }
}

module.exports = { MetadataClient, MetadataError };
