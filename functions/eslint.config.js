export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "module",
    },
    rules: {
      "no-restricted-globals": ["error", "name", "length"],
      "prefer-arrow-callback": "error",
      quotes: ["error", "double", { allowTemplateLiterals: true }],
    },
  },
  {
    files: ["**/*.spec.*"],
    languageOptions: {
      globals: {
        mocha: true,
      },
    },
  },
];


