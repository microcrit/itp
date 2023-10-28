import { FileType } from "./others.js";
import { load } from "./plugins.js";
import pkg from "mdimg";
import fs from "fs";
import path from "path";

const { convert2img } = pkg;

let output = [];
let input = [];

let __vars = {
    functions: {},
    variables: {},
};

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function variableOps(value) {
    let left = __vars.variables[value.split(" ")[0].trim()];
    if (value.includes("+")) {
        let parts = value.split("+");
        let right = parts[1].trim();
        let inferedLeft = inferType(left);
        let inferedRight = inferType(right);
        return inferedLeft + inferedRight;
    } else if (value.includes("-")) {
        let parts = value.split("-");
        let right = parts[1].trim();
        let inferedLeft = inferType(left);
        let inferedRight = inferType(right);
        return inferedLeft - inferedRight;
    } else if (value.includes("*")) {
        let parts = value.split("*");
        let right = parts[1].trim();
        let inferedLeft = inferType(left);
        let inferedRight = inferType(right);
        return inferedLeft * inferedRight;
    } else if (value.includes("/")) {
        let parts = value.split("/");
        let right = parts[1].trim();
        let inferedLeft = inferType(left);
        let inferedRight = inferType(right);
        return inferedLeft / inferedRight;
    }
    return value;
}

function ops(condition) {
    let conditionResult = false;
    if (condition.includes("==")) {
        let parts = condition.split("==");
        let left = parts[0].trim();
        let right = parts[1].trim();
        let inferedLeft = inferType(left);
        let inferedRight = inferType(right);
        conditionResult = inferedLeft === inferedRight;
    } else if (condition.includes("!=")) {
        let parts = condition.split("!=");
        let left = parts[0].trim();
        let right = parts[1].trim();
        let inferedLeft = inferType(left);
        let inferedRight = inferType(right);
        conditionResult = inferedLeft !== inferedRight;
    } else if (condition.includes(">=")) {
        let parts = condition.split(">=");
        let left = parts[0].trim();
        let right = parts[1].trim();
        let inferedLeft = inferType(left);
        let inferedRight = inferType(right);
        conditionResult = inferedLeft >= inferedRight;
    } else if (condition.includes("<=")) {
        let parts = condition.split("<=");
        let left = parts[0].trim();
        let right = parts[1].trim();
        let inferedLeft = inferType(left);
        let inferedRight = inferType(right);
        conditionResult = inferedLeft <= inferedRight;
    } else if (condition.includes(">")) {
        let parts = condition.split(">");
        let left = parts[0].trim();
        let right = parts[1].trim();
        let inferedLeft = inferType(left);
        let inferedRight = inferType(right);
        conditionResult = inferedLeft > inferedRight;
    } else if (condition.includes("<")) {
        let parts = condition.split("<");
        let left = parts[0].trim();
        let right = parts[1].trim();
        let inferedLeft = inferType(left);
        let inferedRight = inferType(right);
        conditionResult = inferedLeft < inferedRight;
    } else if (condition.includes("&&")) {
        let parts = condition.split("&&");
        let left = parts[0].trim();
        let right = parts[1].trim();
        let inferedLeft = inferType(left);
        let inferedRight = inferType(right);
        conditionResult = inferedLeft && inferedRight;
    } else if (condition.includes("||")) {
        let parts = condition.split("||");
        let left = parts[0].trim();
        let right = parts[1].trim();
        let inferedLeft = inferType(left);
        let inferedRight = inferType(right);
        conditionResult = inferedLeft || inferedRight;
    }
    return conditionResult;
}

