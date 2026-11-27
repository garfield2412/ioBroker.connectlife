"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function readJson(filename) {
    try {
        return JSON.parse(fs.readFileSync(filename, "utf8"));
    } catch {
        return null;
    }
}

function sourceCommit(source) {
    if (typeof source !== "string") {
        return "";
    }
    // Branch names and tags are not immutable build identifiers.
    return (
        source.match(/#([a-f0-9]{40})$/i)?.[1]?.toLowerCase() ||
        source.match(/\/(?:archive|tarball)\/([a-f0-9]{40})(?:\.tar\.gz|\.zip)?$/i)?.[1]?.toLowerCase() ||
        ""
    );
}

function getBuildInfo(packageDir = path.resolve(__dirname, "..")) {
    const pkg = readJson(path.join(packageDir, "package.json")) || {};
    const info = { version: pkg.version || "unknown", commit: "", source: "unknown", modified: false };
    if (fs.existsSync(path.join(packageDir, ".git"))) {
        try {
            const git = args =>
                execFileSync("git", ["-C", packageDir, ...args], {
                    encoding: "utf8",
                    timeout: 2000,
                    windowsHide: true,
                    stdio: ["ignore", "pipe", "ignore"],
                }).trim();
            const commit = git(["rev-parse", "HEAD"]);
            if (/^[a-f0-9]{40}$/i.test(commit)) {
                const modified = Boolean(git(["status", "--porcelain", "--untracked-files=normal"]));
                info.commit = commit.toLowerCase();
                info.source = "git";
                info.modified = modified;
            }
        } catch {
            // Git is optional on an installed ioBroker host; never expose command errors or paths.
        }
    }
    if (!info.commit) {
        const ioPackage = readJson(path.join(packageDir, "io-package.json"));
        if (ioPackage?.common?.version === info.version) {
            info.commit = sourceCommit(ioPackage.common.installedFrom);
            if (info.commit) {
                info.source = "installedFrom";
            }
        }
    }
    if (!info.commit && pkg.name && path.basename(path.dirname(packageDir)) === "node_modules") {
        const installationRoot = path.dirname(path.dirname(packageDir));
        const lock = readJson(path.join(installationRoot, "package-lock.json"));
        const entry = lock?.packages?.[`node_modules/${pkg.name}`] || lock?.dependencies?.[pkg.name];
        if (entry?.version === info.version || !entry?.version || sourceCommit(entry.version)) {
            info.commit = sourceCommit(entry?.resolved) || sourceCommit(entry?.version);
            if (info.commit) {
                info.source = "npm-lock";
            }
        }
    }
    return {
        ...info,
        label: `${info.version} · ${info.commit ? info.commit.slice(0, 7) : "unknown"}${info.modified ? " (modified)" : ""}`,
    };
}

module.exports = { getBuildInfo, sourceCommit };
