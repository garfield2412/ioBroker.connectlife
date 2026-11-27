const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { selectProfile, mapDryerStates } = require("./lib/device-profiles");

const device = statusList => ({
    puid: "synthetic-dryer", deviceTypeCode: "030", deviceFeatureCode: "1wk080218v0w", statusList,
});
const mapped = status => Object.fromEntries(mapDryerStates(selectProfile(device(status)), status).map(d => [d.id, d]));

function adapterHarness() {
    class Adapter {
        constructor() {
            this.namespace = "connectlife.0";
            this.config = { pollInterval: 60, allowRawWrites: true };
            this.objects = {};
            this.states = {};
            this.timers = new Map();
            this.log = { info() {}, warn() {}, error() {}, debug() {} };
        }
        on() {}
        async extendObjectAsync(id, object) { this.objects[id] = object; }
        async getObjectAsync(id) { return this.objects[id]; }
        async getStatesAsync(pattern) {
            const prefix = pattern.slice(0, -1);
            return Object.fromEntries(Object.entries(this.states).filter(([key]) => key.startsWith(prefix)));
        }
        async setStateAsync(id, value, ack) {
            this.states[id] = value && typeof value === "object" ? value : { val: value, ack };
        }
        setTimeout(callback, delay) { const id = {}; this.timers.set(id, { callback, delay }); return id; }
        clearTimeout(id) { this.timers.delete(id); }
    }
    const sandbox = {
        module: { exports: {} },
        require(name) {
            if (name === "@iobroker/adapter-core") return { Adapter };
            if (name === "./lib/connectlife-client-v011") return { ConnectLifeClient: class {} };
            return require(name);
        },
    };
    vm.runInNewContext(fs.readFileSync(require.resolve("./main"), "utf8"), sandbox);
    return sandbox.module.exports();
}

describe("Device profiles", () => {
    it("keeps other dryer families and unknown features generic, even with climate-like properties", () => {
        for (const type of ["004", "030", "032"]) {
            const profile = selectProfile({ deviceTypeCode: type, deviceFeatureCode: "unknown", statusList: { t_power: 1 } });
            assert.equal(profile.id, "dryer-generic");
            assert.deepEqual(mapDryerStates(profile, { machine_status: "2" }), []);
        }
        assert.equal(selectProfile({ deviceTypeCode: "999", statusList: { t_power: 1 } }).id, "generic");
        assert.equal(selectProfile({ deviceTypeCode: "009" }).id, "climate-legacy");
        assert.equal(selectProfile({ statusList: { t_power: 1 } }).id, "climate-legacy");
    });

    it("maps observed off, standby, running and paused independently of the persistent program phase", () => {
        for (const [code, expected] of [[0, "off"], [1, "standby"], [2, "running"], [3, "paused"]]) {
            const states = mapped({ machine_status: String(code), Current_program_phase: "2" });
            assert.equal(states.operation.value, expected);
            assert.equal(states.running.value, code === 2);
            assert.equal(states.paused.value, code === 3);
        }
        const unknown = mapped({ machine_status: "99" });
        assert.equal(unknown.operation.value, "unknown");
        assert.equal(unknown.running.value, null);
    });

    it("preserves unknown programs and limits the observed extra-dry mapping to Cotton", () => {
        const cotton = mapped({ Selected_program_ID: "8", dry_time: "3", Dry_Level: "1" });
        assert.equal(cotton.program.value, 8);
        assert.equal(cotton.dryingOption.value, "extraDry");
        assert.equal(mapped({ Selected_program_ID: "7", dry_time: "3" }).dryingOption.value, "unknown");
        assert.equal(mapped({ Selected_program_ID: "987" }).program.value, 987);
        assert.equal(mapped({ Selected_program_ID: "8", dry_time: "1" }).dryingOption.value, "unknown");
    });

    it("uses reported minutes without deriving progress, elapsed time, temperature or energy", () => {
        const values = mapped({ Selected_program_remaining_time_in_minutes: "207", Selected_program_total_time_in_minutes: "210", energy: "70", temperature: "0" });
        assert.equal(values.remainingTime.value, 207);
        assert.equal(values.totalTime.value, 210);
        assert.equal(values.remainingTime.unit, "min");
        assert.equal(values.energy, undefined);
        assert.equal(values.temperature, undefined);
        for (const invalid of ["", "garbage", null, true, "65535", -1]) {
            assert.equal(mapped({ Selected_program_remaining_time_in_minutes: invalid }).remainingTime.value, null);
        }
        assert.deepEqual(mapped({}), {});
    });
});

