module.exports = {
  root: true,
  extends: [
    '@react-native',
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    'react-native/react-native': true,
    es2021: true,
  },
  plugins: ['react', 'react-native', 'react-hooks'],
  rules: {
    // Customized rules for better error detection
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'no-unused-vars': 'warn',
    'no-console': 'off', // Allow console for debugging in mobile
    'react-native/no-inline-styles': 'warn',
    'react/prop-types': 'off', // Not using PropTypes
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
