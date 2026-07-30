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
        project: ["./jest.tsconfig.json"],
        sourceType: "module",
    },
    plugins: ["prefer-arrow", "@typescript-eslint", "prettier"],
    rules: {
        // Project targets ES5 and deliberately uses `var` in hot paths (see CLAUDE.md)
        "no-var": "off",
        "prefer-const": "off",
        "init-declarations": "off",
        // `!= null` is the intended idiom for "null or undefined"
        "no-eq-null": "off",
        "eqeqeq": ["error", "always", { null: "ignore" }],
        // Data files are lazy-loaded at runtime via require()
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-var-requires": "off",
        // Raw upstream API payloads are untyped until the transform pipeline normalizes them
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "as" }],
        "no-undef": "off", //typescript will catch these
        "no-dupe-class-members": "off",
        "@typescript-eslint/no-dupe-class-members": ["error"],
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-inferrable-types": "off",
        "no-extra-boolean-cast": "off",
        "no-multi-spaces": ["error", { ignoreEOLComments: true }],
        // `var self = this` is the ES5 closure idiom used across the realtime client
        "@typescript-eslint/no-this-alias": ["error", { allowedNames: ["self"] }],
        "no-empty": ["error", { allowEmptyCatch: true }],
        "@typescript-eslint/no-unused-vars": "off", //this rule is a bit buggy atm, it picks up things as unused when they are
        "@typescript-eslint/adjacent-overload-signatures": "error",
        "@typescript-eslint/no-use-before-define": "off",
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
        "@typescript-eslint/no-non-null-assertion": "error",
        // Existing code predates prettier enforcement; keep as a hint, not a CI blocker.
        // Run `npm run format` on files you touch.
        "prettier/prettier": "warn",
    },
    overrides: [
        {
            files: ["__tests__/**/*.ts"],
            rules: {
                "@typescript-eslint/no-non-null-assertion": "off",
                "@typescript-eslint/no-explicit-any": "off",
            },
        },
    ],
};