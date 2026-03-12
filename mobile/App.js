import React, { useEffect, useMemo, useState } from 'react'; // 导入 React 与常用 Hook。
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'; // 导入 RN 基础组件。
import HomeMapScreen from './src/screens/HomeMapScreen'; // 导入地图首页。
import LoginScreen from './src/screens/LoginScreen'; // 导入登录页。
import ProfileScreen from './src/screens/ProfileScreen'; // 导入个人中心页。
import TossScreen from './src/screens/TossScreen'; // 导入投掷页。
import { getStoredToken } from './src/services/authService'; // 导入 token 读取方法。
import { registerUnauthorizedHandler, unregisterUnauthorizedHandler } from './src/services/apiClient'; // 导入全局未授权处理器。
import { LocationProvider } from './src/context/LocationContext';

// 定义页面键值常量，便于统一维护。
const SCREEN_KEYS = {
  HOME: 'home',
  TOSS: 'toss',
  PROFILE: 'profile',
};

/**
 * 应用根组件。
 */
const App = () => {
  // 保存登录态标记。
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // 标记应用是否完成启动期登录态恢复。
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  // 保存当前激活页面。
  const [activeScreenKey, setActiveScreenKey] = useState(SCREEN_KEYS.HOME);

  // 启动阶段读取本地 token，恢复登录态。
  useEffect(() => {
    let isMounted = true;

    const bootstrapAuthState = async () => {
      try {
        const token = await getStoredToken();
        if (isMounted) {
          setIsAuthenticated(Boolean(token));
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrapAuthState();

    return () => {
      isMounted = false;
    };
  }, []);

  // 注册全局未授权处理器：任意 401/403 自动回到登录态。
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setIsAuthenticated(false);
      setActiveScreenKey(SCREEN_KEYS.HOME);
    });

    return () => {
      unregisterUnauthorizedHandler();
    };
  }, []);

  // 处理登录成功：切换为已登录并回到首页。
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setActiveScreenKey(SCREEN_KEYS.HOME);
  };

  // 处理退出登录：回到登录页。
  const handleLogoutSuccess = () => {
    setIsAuthenticated(false);
    setActiveScreenKey(SCREEN_KEYS.HOME);
  };

  // 根据当前页签生成屏幕标题。
  const currentScreenTitle = useMemo(() => {
    switch (activeScreenKey) {
      case SCREEN_KEYS.HOME:
        return '附近瓶子';
      case SCREEN_KEYS.TOSS:
        return '投掷';
      case SCREEN_KEYS.PROFILE:
        return '我的';
      default:
        return 'GeoBottle';
    }
  }, [activeScreenKey]);

  // 启动期加载中。
  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.bootContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.bootText}>正在恢复会话...</Text>
      </SafeAreaView>
    );
  }

  // 未登录时仅渲染登录屏幕。
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.rootContainer}>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

  // 根据页签渲染主内容区域。
  const renderMainContent = () => {
    switch (activeScreenKey) {
      case SCREEN_KEYS.HOME:
        return <HomeMapScreen />;
      case SCREEN_KEYS.TOSS:
        return <TossScreen />;
      case SCREEN_KEYS.PROFILE:
        return <ProfileScreen onLogoutSuccess={handleLogoutSuccess} />;
      default:
        return <HomeMapScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.rootContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitleText}>GeoBottle</Text>
        <Text style={styles.headerSubtitleText}>{currentScreenTitle}</Text>
      </View>

      <LocationProvider>
        <View style={styles.contentContainer}>{renderMainContent()}</View>
      </LocationProvider>

      <View style={styles.tabBarContainer}>
        <Pressable style={styles.tabBarButton} onPress={() => setActiveScreenKey(SCREEN_KEYS.HOME)}>
          <Text style={[styles.tabBarButtonText, activeScreenKey === SCREEN_KEYS.HOME && styles.tabBarButtonTextActive]}>
            地图
          </Text>
        </Pressable>

        <Pressable style={styles.tabBarButton} onPress={() => setActiveScreenKey(SCREEN_KEYS.TOSS)}>
          <Text style={[styles.tabBarButtonText, activeScreenKey === SCREEN_KEYS.TOSS && styles.tabBarButtonTextActive]}>
            投掷
          </Text>
        </Pressable>

        <Pressable style={styles.tabBarButton} onPress={() => setActiveScreenKey(SCREEN_KEYS.PROFILE)}>
          <Text
            style={[
              styles.tabBarButtonText,
              activeScreenKey === SCREEN_KEYS.PROFILE && styles.tabBarButtonTextActive,
            ]}
          >
            我的
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#eef3f9',
  },
  bootContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#eef3f9',
  },
  bootText: {
    color: '#4f6780',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dce6f3',
    backgroundColor: '#ffffff',
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f2740',
  },
  headerSubtitleText: {
    marginTop: 2,
    fontSize: 13,
    color: '#4e6780',
  },
  contentContainer: {
    flex: 1,
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: 56,
    borderTopWidth: 1,
    borderTopColor: '#dce6f3',
    backgroundColor: '#ffffff',
  },
  tabBarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarButtonText: {
    fontSize: 14,
    color: '#4f6780',
    fontWeight: '600',
  },
  tabBarButtonTextActive: {
    color: '#1e88e5',
    fontWeight: '800',
  },
});

export default App; // 导出根组件。