describe("Profile integration with ioBroker", () => {
    it("collects diagnostics only through the local button or explicit message, without device writes", async () => {
        const adapter = adapterHarness();
        let requests = 0;
        let deviceWrites = 0;
        adapter.client = { async setProperties() { deviceWrites++; } };
        adapter.diagnosticsCollector = {
            async collect(selected) {
                requests++;
                assert.equal(selected.puid, "synthetic-dryer");
                return { ok: true, fetchedAt: "2026-11-27T12:00:00.000Z", queries: {} };
            },
        };
        await adapter.processDevice(device({ machine_status: "3" }));
        const prefix = "devices.synthetic-dryer.diagnostics";
        assert.equal(requests, 0);
        assert.equal(adapter.objects[`${prefix}.refresh`].common.write, true);
        assert.equal(adapter.objects[`${prefix}.data`].common.write, false);
        await adapter.onStateChange(`connectlife.0.${prefix}.refresh`, { val: true, ack: true });
        assert.equal(requests, 0);
        await adapter.onStateChange(`connectlife.0.${prefix}.refresh`, { val: true, ack: false });
        assert.equal(requests, 1);
        assert.equal(deviceWrites, 0);
        assert.equal(adapter.states[`${prefix}.refresh`].val, false);
        assert.equal(adapter.states[`${prefix}.busy`].val, false);
        assert.equal(JSON.parse(adapter.states[`${prefix}.data`].val).ok, true);
        let response;
        adapter.sendTo = (from, command, result) => { response = result; };
        await adapter.onMessage({ command: "collectDiagnostics", message: { deviceObjectId: "synthetic-dryer" }, from: "test", callback: {} });
        assert.equal(requests, 2);
        assert.equal(response.ok, true);
        await adapter.onMessage({ command: "collectDiagnostics", message: { deviceObjectId: "arbitrary-device" }, from: "test", callback: {} });
        assert.equal(requests, 2);
        assert.equal(response.ok, false);
    });

    it("keeps an unverified dryer raw-only without climate controls", async () => {
        const adapter = adapterHarness();
        await adapter.processDevice({ puid: "other-dryer", deviceTypeCode: "032", statusList: { machine_status: "2", t_power: "1" } });
        assert.equal(adapter.states["devices.other-dryer.info.profile"].val, "dryer-generic");
        assert.equal(adapter.states["devices.other-dryer.status.operation"], undefined);
        assert.equal(adapter.states["devices.other-dryer.controls.power"], undefined);
        assert.equal(adapter.objects["devices.other-dryer.raw.t_power"].common.write, false);
    });

    it("creates read-only dryer states and raw data, invalidates missing properties and blocks writes", async () => {
        const adapter = adapterHarness();
        let writes = 0;
        adapter.client = { async setProperties() { writes++; } };
        await adapter.processDevice(device({ machine_status: "2", Selected_program_ID: "8", Selected_program_remaining_time_in_minutes: "207" }));
        const prefix = "devices.synthetic-dryer";
        assert.equal(adapter.states[`${prefix}.status.operation`].val, "running");
        assert.equal(adapter.states[`${prefix}.status.operation`].ack, true);
        assert.equal(adapter.objects[`${prefix}.status.operation`].common.write, false);
        assert.equal(adapter.objects[`${prefix}.raw.machine_status`].common.write, false);
        await adapter.onStateChange(`connectlife.0.${prefix}.raw.machine_status`, { val: 1, ack: false });
        assert.equal(writes, 0);
        await adapter.processDevice(device({ machine_status: "3" }));
        assert.equal(adapter.states[`${prefix}.status.remainingTime`].val, null);
        assert.equal(adapter.states[`${prefix}.status.remainingTime`].q, 1);
    });

    it("leaves climate control IDs, conversions and raw-write configuration intact", async () => {
        const adapter = adapterHarness();
        await adapter.processDevice({ puid: "synthetic-ac", deviceTypeCode: "009", statusList: { t_power: "1", t_temp: "24", t_work_mode: "2" } });
        assert.equal(adapter.states["devices.synthetic-ac.controls.power"].val, true);
        assert.equal(adapter.states["devices.synthetic-ac.controls.targetTemperature"].val, 24);
        assert.equal(adapter.objects["devices.synthetic-ac.controls.mode"].common.write, true);
        assert.equal(adapter.objects["devices.synthetic-ac.raw.t_power"].common.write, true);
    });

    it("flags failed polls immediately, recovers after success, and expires data without extra cloud requests", async () => {
        const adapter = adapterHarness();
        adapter.client = { async getDevices() { return []; } };
        await adapter.refreshDevices();
        assert.equal(adapter.states["info.dataStale"].val, false);
        const timer = [...adapter.timers.values()][0];
        assert.equal(timer.delay, 150000);
        await timer.callback();
        assert.equal(adapter.states["info.dataStale"].val, true);
        adapter.client.getDevices = async () => { throw new Error("synthetic network failure"); };
        await adapter.refreshDevices();
        assert.equal(adapter.states["info.dataStale"].val, true);
        adapter.client.getDevices = async () => [];
        await adapter.refreshDevices();
        assert.equal(adapter.states["info.dataStale"].val, false);
    });
});
