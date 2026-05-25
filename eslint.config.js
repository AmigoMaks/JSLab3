const js = require("@eslint/js");

module.exports = [
    {
        ignores: ["node_modules/", "coverage/"]
    },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                console: "readonly",
                process: "readonly",
                __dirname: "readonly",
                module: "readonly",
                require: "readonly",
                jest: "readonly",
                describe: "readonly",
                test: "readonly",
                expect: "readonly",
                afterEach: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error"
        }
    }
];