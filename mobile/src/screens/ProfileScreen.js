import React, { useEffect, useState } from 'react'; // 导入 React 与 Hook。
import { Pressable, StyleSheet, Text, View } from 'react-native'; // 导入 RN 组件。
import { getStoredToken, logout } from '../services/authService'; // 导入认证相关服务。

/**
 * 个人中心页：展示当前登录状态并支持退出。
 */
const ProfileScreen = ({ onLogoutSuccess }) => {
  // 保存 token 预览。
  const [tokenPreview, setTokenPreview] = useState('');
  // 保存提示消息。
  const [message, setMessage] = useState('');

  useEffect(() => {
    // 初始化时读取 token。
    const bootstrap = async () => {
      // 读取本地 token。
      const token = await getStoredToken();

      // 如果 token 存在，截断展示前 24 位。
      if (token) {
        setTokenPreview(`${token.slice(0, 24)}...`);
      }
    };

    // 执行初始化。
    bootstrap();
  }, []);

  // 执行退出登录。
  const handleLogoutPress = async () => {
    // 调用退出服务。
    await logout();

    // 展示提示。
    setMessage('已退出登录');

    // 通知外层。
    if (typeof onLogoutSuccess === 'function') {
      onLogoutSuccess();
    }
  };

  return (
    // 页面容器。
    <View style={styles.container}>
      {/* 标题 */}
      <Text style={styles.title}>个人中心</Text>

      {/* token 预览 */}
      <Text style={styles.label}>Token 预览</Text>
      <Text style={styles.value}>{tokenPreview || '当前未登录'}</Text>

      {/* 退出按钮 */}
      <Pressable style={styles.logoutButton} onPress={handleLogoutPress}>
        <Text style={styles.logoutButtonText}>退出登录</Text>
      </Pressable>

      {/* 提示消息 */}
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // 页面容器。
  container: {
    flex: 1,
    backgroundColor: '#f6f8fc',
    padding: 16,
  },
  // 标题。
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#102741',
    marginBottom: 16,
  },
  // 标签文本。
  label: {
    color: '#4d6782',
    marginBottom: 6,
  },
  // 值文本。
  value: {
    fontSize: 13,
    color: '#223a55',
    marginBottom: 18,
  },
  // 退出按钮。
  logoutButton: {
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e53935',
  },
  // 退出按钮文字。
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  // 提示文字。
  message: {
    marginTop: 12,
    color: '#355a7f',
  },
});

export default ProfileScreen; // 导出页面。
