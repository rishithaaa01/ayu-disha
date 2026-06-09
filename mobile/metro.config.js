const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolve .web.ts/.web.js platform-specific files before generic ones
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Block expo-sqlite's broken web build by redirecting it to a stub on web
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'expo-sqlite') {
    return {
      filePath: require('path').resolve(__dirname, 'database/database-sqlite-stub.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
