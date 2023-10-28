import fs from 'fs';
import path from 'path';

export async function load(pluginList) {
    let plugins = [];
    for (let plugin of pluginList) {
        let pluginPath = path.resolve(plugin);
        let pluginModule = await import(pluginPath);
        plugins.push(pluginModule);
    }
    let resolved = {
        functions: {},
        variables: {}
    };
    for (let plugin of plugins) {
        if (plugin.functions) {
            Object.assign(resolved.functions, plugin.functions);
        }
        if (plugin.variables) {
            Object.assign(resolved.variables, plugin.variables);
        }
    }
    return resolved;
};