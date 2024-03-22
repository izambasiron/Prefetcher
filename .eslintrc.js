module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
        node: true,
        'jest/globals': true, // If using Jest for testing
    },
    "extends": "eslint:recommended",
    "overrides": [
        {
            "env": {
                "node": true
            },
            "files": [
                ".eslintrc.{js,cjs}"
            ],
            "parserOptions": {
                "sourceType": "script"
            }
        }
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        sourceType: 'module',
    },
    "rules": {
        'no-unused-vars': 'warn',
        'no-console': 'off',
    }
}
