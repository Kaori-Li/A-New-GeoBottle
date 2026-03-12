/* eslint-disable no-console */ // 允许脚本输出诊断日志。
const fs = require('node:fs'); // 导入文件系统模块。
const path = require('node:path'); // 导入路径模块。

// 计算 mobile 根目录绝对路径。
const mobileRoot = path.resolve(__dirname, '..');

// 定义需要存在的关键文件列表。
const requiredFiles = [
  'App.js',
  'index.js',
  'src/services/apiClient.js',
  'src/services/authService.js',
  'src/services/bottleService.js',
  'src/hooks/useLocation.js',
  'src/hooks/useGeofencing.js',
  'src/components/MapContainer.js',
  'src/components/BottleMarker.js',
  'src/screens/HomeMapScreen.js',
  'src/screens/TossScreen.js',
  'src/screens/LoginScreen.js',
  'src/screens/ProfileScreen.js',
  'android/app/src/main/AndroidManifest.xml',
  'ios/AppName/Info.plist',
];

// 定义失败收集数组。
const failures = [];

// 检查关键文件是否存在。
requiredFiles.forEach((relativeFilePath) => {
  // 计算文件绝对路径。
  const absoluteFilePath = path.resolve(mobileRoot, relativeFilePath);

  // 若文件不存在则记录失败。
  if (!fs.existsSync(absoluteFilePath)) {
    failures.push(`缺少关键文件: ${relativeFilePath}`);
  }
});

// 读取 package.json 以检查关键脚本与依赖。
const packageJsonPath = path.resolve(mobileRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 检查必须脚本是否存在。
['start', 'android', 'ios', 'test'].forEach((scriptName) => {
  if (!packageJson?.scripts?.[scriptName]) {
    failures.push(`package.json 缺少 scripts.${scriptName}`);
  }
});

// 检查关键依赖。
['react', 'react-native', 'react-native-maps', 'react-native-geolocation-service'].forEach((dependencyName) => {
  if (!packageJson?.dependencies?.[dependencyName]) {
    failures.push(`package.json 缺少 dependencies.${dependencyName}`);
  }
});

// 读取 AndroidManifest 并检查关键权限。
const androidManifestPath = path.resolve(mobileRoot, 'android/app/src/main/AndroidManifest.xml');
const androidManifestText = fs.readFileSync(androidManifestPath, 'utf8');

[
  'android.permission.INTERNET',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.VIBRATE',
].forEach((permissionName) => {
  if (!androidManifestText.includes(permissionName)) {
    failures.push(`AndroidManifest 缺少权限: ${permissionName}`);
  }
});

// 读取 iOS plist 并检查关键权限文案。
const iosPlistPath = path.resolve(mobileRoot, 'ios/AppName/Info.plist');
const iosPlistText = fs.readFileSync(iosPlistPath, 'utf8');

[
  'NSLocationWhenInUseUsageDescription',
  'NSLocationAlwaysAndWhenInUseUsageDescription',
].forEach((plistKey) => {
  if (!iosPlistText.includes(plistKey)) {
    failures.push(`Info.plist 缺少键: ${plistKey}`);
  }
});

// 根据检查结果输出报告。
if (failures.length > 0) {
  // 输出失败摘要。
  console.error('Mobile smoke check failed:');
  // 逐条输出失败详情。
  failures.forEach((failureMessage) => console.error(`- ${failureMessage}`));
  // 以非零状态退出。
  process.exit(1);
}

// 输出通过信息。
console.log('Mobile smoke check passed.');
