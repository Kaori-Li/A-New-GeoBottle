import React from 'react'; // 导入 React。
import { FlatList, StyleSheet, Text, View } from 'react-native'; // 导入 RN 基础组件。
import MapView, { Marker } from 'react-native-maps';
import BottleMarker from './BottleMarker'; // 导入单个瓶子展示组件。

/**
 * 地图容器组件：展示真实地图点位 + 瓶子列表。
 * @param {object} props - 组件入参。
 * @param {{lat:number,lng:number}} props.location - 当前用户位置。
 * @param {Array} props.bottles - 瓶子列表。
 * @param {Function} props.onPickupBottle - 拾取回调。
 * @param {string|null} props.pickingBottleId - 当前拾取中的瓶子 ID。
 */
const MapContainer = ({ location, bottles, onPickupBottle, pickingBottleId, onSearchRegion }) => {
  const safeBottles = Array.isArray(bottles) ? bottles : [];
  const [followUserLocation, setFollowUserLocation] = useState(true);
  const [region, setRegion] = useState(DEFAULT_REGION);

  const userRegion = useMemo(() => ({
    latitude: Number(location?.lat) || DEFAULT_REGION.latitude,
    longitude: Number(location?.lng) || DEFAULT_REGION.longitude,
    latitudeDelta: region.latitudeDelta,
    longitudeDelta: region.longitudeDelta,
  }), [location?.lat, location?.lng, region.latitudeDelta, region.longitudeDelta]);

  const effectiveRegion = followUserLocation ? userRegion : region;

  const renderEmptyState = () => <Text style={styles.emptyText}>附近还没有可见瓶子，试试移动位置后刷新。</Text>;

  const renderBottleItem = ({ item }) => (
    <BottleMarker
      bottle={item}
      isPickingUp={pickingBottleId === item.id}
      onPickupPress={() => onPickupBottle(item)}
    />
  );

  const handleRegionChangeComplete = (nextRegion) => {
    setRegion(nextRegion);
    if (followUserLocation) {
      setFollowUserLocation(false);
    }
  };

  const safeBottles = Array.isArray(bottles) ? bottles : [];

  return (
    <View style={styles.container}>
      <View style={styles.locationCard}>
        <Text style={styles.locationTitle}>当前位置</Text>
        <Text style={styles.locationValue}>
          {location?.lat?.toFixed?.(6) ?? '-'}, {location?.lng?.toFixed?.(6) ?? '-'}
        </Text>
      </View>

      {/* 地图点位层 */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: Number(location?.lat) || 30.2741,
          longitude: Number(location?.lng) || 120.1551,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        region={{
          latitude: Number(location?.lat) || 30.2741,
          longitude: Number(location?.lng) || 120.1551,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{
            latitude: Number(location?.lat) || 30.2741,
            longitude: Number(location?.lng) || 120.1551,
          }}
          title="你的位置"
          pinColor="#1e88e5"
        />

        {safeBottles.map((item) => {
          const [lng, lat] = item?.location?.coordinates || [];

          if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
            return null;
          }

          return (
            <Marker
              key={String(item.id)}
              coordinate={{ latitude: Number(lat), longitude: Number(lng) }}
              title="漂流瓶"
              description={item?.canPickup ? '可拾取' : '靠近后可拾取'}
              pinColor={item?.canPickup ? '#2e7d32' : '#fb8c00'}
            />
          );
        })}
      </MapView>

      {/* 点位详情列表 */}
      <FlatList
        data={safeBottles}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderBottleItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  locationCard: {
    backgroundColor: '#eef6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d5e8fb',
    padding: 12,
    marginBottom: 12,
  },
  // 位置标题。
  locationTitle: {
    color: '#1f4e79',
    fontSize: 13,
    marginBottom: 4,
  },
  // 位置值。
  locationValue: {
    color: '#0f2740',
    fontWeight: '700',
    fontSize: 15,
  },
  map: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  // 列表内容容器。
  listContentContainer: {
    paddingBottom: 16,
  },
  // 空态文本。
  emptyText: {
    textAlign: 'center',
    color: '#666666',
    marginTop: 24,
    fontSize: 14,
  },
  locationTitle: { color: '#1f4e79', fontSize: 13, marginBottom: 4 },
  locationValue: { color: '#0f2740', fontWeight: '700', fontSize: 15 },
  mapToolbar: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  mapToolbarBtn: { flex: 1, backgroundColor: '#245d8f', borderRadius: 8, height: 36, justifyContent: 'center', alignItems: 'center' },
  mapToolbarBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  map: { height: 220, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  listContentContainer: { paddingBottom: 16 },
  emptyText: { textAlign: 'center', color: '#666666', marginTop: 24, fontSize: 14 },
});

export default MapContainer;
