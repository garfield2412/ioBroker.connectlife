"use strict";

// Existing climate mappings retained without changing their public state IDs.
async function createClimateStates(adapter, objectId, status) {
    const definitions = {
        t_power: {
            id: "power",
            name: "Power",
            type: "boolean",
            role: "switch.power",
            toState: value => Number(value) !== 0,
        },
        t_temp: {
            id: "targetTemperature",
            name: "Target temperature",
            type: "number",
            role: "level.temperature",
            unit: "°C",
            min: 10,
            max: 35,
            toState: Number,
        },
        t_work_mode: {
            id: "mode",
            name: "Operating mode",
            type: "number",
            role: "level.mode.airconditioner",
            states: {
                0: "fan",
                1: "heat",
                2: "cool",
                3: "dry",
                4: "auto",
            },
            toState: Number,
        },
        t_fan_speed: {
            id: "fanSpeed",
            name: "Fan speed",
            type: "number",
            role: "level.mode.fan",
            states: {
                0: "auto",
                5: "super low",
                6: "low",
                7: "medium",
                8: "high",
                9: "super high",
            },
            toState: Number,
        },
        t_fan_mute: {
            id: "silent",
            name: "Silent mode",
            type: "boolean",
            role: "switch.mode.silent",
            toState: value => Number(value) !== 0,
        },
        t_super: {
            id: "turbo",
            name: "Turbo mode",
            type: "boolean",
            role: "switch.mode.boost",
            toState: value => Number(value) !== 0,
        },
        t_eco: {
            id: "eco",
            name: "Eco mode",
            type: "boolean",
            role: "switch.mode.eco",
            toState: value => Number(value) !== 0,
        },
        t_swing_direction: {
            id: "horizontalSwing",
            name: "Horizontal swing",
            type: "number",
            role: "level.mode.swing",
            states: {
                0: "straight",
                1: "right",
                2: "both sides",
                3: "swing",
                4: "left",
            },
            toState: Number,
        },
        t_swing_angle: {
            id: "verticalSwing",
            name: "Vertical swing",
            type: "number",
            role: "level.mode.swing",
            toState: Number,
        },
    };

    for (const [apiProperty, definition] of Object.entries(definitions)) {
        if (!(apiProperty in status)) {
            continue;
        }

        const stateId = `devices.${objectId}.controls.${definition.id}`;
        await adapter.extendObjectAsync(stateId, {
            type: "state",
            common: {
                name: definition.name,
                type: definition.type,
                role: definition.role,
                read: true,
                write: true,
                ...(definition.unit ? { unit: definition.unit } : {}),
                ...(definition.min !== undefined ? { min: definition.min } : {}),
                ...(definition.max !== undefined ? { max: definition.max } : {}),
                ...(definition.states ? { states: definition.states } : {}),
            },
            native: {
                apiProperty,
                deviceObjectId: objectId,
            },
        });
        await adapter.setStateAsync(stateId, definition.toState(status[apiProperty]), true);
    }
}

module.exports = { createClimateStates };
