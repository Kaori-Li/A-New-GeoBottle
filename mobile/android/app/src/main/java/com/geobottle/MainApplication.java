package com.geobottle; // 声明 Java 包名，与 AndroidManifest 保持一致。

import android.app.Application; // 导入 Android Application 基类。
import com.facebook.react.ReactApplication; // 导入 ReactApplication 接口。
import com.facebook.react.ReactNativeHost; // 导入 ReactNativeHost。
import com.facebook.react.ReactPackage; // 导入 ReactPackage。
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint; // 导入新架构入口。
import com.facebook.react.defaults.DefaultReactNativeHost; // 导入默认 RN Host 实现。
import com.facebook.soloader.SoLoader; // 导入 SoLoader。
import java.util.List; // 导入 List。

/**
 * Android 应用入口：负责初始化 React Native 运行时。
 */
public class MainApplication extends Application implements ReactApplication {

    // 创建 ReactNativeHost 实例。
    private final ReactNativeHost mReactNativeHost =
        new DefaultReactNativeHost(this) {
            // 返回自动链接后的 ReactPackage 列表。
            @Override
            public List<ReactPackage> getPackages() {
                return new com.facebook.react.PackageList(this).getPackages();
            }

            // 声明 JS 主模块路径。
            @Override
            protected String getJSMainModuleName() {
                return "index";
            }

            // 开启开发模式开关。
            @Override
            public boolean getUseDeveloperSupport() {
                return BuildConfig.DEBUG;
            }

            // 是否启用新架构。
            @Override
            protected boolean isNewArchEnabled() {
                return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
            }

            // 是否启用 Hermes 引擎。
            @Override
            protected Boolean isHermesEnabled() {
                return BuildConfig.IS_HERMES_ENABLED;
            }
        };

    // 暴露 ReactNativeHost 给框架。
    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    // 应用启动初始化。
    @Override
    public void onCreate() {
        super.onCreate();

        // 初始化 SoLoader。
        SoLoader.init(this, false);

        // 若启用新架构，则加载入口。
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            DefaultNewArchitectureEntryPoint.load();
        }
    }
}
