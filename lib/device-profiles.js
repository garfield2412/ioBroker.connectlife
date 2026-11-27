"use strict";

// Independent of ioBroker. Profile semantics are documented in docs/device-profiles.md.
const DRYER_TYPES = new Set(["004", "030", "032"]);
const OBSERVED_DRYER_FEATURE = "1wk080218v0w";
const CLIMATE_PROPERTIES = ["t_power", "t_temp", "t_work_mode", "t_fan_speed"];
const OPERATIONS = { 0: "off", 1: "standby", 2: "running", 3: "paused" };

function selectProfile(device) {
    const type = String(device.deviceTypeCode ?? "");
    if (DRYER_TYPES.has(type)) {
        return {
            category: "dryer",
            id:
                type === "030" && device.deviceFeatureCode === OBSERVED_DRYER_FEATURE
                    ? "dryer-030-1wk080218v0w"
                    : "dryer-generic",
        };
    }
    const status = device.statusList;
    if (type === "009" || (!type && CLIMATE_PROPERTIES.some(key => Object.hasOwn(status || {}, key)))) {
        return { category: "climate", id: "climate-legacy" };
    }
    return { category: "unknown", id: "generic" };
}

function integer(value) {
    if (typeof value !== "number" && typeof value !== "string") {
        return null;
    }
    if (typeof value === "string" && !/^\d+$/.test(value.trim())) {
        return null;
    }
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function mapDryerStates(profile, status) {
    if (profile.id !== "dryer-030-1wk080218v0w") {
        return [];
    }
    const result = [];
    const add = (property, id, name, type, role, convert, extra = {}) => {
        if (!Object.hasOwn(status, property)) {
            return;
        }
        result.push({ property, id, name, type, role, value: convert(status[property]), ...extra });
    };
    const operation = value => OPERATIONS[integer(value)] ?? "unknown";
    add("machine_status", "operation", "Operating state", "string", "text", operation, {
        states: { off: "Off", standby: "Standby", running: "Running", paused: "Paused", unknown: "Unknown" },
    });
    add("machine_status", "running", "Running", "boolean", "indicator.working", value => {
        const code = integer(value);
        return Object.hasOwn(OPERATIONS, code) ? code === 2 : null;
    });
    add("machine_status", "paused", "Paused", "boolean", "indicator", value => {
        const code = integer(value);
        return Object.hasOwn(OPERATIONS, code) ? code === 3 : null;
    });
    add("Selected_program_ID", "program", "Selected program", "number", "value", integer, {
        states: { 8: "Cotton", 28: "Eco" },
    });
    for (const [property, id, name] of [
        ["Selected_program_remaining_time_in_minutes", "remainingTime", "Reported remaining program time"],
        ["Selected_program_total_time_in_minutes", "totalTime", "Selected program duration"],
    ]) {
        add(
            property,
            id,
            name,
            "number",
            "value.interval",
            value => {
                const number = integer(value);
                return number !== null && number < 65535 ? number : null;
            },
            { unit: "min", min: 0 },
        );
    }
    add(
        "dry_time",
        "dryingOption",
        "Drying option (Cotton)",
        "string",
        "text",
        value => {
            return integer(status.Selected_program_ID) === 8 && integer(value) === 3 ? "extraDry" : "unknown";
        },
        { states: { extraDry: "Extra dry", unknown: "Unknown" } },
    );
    add("Drum_Light", "drumLight", "Drum light", "boolean", "indicator", value => {
        const code = integer(value);
        return code === 0 || code === 1 ? code === 1 : null;
    });
    add("error_code", "errorCode", "Reported error code", "string", "text", value => {
        return typeof value === "string" || typeof value === "number" ? String(value) : null;
    });
    return result;
}

module.exports = { selectProfile, mapDryerStates };
