package com.geobottle; // 声明 Java 包名，与 AndroidManifest 保持一致。

import com.facebook.react.ReactActivity; // 导入 ReactActivity 基类。

/**
 * Android 主 Activity：承载 React Native 页面。
 */
public class MainActivity extends ReactActivity {

    /**
     * 返回 React Native 注册组件名，必须与 index.js 的 AppRegistry 一致。
     */
    @Override
    protected String getMainComponentName() {
        return "GeoBottle";
    }
}