function inferType(value) {
    try {
        value = JSON.parse(value);
        return value;
    } catch (e) {
        if (__vars.variables[value.split(" ")[0]]) {
            return variableOps(value);
        } else if (value === "true" || value === "false") {
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
    let args = sliced[0]
        .split("[")[1]
        .split("]")[0]
        .split(",")
        .map((x) => x.trim());
    let body = "";
    if (sliced[0].trim().endsWith("{")) {
        for (var i = 0; i < sliced.length; i++) {
            inBlock.push(input.indexOf(sliced[0]) + i);
            if (sliced[i].trim().endsWith("}}")) {
                body = sliced
                    .slice(0, i)
                    .join("\n")
                    .split("[")
                    .slice(1)
                    .join("[")
                    .split("]")
                    .slice(1)
                    .join("]")
                    .split("{")
                    .slice(1)
                    .join("{")
                    .trim();
                break;
            }
        }
    }
    for (var x of Object.keys(__vars.variables)) {
        body = body.replaceAll(
            "[[" + x + "]]",
            javascriptify(__vars.variables[x])
        );
    }
    __vars.functions[name] = {
        args,
        function: new AsyncFunction(args.join(","), body),
    };
    return [];
}

/**
 * {var variable_name => "hi"}
 * {var variable_name2 => variable_name + " value"}
 */
function exec_add_variable(sliced) {
    let name = sliced[0].split("{var ")[1].split(" ")[0].trim();
    let value = sliced[0]
        .split("=>")
        .slice(1)
        .join("=>")
        .trim()
        .split("}")
        .join(" ")
        .trim();

    __vars.variables[name] = inferType(value);
    return [];
}

/**
 * {function_name[argument1, argument2] | variable}
 */
async function exec_call_function(sliced) {
    let name = sliced[0].split("{")[1].split("[")[0].trim();
    let args = sliced[0]
        .split("{")[1]
        .split("[")[1]
        .split("]")[0]
        .split(",")
        .map((x) => x.trim());
    let pipe = sliced[0]
        .split("]")[1]
        .trim()
        .split("}")[0]
        .split("|")
        .map((x) => x.trim());
    pipe = pipe.length > 0 ? pipe[1] : [];
    let result = await __vars.functions[name].function(
        ...args.map((x) => inferType(x))
    );
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
                body = sliced
                    .slice(0, i)
                    .join("\n")
                    .split(")")
                    .slice(1)
                    .join(")")
                    .split("{")
                    .slice(1)
                    .join("{")
                    .trim();
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
                body = sliced
                    .slice(0, i)
                    .join("\n")
                    .split(")")
                    .slice(1)
                    .join(")")
                    .split("{")
                    .slice(1)
                    .join("{")
                    .trim();
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

/**
 * {if(condition) {
 * # [[status]]
 * }}
 */
async function exec_if(sliced) {
    let body = "";
    if (sliced[0].trim().endsWith("{")) {
        for (var i = 0; i < sliced.length; i++) {
            inBlock.push(input.indexOf(sliced[0]) + i);
            if (sliced[i].trim().endsWith("}}")) {
                body = sliced
                    .slice(0, i)
                    .join("\n")
                    .split("{")
                    .slice(1)
                    .join("{")
                    .trim();
                break;
            }
        }
    }
    let result = [];
    let condition = sliced[0].split("{if(")[1].split(")")[0].trim();
    let conditionResult = false;
    for (var x of Object.keys(__vars.variables)) {
        body = body.replaceAll(
            "[[" + x + "]]",
            javascriptify(__vars.variables[x])
        );
        condition = condition.replaceAll(
            "[[" + x + "]]",
            javascriptify(__vars.variables[x])
        );
    }

    conditionResult = ops(condition);

    if (conditionResult) {
        result = body.split("\n");
    }
    return result;
}

/**
 * {render("./output.png")
 */
async function exec_render(sliced, type) {
    let path = sliced[0].split("{render(")[1].split(")")[0].trim();
    let current_output = output.join("\n");
    let result = await convert2img({
        mdText: current_output,
        outputFilename: path,
    });
    let embedded =
        type === FileType.Markdown
            ? "![" + path + "](" + path.replace("./", "") + ")"
            : type === FileType.HTML
            ? '<img src="' + path.replace("./", "") + '">'
            : path.replace("./", "");
    return [embedded];
}

/**
 * {include("./file.module.it")}
 */
async function exec_include(sliced) {
    let name = sliced[0].split("{include(")[1].split(")")[0].trim().replaceAll('"', "");
    let fileContent = fs.readFileSync(name, "utf-8");
    if (name.endsWith(".module.it")) {
        let lines = fileContent.split("\n").map((x) => x.trim());
        input.splice(input.indexOf(sliced[0]) + 1, 0, ...lines);
        return [];
    } else {
        throw new Error("Invalid file type");
    }
}

async function runLines(content, vars, type) {
    input = content;
    __vars.variables = vars;
    for (var i = 0; i < input.length; i++) {
        let line = input[i];
        if (input[i].trim().startsWith("{include")) {
            let sliced = input.slice(i);
            await exec_include(sliced);
            input.splice(i, 1);
        }
    }
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
        } else if (line.trim().startsWith("{if")) {
            let sliced = input.slice(i);
            result = await exec_if(sliced);
        } else if (line.trim().startsWith("{render")) {
            let sliced = input.slice(i);
            result = await exec_render(sliced, type);
        } else if (
            line.trim().startsWith("{") &&
            __vars.functions[line.trim().split("{")[1].split("[")[0].trim()]
        ) {
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
    return output.join("\n").trim();
}

let args = {};

export default async function parser(name, ext, content, path, vars, plugins) {
    if (ext !== ".it") throw new Error("Invalid file type");
    const lines = content.split("\n").map((x) => x.trim());
    const firstLine = lines[0];
    args = {
        name,
        ext,
        content,
        path,
        vars,
        plugins,
    };
    let type = FileType.Text;
    if (firstLine.startsWith("@")) {
        let xt = firstLine.slice(1).trim().toLowerCase();
        if (xt == "markdown") {
            type = FileType.Markdown;
        } else if (xt == "html") {
            type = FileType.HTML;
        } else {
            type = FileType.Text;
        }
    }
    const data = await load(plugins);
    Object.assign(__vars.functions, data.functions);
    Object.assign(__vars.variables, data.variables);
    return await runLines(lines.slice(1), vars, type);
}
