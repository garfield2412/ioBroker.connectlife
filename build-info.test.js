const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { sourceCommit } = require("./lib/build-info");

const SHA = "a".repeat(40);
const root = path.resolve("synthetic-installation");
const packageDir = path.join(root, "node_modules", "iobroker.connectlife");

function fixture({ installedFrom, lockEntry, gitCommit, modified = false, version = "0.4.1" } = {}) {
    const files = new Map([
        [path.join(packageDir, "package.json"), JSON.stringify({ name: "iobroker.connectlife", version })],
        [path.join(packageDir, "io-package.json"), JSON.stringify({ common: { version, installedFrom } })],
    ]);
    if (lockEntry) {
        files.set(path.join(root, "package-lock.json"), JSON.stringify({ packages: { "node_modules/iobroker.connectlife": lockEntry } }));
    }
    const sandbox = {
        module: { exports: {} }, __dirname: path.join(packageDir, "lib"),
        require(name) {
            if (name === "node:fs") return {
                readFileSync(filename) { if (!files.has(filename)) throw new Error("missing"); return files.get(filename); },
                existsSync(filename) { return filename === path.join(packageDir, ".git") && gitCommit !== undefined; },
            };
            if (name === "node:child_process") return {
                execFileSync(command, args, options) {
                    assert.equal(command, "git");
                    assert.equal(options.windowsHide, true);
                    assert.equal(options.timeout, 2000);
                    return args.includes("rev-parse") ? gitCommit : modified ? " M main.js\n" : "";
                },
            };
            return require(name);
        },
    };
    vm.runInNewContext(fs.readFileSync(require.resolve("./lib/build-info"), "utf8"), sandbox);
    return sandbox.module.exports.getBuildInfo(packageDir);
}

describe("Installed build identity", () => {
    it("accepts immutable commits and does not interpret a branch or tag as a commit", () => {
        assert.equal(sourceCommit(`github:example/ioBroker.connectlife#${SHA}`), SHA);
        assert.equal(sourceCommit(`git+ssh://git@github.com/example/ioBroker.connectlife.git#${SHA}`), SHA);
        assert.equal(sourceCommit(`https://github.com/example/ioBroker.connectlife/archive/${SHA}.tar.gz`), SHA);
        for (const value of [undefined, "example/ioBroker.connectlife#development/dryer-support", "example/ioBroker.connectlife#v0.4.1", "a".repeat(40)]) {
            assert.equal(sourceCommit(value), "");
        }
    });

    it("reads the installed npm commit even when installedFrom contains only a branch", () => {
        const result = fixture({ installedFrom: "example/ioBroker.connectlife#refs/heads/development/dryer-support", lockEntry: { version: "0.4.1", resolved: `git+ssh://git@github.com/example/ioBroker.connectlife.git#${SHA}` } });
        assert.equal(result.commit, SHA);
        assert.equal(result.source, "npm-lock");
        assert.equal(result.label, "0.4.1 · aaaaaaa");
    });

    it("prefers the immutable installed source and ignores a mismatched lockfile version", () => {
        assert.equal(fixture({ installedFrom: `example/ioBroker.connectlife#${SHA}` }).source, "installedFrom");
        const unknown = fixture({ lockEntry: { version: "0.4.0", resolved: `example/ioBroker.connectlife#${SHA}` } });
        assert.equal(unknown.commit, "");
        assert.equal(unknown.label, "0.4.1 · unknown");
    });

    it("marks local modifications and never queries a remote Git branch", () => {
        const result = fixture({ gitCommit: SHA, modified: true });
        assert.equal(result.source, "git");
        assert.equal(result.modified, true);
        assert.equal(result.label, "0.4.1 · aaaaaaa (modified)");
        assert.equal(fixture({ gitCommit: "unborn" }).source, "unknown");
    });

    it("works without Git, an installation source or an npm lockfile", () => {
        assert.equal(fixture().source, "unknown");
        assert.equal(fixture().version, "0.4.1");
    });
});
