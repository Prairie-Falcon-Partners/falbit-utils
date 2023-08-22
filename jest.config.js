module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['./'], // change this to your source code directory
    testMatch: [
      '**/test/**/*.+(ts|tsx|js)',
      '**/?(*.)+(spec|test).+(ts|tsx|js)',
    ],
    transform: {
      '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  };
  