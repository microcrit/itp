import { FileType } from "./others.js";

let output = [];
let input = [];

let __vars = {
    functions: {},
    variables: {}
};

const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

function inferType(value) {
    try {
        value = JSON.parse(value);
        return value;
    } catch (e) {
        if (value === "true" || value === "false") {
            return value === "true";
        } else if (value.startsWith('"') && value.endsWith('"')) {
            return value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
            return value.slice(1, -1);
        } else if (value.startsWith("`") && value.endsWith("`")) {
            let t = value.slice(1, -1);
            for (var x of __vars.variables) {
                t = t.replaceAll("[[" + x + "]]", __vars.variables[x]);
            }
            return t;
        } else if (!isNaN(value)) {
            return parseFloat(value);
        } else {
            return value;
        }
    }
}

function javascriptify(value) {
    if (typeof value === "string") {
        return '"' + value + '"';
    } else if (typeof value === "boolean") {
        return value ? "true" : "false";
    } else if (typeof value === "number") {
        return value.toString();
    } else if (typeof value === "object") {
        return JSON.stringify(value);
    } else {
        return value;
    }
}

let inBlock = [];

let section_ignore_newlines = false;

/**
 * {fn function_name[argument1, argument2] {
 *  return ["text1", "text2"];
 * }}
 */
function exec_add_function(sliced) {
    let name = sliced[0].split("{fn ")[1].split("[")[0].trim();
    let args = sliced[0].split("[")[1].split("]")[0].split(",").map(x => x.trim());
    let body = "";
    if (sliced[0].trim().endsWith("{")) {
        for (var i = 0; i < sliced.length; i++) {
            inBlock.push(input.indexOf(sliced[0]) + i);
            if (sliced[i].trim().endsWith("}}")) {
                body = sliced.slice(0, i).join("\n").split("[").slice(1).join("[").split("]").slice(1).join("]").split("{").slice(1).join("{").trim();
                break;
            }
        }
    }
    for (var x of Object.keys(__vars.variables)) {
        body = body.replaceAll("[[" + x + "]]", javascriptify(__vars.variables[x]));
    }
    __vars.functions[name] = { args, function: new AsyncFunction(args.join(","), body) };
    return [];
}

/**
 * {var variable_name => value}
 */
function exec_add_variable(sliced) {
    let name = sliced[0].split("{var ")[1].split(" ")[0].trim();
    let value = sliced[0].split("=>").slice(1).join("=>").trim().split("}").join(" ").trim();

    __vars.variables[name] = inferType(value);
    return [];
}

/**
 * {function_name[argument1, argument2] | variable}
 */
async function exec_call_function(sliced) {
    let name = sliced[0].split("{")[1].split("[")[0].trim();
    let args = sliced[0].split("{")[1].split("[")[1].split("]")[0].split(",").map(x => x.trim());
    let pipe = sliced[0].split("]")[1].trim().split('}')[0].split("|").map(x => x.trim());
    pipe = pipe.length > 0 ? pipe[1] : [];
    let result = await __vars.functions[name].function(...args.map(x => inferType(x)));
    if (pipe.length && pipe.length > 0) {
        __vars.variables[pipe] = result;
        return [];
    } else {
        return result;
    }
}

/**
 * {insert(variable) {
 *  # [[status]]
 * }}
 */
function exec_insert(sliced) {
    let name = sliced[0].split("{insert(")[1].split(")")[0].trim();
    let body = "";
    if (sliced[0].trim().endsWith("{")) {
        for (var i = 0; i < sliced.length; i++) {
            inBlock.push(input.indexOf(sliced[0]) + i);
            if (sliced[i].trim().endsWith("}}")) {
                body = sliced.slice(0, i).join("\n").split(")").slice(1).join(")").split("{").slice(1).join("{").trim();
                break;
            }
        }
    }
    let result = [];
    let data = __vars.variables[name];
    if (typeof data === "object") {
        let t = body;
        let d = data[i];
        for (var key of Object.keys(d)) {
            t = t.replaceAll("[[" + key + "]]", d[key]);
        }
        result.push(t);
    } else {
        let t = body;
        t = t.replaceAll("[[" + name + "]]", data);
        result.push(t);
    }
    return result;
}

/**
 * {map(variable) {
 *  | [[status]] | [[text]] |
 * }}
 */
function exec_map(sliced) {
    let name = sliced[0].split("{map(")[1].split(")")[0].trim();
    let body = "";
    if (sliced[0].trim().endsWith("{")) {
        for (var i = 0; i < sliced.length; i++) {
            inBlock.push(input.indexOf(sliced[0]) + i);
            if (sliced[i].trim().endsWith("}}")) {
                body = sliced.slice(0, i).join("\n").split(")").slice(1).join(")").split("{").slice(1).join("{").trim();
                break;
            }
        }
    }
    let result = [];
    let data = __vars.variables[name];
    if (data.length > 0) {
        for (var i = 0; i < data.length; i++) {
            let t = body;
            let d = data[i];
            for (var key of Object.keys(d)) {
                t = t.replaceAll("[[" + key + "]]", d[key]);
            }
            result.push(t);
        }
    }
    return result;
}

async function runLines(content) {
    input = content;
    for (var i = 0; i < input.length; i++) {
        let line = input[i];
        let result = [];
        if (line.trim() === "%pref ignore_newlines") {
            section_ignore_newlines = true;
        } else if (line.trim() === "%pref ignore_newlines end") {
            section_ignore_newlines = false;
        } else if (line.trim().startsWith("{fn ")) {
            let sliced = input.slice(i);
            result = exec_add_function(sliced);
        } else if (line.trim().startsWith("{var ")) {
            let sliced = input.slice(i);
            result = exec_add_variable(sliced);
        } else if (line.trim().startsWith("{map")) {
            let sliced = input.slice(i);
            result = exec_map(sliced);
        } else if (line.trim().startsWith("{insert")) {
            let sliced = input.slice(i);
            result = exec_insert(sliced);
        } else if (line.trim().startsWith("{") && __vars.functions[line.trim().split("{")[1].split("[")[0].trim()]) {
            let sliced = input.slice(i);
            result = await exec_call_function(sliced);
        } else {
            if (!inBlock.includes(i)) {
                if (section_ignore_newlines && line.trim() === "") {
                    continue;
                }
                result = [line];
            }
        }
        output = output.concat(result);
    }
    return output.join('\n').trim();
}

export default async function parser(name, ext, content, path) {
    const lines = content.split('\n').map(x => x.trim());
    const firstLine = lines[0];
    let type = FileType.Text;
    if (firstLine.startsWith('@')) {
        let xt = firstLine.slice(1).trim().toLowerCase();
        if (xt == 'markdown') {
            type = FileType.Markdown;
        } else if (xt == 'html') {
            type = FileType.HTML;
        } else {
            type = FileType.Text;
        }
    }
    return await runLines(lines.slice(1));
}