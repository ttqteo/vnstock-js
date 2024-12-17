module.exports = {
    env: {
        browser: false,
        node: true,
        es6: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended",
    ],
    ignorePatterns: ["node_modules/", ".eslintrc.js", "dist/", "docs/", "examples/", "jest.config.js"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: ["./tsconfig.json"],
        sourceType: "module",
    },
    plugins: ["prefer-arrow", "@typescript-eslint", "prettier"],
    rules: {
        // The typescript version adds extra checks on top of the eslint version, so we disable the eslint version
        // https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/init-declarations.md
        "@typescript-eslint/init-declarations": ["error"],
        "init-declarations": "off",
        "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
        "no-eq-null": ["error"],
        "no-undef": "off", //typescript will catch these
        "no-dupe-class-members": "off",
        "@typescript-eslint/no-dupe-class-members": ["error"],
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-inferrable-types": "off",
        "no-extra-boolean-cast": "off",
        "no-multi-spaces": "error",
        "@typescript-eslint/no-unused-vars": "off", //this rule is a bit buggy atm, it picks up things as unused when they are
        "@typescript-eslint/adjacent-overload-signatures": "error",
        //https://github.com/typescript-eslint/typescript-eslint/issues/1856
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/interface-name-prefix": "off", //deprecated in favor of naming-convention rule
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "no-irregular-whitespace": "off",
        "no-prototype-builtins": "off", //should enable, although very unlikely to break in our case
        "prefer-rest-params": "off", //should consider setting this to warn
        "prefer-spread": "off", //should consider setting this to warn
        "no-case-declarations": "off", //should consider enabling
        "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
        "@typescript-eslint/array-type": [
            //consider enabling as error
            "off",
            {
                default: "array-simple",
            },
        ],
        "@typescript-eslint/quotes": [
            "error",
            "double",
            {
                avoidEscape: true,
                allowTemplateLiterals: true,
            },
        ],
        "@typescript-eslint/no-non-null-assertion": "error",
        "prettier/prettier": "error",
    },
};