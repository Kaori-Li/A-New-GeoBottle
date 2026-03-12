import React, { useState } from 'react'; // 导入 React 与状态 Hook。
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'; // 导入 RN 组件。
import { guestLogin, login, register } from '../services/authService'; // 导入认证服务。

/**
 * 登录页：支持密码登录、注册与游客登录。
 * @param {object} props - 页面属性。
 * @param {Function} [props.onLoginSuccess] - 登录成功回调。
 */
const LoginScreen = ({ onLoginSuccess }) => {
  // 用户名输入状态。
  const [username, setUsername] = useState('');
  // 密码输入状态。
  const [password, setPassword] = useState('');
  // 异步提交状态。
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 反馈消息。
  const [message, setMessage] = useState('');

  // 统一处理成功回调。
  const handleAuthSuccess = (payload) => {
    // 设置成功提示。
    setMessage('登录成功');

    // 若外部注入了成功回调，则向上通知。
    if (typeof onLoginSuccess === 'function') {
      onLoginSuccess(payload);
    }
  };

  // 统一错误展示。
  const handleAuthError = (error) => {
    // 优先显示后端 message。
    setMessage(error?.message || '请求失败，请稍后重试');
  };

  // 普通登录操作。
  const handleLoginPress = async () => {
    // 打开提交状态。
    setIsSubmitting(true);

    try {
      // 调用登录接口。
      const payload = await login(username.trim(), password);
      // 处理成功。
      handleAuthSuccess(payload);
    } catch (error) {
      // 处理失败。
      handleAuthError(error);
    } finally {
      // 关闭提交状态。
      setIsSubmitting(false);
    }
  };

  // 注册操作。
  const handleRegisterPress = async () => {
    // 打开提交状态。
    setIsSubmitting(true);

    try {
      // 调用注册接口。
      const payload = await register(username.trim(), password);
      // 处理成功。
      handleAuthSuccess(payload);
    } catch (error) {
      // 处理失败。
      handleAuthError(error);
    } finally {
      // 关闭提交状态。
      setIsSubmitting(false);
    }
  };

  // 游客登录操作。
  const handleGuestLoginPress = async () => {
    // 打开提交状态。
    setIsSubmitting(true);

    try {
      // 调用游客登录。
      const payload = await guestLogin();
      // 处理成功。
      handleAuthSuccess(payload);
    } catch (error) {
      // 处理失败。
      handleAuthError(error);
    } finally {
      // 关闭提交状态。
      setIsSubmitting(false);
    }
  };

  return (
    // 页面容器。
    <View style={styles.container}>
      {/* 标题区域 */}
      <Text style={styles.title}>GeoBottle</Text>
      <Text style={styles.subtitle}>一个基于位置的异步社交实验</Text>

      {/* 用户名输入框 */}
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        placeholder="用户名"
        editable={!isSubmitting}
      />

      {/* 密码输入框 */}
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="密码"
        editable={!isSubmitting}
      />

      {/* 按钮组 */}
      <Pressable style={styles.primaryButton} onPress={handleLoginPress} disabled={isSubmitting}>
        <Text style={styles.primaryButtonText}>登录</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={handleRegisterPress} disabled={isSubmitting}>
        <Text style={styles.secondaryButtonText}>注册</Text>
      </Pressable>

      <Pressable style={styles.ghostButton} onPress={handleGuestLoginPress} disabled={isSubmitting}>
        <Text style={styles.ghostButtonText}>游客模式进入</Text>
      </Pressable>

      {/* 加载状态 */}
      {isSubmitting ? <ActivityIndicator style={styles.loading} /> : null}

      {/* 提示消息 */}
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // 页面容器。
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f7f9fc',
  },
  // 标题。
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0b1e33',
    marginBottom: 8,
  },
  // 副标题。
  subtitle: {
    fontSize: 14,
    color: '#52708f',
    marginBottom: 24,
  },
  // 输入框样式。
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d6dfeb',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  // 主按钮。
  primaryButton: {
    backgroundColor: '#1e88e5',
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  // 主按钮文字。
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  // 次按钮。
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#1e88e5',
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  // 次按钮文字。
  secondaryButtonText: {
    color: '#1e88e5',
    fontSize: 15,
    fontWeight: '700',
  },
  // 游客按钮。
  ghostButton: {
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 游客按钮文字。
  ghostButtonText: {
    color: '#4a6078',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  // 加载指示器。
  loading: {
    marginTop: 12,
  },
  // 消息文本。
  message: {
    marginTop: 12,
    textAlign: 'center',
    color: '#445b73',
  },
});

export default LoginScreen; // 导出页面组件。
