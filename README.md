# itp
*no longer maintained*   
Inline text preprocessor.

I made this to test my luck at making an (albeit bad) poor-mans parser.

## Usage
```js
import * as itmap from 'itpre';
import fs from 'fs';

const { parse, FileType } = itmap;

const file = await parse('./any.it', {
    variable: "hello"
});

fs.writeFileSync('./any.file', file, 'utf8');
```

## Syntax
```
@type - one of markdown, html, txt

%pref parser_preference - parser_preference one of ignore_newlines
%pref parser_preference end

{fn function_name[args] {
    // javascript code
    return "Hello, World!";
}}

{fn function_name2[args] {
    // javascript code
    return [{
        one: 1,
        two: 2
    }];
}}

{var variable_name = `[[variable]]`}
{var variable_name2 = "variable"}

{function_name[args] | pipeTo} - Pipes function_name's output to a variable
{function_name2[args] | pipeTo2} - Pipes are optional

{insert(pipeTo) {
    # [[pipeTo]]
}}

{map(pipeTo2) {
    [[one]], [[two]]
}}

{if(variable_name == "variable") {
    # Hello, World!
}}

{render("./output_file.png")}

{include("./funs.module.it")}
```
