import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maxluo.sttracker',
  appName: 'ST Tracker',
  webDir: 'www',
  server: {
    // 开发时使用本地服务器，生产环境会使用打包的文件
    // url: 'http://<your-server>:30089',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f0f1a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0072CE'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Geolocation: {
      // iOS 权限描述
    }
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'ST Tracker'
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0f0f1a'
  }
};

export default config;
