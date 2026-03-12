import { AppRegistry } from 'react-native'; // 导入 RN 注册入口 API。
import App from './App'; // 导入根组件。

// 定义应用注册名。
// 说明：若你的原生工程使用了不同应用名，请同步修改此常量。
const APP_NAME = 'GeoBottle';

// 将根组件注册到 React Native 运行时。
AppRegistry.registerComponent(APP_NAME, () => App);
