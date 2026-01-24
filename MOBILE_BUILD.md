# ST Tracker - 原生应用构建指南

## 📱 概述

ST Tracker 使用 Capacitor 将 Web 应用打包成原生 Android 和 iOS 应用。

## 🛠️ 环境要求

### Android
- Android Studio (最新版)
- Android SDK (API 24+)
- Java 17+

### iOS
- Xcode 15+
- macOS Sonoma 或更新
- Apple Developer 账号 (发布需要)

## 🚀 快速开始

### 开发调试

```bash
# 同步 web 资源到原生项目
npm run cap:sync

# 打开 Android Studio
npm run cap:open:android

# 打开 Xcode
npm run cap:open:ios
```

### 构建流程

1. **更新 Web 内容**
   ```bash
   npm run cap:sync
   ```

2. **Android APK**
   - 在 Android Studio 中: Build → Build Bundle(s) / APK(s) → Build APK(s)
   - 或命令行: `cd android && ./gradlew assembleRelease`
   - APK 位置: `android/app/build/outputs/apk/release/`

3. **iOS IPA**
   - 在 Xcode 中: Product → Archive
   - 然后在 Organizer 中导出 IPA

## 📋 发布签名

### Android 签名

1. 创建 keystore:
   ```bash
   keytool -genkey -v -keystore st-tracker.keystore -alias st-tracker -keyalg RSA -keysize 2048 -validity 10000
   ```

2. 在 `android/app/build.gradle` 添加签名配置

### iOS 签名

1. 在 Xcode 中配置 Signing & Capabilities
2. 选择你的 Apple Developer Team
3. 配置 Bundle Identifier: `com.maxluo.sttracker`

## 📦 应用信息

| 属性 | 值 |
|------|-----|
| App ID | com.maxluo.sttracker |
| 名称 | ST Tracker |
| 版本 | 1.0.0 |

## 🔧 功能权限

### Android (AndroidManifest.xml)
- `INTERNET` - 网络访问
- `ACCESS_FINE_LOCATION` - GPS 定位
- `ACCESS_COARSE_LOCATION` - 粗略定位
- `POST_NOTIFICATIONS` - 推送通知
- `VIBRATE` - 震动反馈
- `NFC` - ORCA 卡读取

### iOS (Info.plist)
- `NSLocationWhenInUseUsageDescription` - 定位权限
- `remote-notification` - 后台推送

## 📁 项目结构

```
bus/
├── android/          # Android 原生项目
├── ios/              # iOS 原生项目
├── www/              # Capacitor Web 资源 (自动生成)
├── public/           # Web 源代码
├── src/              # Node.js 后端
├── capacitor.config.ts
└── package.json
```

## ⚡ 常用命令

```bash
# 同步所有平台
npx cap sync

# 只同步 Android
npx cap sync android

# 只同步 iOS  
npx cap sync ios

# 更新 Capacitor 插件
npx cap update

# 检查配置
npx cap doctor
```

## 🌐 API 服务器

应用需要连接后端 API 获取实时数据：
- 生产环境: `http://<your-server>:30089`
- 本地开发: `http://localhost:3000`

如需修改服务器地址，编辑 `capacitor.config.ts` 中的 `server.url`。

## 🐛 常见问题

### Gradle 同步失败
```bash
cd android && ./gradlew clean
```

### iOS Pod 安装失败
```bash
cd ios/App && pod install --repo-update
```

### Web 资源没更新
```bash
rm -rf www && npm run cap:sync
```
