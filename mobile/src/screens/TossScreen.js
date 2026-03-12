import React, { useState } from 'react'; // 导入 React 与状态 Hook。
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'; // 导入 RN 组件。
import { useLocationContext } from '../context/LocationContext';
import { tossBottle } from '../services/bottleService'; // 导入投掷服务。

/**
 * 投掷页面：提交文本与当前位置到后端。
 */
const TossScreen = () => {
  // 瓶子文本输入。
  const [content, setContent] = useState('');
  // TTL 分钟输入。
  const [ttlMinutes, setTtlMinutes] = useState('1440');
  // 请求状态。
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 页面反馈信息。
  const [message, setMessage] = useState('');

  // 读取当前位置。
  const { location, errorMessage: locationErrorMessage } = useLocationContext();

  // 执行投掷提交。
  const handleTossPress = async () => {
    // 开启提交状态并清空旧消息。
    setIsSubmitting(true);
    setMessage('');

    try {
      // 调用后端投掷接口。
      const response = await tossBottle({
        content: content.trim(),
        lng: location.lng,
        lat: location.lat,
        ttlMinutes: Number(ttlMinutes),
      });

      // 重置输入框。
      setContent('');

      // 展示成功提示。
      setMessage(`投掷成功，ID: ${response?.data?.id || '-'}`);
    } catch (error) {
      // 展示失败信息。
      setMessage(error?.message || '投掷失败，请稍后重试');
    } finally {
      // 关闭提交状态。
      setIsSubmitting(false);
    }
  };

  return (
    // 页面容器。
    <View style={styles.container}>
      {/* 页面标题 */}
      <Text style={styles.title}>投掷漂流瓶</Text>

      {/* 内容输入 */}
      <TextInput
        style={styles.contentInput}
        value={content}
        onChangeText={setContent}
        placeholder="写下此刻想留下的话（1~200字）"
        maxLength={200}
        multiline
      />

      {/* TTL 输入 */}
      <TextInput
        style={styles.ttlInput}
        value={ttlMinutes}
        onChangeText={setTtlMinutes}
        keyboardType="number-pad"
        placeholder="生存时长（分钟）"
      />

      {/* 位置信息 */}
      <Text style={styles.locationText}>当前位置：{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</Text>

      {/* 定位错误提示 */}
      {locationErrorMessage ? <Text style={styles.warnText}>定位提示：{locationErrorMessage}</Text> : null}

      {/* 提交按钮 */}
      <Pressable style={styles.submitButton} onPress={handleTossPress} disabled={isSubmitting}>
        <Text style={styles.submitButtonText}>确认投掷</Text>
      </Pressable>

      {/* 加载状态 */}
      {isSubmitting ? <ActivityIndicator style={styles.loader} /> : null}

      {/* 消息区 */}
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // 页面容器样式。
  container: {
    flex: 1,
    backgroundColor: '#f6f8fc',
    padding: 16,
  },
  // 标题样式。
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f2640',
    marginBottom: 12,
  },
  // 内容输入框。
  contentInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#d8dfeb',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  // TTL 输入框。
  ttlInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d8dfeb',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  // 位置文案。
  locationText: {
    color: '#2b4f73',
    marginBottom: 8,
  },
  // 警告文案。
  warnText: {
    color: '#9c5d00',
    marginBottom: 8,
  },
  // 提交按钮。
  submitButton: {
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e88e5',
  },
  // 提交按钮文字。
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  // 加载器。
  loader: {
    marginTop: 12,
  },
  // 消息文字。
  message: {
    marginTop: 12,
    color: '#375a80',
  },
});

export default TossScreen; // 导出页面。
