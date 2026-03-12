import React from 'react'; // 导入 React。
import { Pressable, StyleSheet, Text, View } from 'react-native'; // 导入 RN 基础组件。

/**
 * 瓶子标记组件：展示单个瓶子的状态并支持触发拾取。
 * @param {object} props - 组件入参。
 * @param {object} props.bottle - 瓶子数据。
 * @param {Function} props.onPickupPress - 点击拾取回调。
 * @param {boolean} props.isPickingUp - 当前瓶子是否处于拾取中。
 */
const BottleMarker = ({ bottle, onPickupPress, isPickingUp }) => {
  // 提取并格式化距离展示文本。
  const distanceLabel = Number.isFinite(Number(bottle?.distanceMeters))
    ? `${Math.round(Number(bottle.distanceMeters))}m`
    : '未知距离';

  // 计算按钮是否可点击。
  const canPressPickup = Boolean(bottle?.canPickup) && !isPickingUp;

  // 计算状态文案。
  const statusLabel = bottle?.hasPickedUp ? '已拾取' : bottle?.canPickup ? '可拾取' : '未解锁';

  return (
    // 外层容器。
    <View style={styles.cardContainer}>
      {/* 标题行 */}
      <View style={styles.row}>
        <Text style={styles.titleText}>漂流瓶</Text>
        <Text style={styles.distanceText}>{distanceLabel}</Text>
      </View>

      {/* 状态信息 */}
      <Text style={styles.statusText}>状态：{statusLabel}</Text>

      {/* 内容预览：仅在可见时展示 */}
      {bottle?.content ? <Text style={styles.contentText}>{bottle.content}</Text> : null}

      {/* 拾取按钮 */}
      <Pressable
        style={[styles.pickupButton, !canPressPickup && styles.pickupButtonDisabled]}
        onPress={onPickupPress}
        disabled={!canPressPickup}
      >
        <Text style={styles.pickupButtonText}>{isPickingUp ? '拾取中...' : '尝试拾取'}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  // 卡片容器样式。
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e7e7e7',
  },
  // 通用行布局。
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  // 标题文字。
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1c1c',
  },
  // 距离文字。
  distanceText: {
    fontSize: 13,
    color: '#666666',
  },
  // 状态文字。
  statusText: {
    fontSize: 13,
    color: '#444444',
    marginBottom: 6,
  },
  // 内容文字。
  contentText: {
    fontSize: 14,
    color: '#222222',
    lineHeight: 20,
    marginBottom: 8,
  },
  // 拾取按钮。
  pickupButton: {
    backgroundColor: '#1e88e5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  // 禁用态按钮。
  pickupButtonDisabled: {
    backgroundColor: '#b0c7df',
  },
  // 按钮文字。
  pickupButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BottleMarker; // 导出组件。
