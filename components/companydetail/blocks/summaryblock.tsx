import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useRef, useState } from 'react';
import Themestore from '../../../store/themestore';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../../../assets/utils/fontfamily';
import DatePicker from 'react-native-date-picker';
import Piechart from '../charts/piechart';
import Nodechart from '../charts/nodechart';
import { scheduleOnRN } from 'react-native-worklets';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

const Summaryblock: React.FC = () => {
  const [date, setDate] = useState(new Date());
  const [open, setOpen] = useState<boolean>(false);
  const theme = Themestore(state => state.theme);
  const mode = Themestore(state => state.mode);

  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [isLocked, setIsLocked] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const startZoom = useRef(0.8);
  const MIN_ZOOM = 0.8;
  const MAX_ZOOM = 2.0;

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startZoom.current = zoomLevel;
    })
    .onUpdate(event => {
      const nextScale = startZoom.current * event.scale;
      const clamped = Math.min(Math.max(nextScale, MIN_ZOOM), MAX_ZOOM);
      scheduleOnRN(setZoomLevel, clamped);
    })
    .runOnJS(true);
  const handlePinchSync = (newZoom: number) => {
    if (newZoom >= 0.8 && newZoom <= 2.0) {
      setZoomLevel(newZoom);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => {
      const next = prev + 0.2;
      return next <= 2.0 ? next : 2.0;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const next = prev - 0.2;
      return next >= 0.8 ? next : 0.8;
    });
  };
  const toggleLock = () => setIsLocked(!isLocked);

  const renderChart = (isFull: boolean) => {
    return (
      <View style={{ flex: 1 }}>
        <Nodechart
          zoom={zoomLevel}
          roamType={isLocked ? true : 'move'}
          isFullScreen={isFull}
          onZoomChange={handlePinchSync}
        />
      </View>
    );
  };

  return (
    <>
      <View
        style={[styles.yieldbox, { borderColor: theme.colors.bordercolor }]}
      >
        <View
          style={[
            styles.yieldboxheader,
            { backgroundColor: theme.colors.cardheader },
          ]}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Text
              style={[
                styles.yieldboxheadertitile,
                { color: theme.colors.title },
              ]}
            >
              Yield
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statCardContainer,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 8,
            },
          ]}
        >
          <View
            style={[
              styles.indicatorBar,
              { backgroundColor: theme.colors.iconcolor },
            ]}
          />
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: theme.colors.text }]}>
              Total Plant Yield
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.title }]}>
              106,104.46 mWh
            </Text>
          </View>
          <View style={styles.statIconContainer}>
            <FontAwesome6
              iconStyle="solid"
              name="bolt"
              size={20}
              color={theme.colors.iconcolor}
            />
          </View>
        </View>

        <View
          style={[
            styles.statCardContainer,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 0,
            },
          ]}
        >
          <View
            style={[
              styles.indicatorBar,
              { backgroundColor: theme.colors.iconcolor },
            ]}
          />
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: theme.colors.text }]}>
              Revenue
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.title }]}>
              20,159,846.83 USD
            </Text>
          </View>
          <View style={styles.statIconContainer}>
            <FontAwesome6
              iconStyle="solid"
              name="chart-line"
              size={20}
              color={theme.colors.iconcolor}
            />
          </View>
        </View>
      </View>

      <View
        style={[
          styles.environmentbox,
          { borderColor: theme.colors.bordercolor },
        ]}
      >
        <View
          style={[
            styles.environmentboxheader,
            { backgroundColor: theme.colors.cardheader },
          ]}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Text
              style={[
                styles.yieldboxheadertitile,
                { color: theme.colors.title },
              ]}
            >
              Environmental Benefits
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statCardContainer,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 8,
            },
          ]}
        >
          <View style={[styles.indicatorBar, { backgroundColor: '#e8f80c' }]} />
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: theme.colors.text }]}>
              CO₂ Reduction
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.title }]}>
              22,529.16 Tons
            </Text>
          </View>
          <View style={styles.statIconContainer}>
            <FontAwesome6
              iconStyle="solid"
              name="seedling"
              size={20}
              color={theme.colors.iconcolor}
            />
          </View>
        </View>

        <View
          style={[
            styles.statCardContainer,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 8,
            },
          ]}
        >
          <View
            style={[
              styles.indicatorBar,
              { backgroundColor: theme.colors.warningbtnbg },
            ]}
          />
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: theme.colors.text }]}>
              Coal Saved
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.title }]}>
              50,865,032.12 Tons
            </Text>
          </View>
          <View style={styles.statIconContainer}>
            <FontAwesome6
              iconStyle="solid"
              name="industry"
              size={20}
              color={theme.colors.warningbtnbg}
            />
          </View>
        </View>

        <View
          style={[
            styles.statCardContainer,
            {
              backgroundColor: theme.colors.overlaybackground,
            },
          ]}
        >
          <View
            style={[
              styles.indicatorBar,
              { backgroundColor: theme.colors.iconcolor },
            ]}
          />
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: theme.colors.text }]}>
              Trees Planted
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.title }]}>
              120,573,246.59 Nos.
            </Text>
          </View>
          <View style={styles.statIconContainer}>
            <FontAwesome6
              iconStyle="solid"
              name="seedling"
              size={20}
              color={theme.colors.iconcolor}
            />
          </View>
        </View>
      </View>

      <View
        style={[
          styles.nodechartbox,
          {
            height: 280,
            justifyContent: 'center',
            alignItems: 'center',
            borderColor: theme.colors.bordercolor,
            backgroundColor: theme.colors.background,
            overflow: 'hidden',
          },
        ]}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <GestureDetector gesture={pinchGesture}>
            {renderChart(false)}
          </GestureDetector>
        </GestureHandlerRootView>

        <View
          style={{
            position: 'absolute',
            bottom: 15,
            left: 15,
            right: 15,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            pointerEvents: 'box-none',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor:
                mode === 'dark'
                  ? 'rgba(26,26,26,0.8)'
                  : 'rgba(235,235,235,0.8)',
              borderRadius: 100,
              borderWidth: 1,
              borderColor: theme.colors.bordercolor,
              height: 36,
              paddingHorizontal: 10,
            }}
          >
            <TouchableOpacity
              disabled={zoomLevel === MAX_ZOOM || isLocked === true}
              style={{ padding: 8 }}
              onPress={handleZoomIn}
            >
              <FontAwesome6
                iconStyle="solid"
                name="plus"
                size={12}
                disabled={zoomLevel === MAX_ZOOM || isLocked === true}
                color={
                  zoomLevel === MAX_ZOOM || isLocked === true
                    ? theme.colors.inputborder
                    : theme.colors.iconsecondary
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              disabled={zoomLevel === MIN_ZOOM || isLocked === true}
              style={{ padding: 8 }}
              onPress={handleZoomOut}
            >
              <FontAwesome6
                iconStyle="solid"
                name="minus"
                size={12}
                disabled={zoomLevel === MIN_ZOOM || isLocked === true}
                color={
                  zoomLevel === MIN_ZOOM || isLocked === true
                    ? theme.colors.inputborder
                    : theme.colors.iconsecondary
                }
              />
            </TouchableOpacity>

            <View
              style={{
                width: 1,
                height: 16,
                backgroundColor: '#333',
                marginHorizontal: 4,
              }}
            />

            <TouchableOpacity style={{ padding: 8 }} onPress={toggleLock}>
              <FontAwesome6
                iconStyle="solid"
                name={isLocked ? 'lock' : 'lock-open'}
                size={12}
                color={isLocked ? theme.colors.title : theme.colors.title}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={{ padding: 8 }}
              onPress={() => setFullScreen(true)}
            >
              <FontAwesome6
                iconStyle="solid"
                name="expand"
                size={12}
                color={theme.colors.iconsecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View
        style={[styles.reportbox, { borderColor: theme.colors.bordercolor }]}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
          }}
        >
          <Text style={[styles.reporttitle, { color: theme.colors.title }]}>
            Performance Report
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.datepickerbackground,
                paddingVertical: 6,
                paddingHorizontal: 12,
                height: 24,
                borderRadius: 65,
                marginHorizontal: 8,
              }}
              onPress={() => setOpen(true)}
            >
              <FontAwesome6
                name="calendar"
                size={12}
                color={theme.colors.iconbuttontext}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontSize: 10,
                  color: theme.colors.iconbuttontext,
                  fontFamily: getFontFamily('true', 'medium'),
                }}
              >
                15/12/25 - 17/12/25
              </Text>
              <DatePicker
                modal
                open={open}
                date={date}
                onConfirm={date => {
                  setOpen(false);
                  setDate(date);
                }}
                onCancel={() => {
                  setOpen(false);
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.buttonbg,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 65,
              }}
              onPress={() => Alert.alert('Exporting Report...')}
            >
              <FontAwesome6
                iconStyle="solid"
                name="file-export"
                size={12}
                color={theme.colors.iconbuttonicon}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontSize: 8,
                  color: theme.colors.iconbuttontext,
                  fontFamily: getFontFamily('true', 'medium'),
                }}
              >
                Export
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Piechart />

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: 5,
            gap: 8,
          }}
        >
          <View
            style={{
              backgroundColor: '#D03A3A',
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 100,
            }}
          >
            <Text
              style={{
                fontSize: 6,
                color: theme.colors.buttontext,
                fontFamily: getFontFamily('true', 'semi-bold'),
              }}
            >
              Genset Production (kWh)
            </Text>
          </View>
          <View
            style={{
              backgroundColor: '#118AD6',
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 100,
            }}
          >
            <Text
              style={{
                fontSize: 6,
                color: theme.colors.buttontext,
                fontFamily: getFontFamily('true', 'semi-bold'),
              }}
            >
              Solar Power Generation (kWh)
            </Text>
          </View>
          <View
            style={{
              backgroundColor: '#118AD6',
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 100,
            }}
          >
            <Text
              style={{
                fontSize: 6,
                color: theme.colors.buttontext,
                fontFamily: getFontFamily('true', 'semi-bold'),
              }}
            >
              Wind Turbine Output (kWh)
            </Text>
          </View>
          <View
            style={{
              backgroundColor: '#3a5fd0',
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 100,
            }}
          >
            <Text
              style={{
                fontSize: 6,
                color: theme.colors.buttontext,
                fontFamily: getFontFamily('true', 'semi-bold'),
              }}
            >
              Wind Turbine Output (kWh)
            </Text>
          </View>
          <View
            style={{
              backgroundColor: '#3AD04B',
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 100,
            }}
          >
            <Text
              style={{
                fontSize: 6,
                color: theme.colors.buttontext,
                fontFamily: getFontFamily('true', 'semi-bold'),
              }}
            >
              Wind Turbine Output (kWh)
            </Text>
          </View>
        </View>
      </View>

      <Modal
        visible={fullScreen}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setFullScreen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.overlaybackground,
          }}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <GestureDetector gesture={pinchGesture}>
              <View style={{ flex: 1 }}>{renderChart(true)}</View>
            </GestureDetector>
          </GestureHandlerRootView>
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <TouchableOpacity
              onPress={() => setFullScreen(false)}
              style={{
                position: 'absolute',
                top: 50,
                right: 20,
                backgroundColor: theme.colors.overlaybackground,
                padding: 6,
                borderRadius: 100,
              }}
            >
              <FontAwesome6
                iconStyle="solid"
                name="xmark"
                size={12}
                color={theme.colors.title}
              />
            </TouchableOpacity>

            <View
              style={{
                position: 'absolute',
                bottom: 15,
                left: 15,
                right: 15,
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'center',
                pointerEvents: 'box-none',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor:
                    mode === 'dark'
                      ? 'rgba(26,26,26,0.8)'
                      : 'rgba(245,245,245,0.5)',
                  borderRadius: 100,
                  borderWidth: 1,
                  borderColor: theme.colors.bordercolor,
                  height: 36,
                  paddingHorizontal: 10,
                }}
              >
                <TouchableOpacity
                  disabled={zoomLevel === MAX_ZOOM || isLocked === true}
                  style={{ padding: 8 }}
                  onPress={handleZoomIn}
                >
                  <FontAwesome6
                    iconStyle="solid"
                    name="plus"
                    size={12}
                    disabled={zoomLevel === MAX_ZOOM || isLocked === true}
                    color={
                      zoomLevel === MAX_ZOOM || isLocked === true
                      ? theme.colors.inputborder
                      : theme.colors.iconsecondary
                    }
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ padding: 8 }}
                  onPress={handleZoomOut}
                  disabled={zoomLevel === MIN_ZOOM || isLocked === true}
                >
                  <FontAwesome6
                    iconStyle="solid"
                    name="minus"
                    size={12}
                    disabled={zoomLevel === MIN_ZOOM || isLocked === true}
                    color={
                      zoomLevel === MIN_ZOOM || isLocked === true
                      ? theme.colors.inputborder
                      : theme.colors.iconsecondary
                    }
                  />
                </TouchableOpacity>

                <View
                  style={{
                    width: 1,
                    height: 16,
                    backgroundColor: '#333',
                    marginHorizontal: 4,
                  }}
                />

                <TouchableOpacity style={{ padding: 8 }} onPress={toggleLock}>
                  <FontAwesome6
                    iconStyle="solid"
                    name={isLocked ? 'lock' : 'lock-open'}
                    size={12}
                    color={isLocked ? theme.colors.title : theme.colors.title}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ padding: 8 }}
                  onPress={() => setFullScreen(false)}
                >
                  <FontAwesome6
                    iconStyle="solid"
                    name="compress"
                    size={12}
                    color={theme.colors.iconsecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default Summaryblock;

const styles = StyleSheet.create({
  yieldbox: {
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 20,
    paddingBottom: 8,
  },
  environmentbox: {
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 20,
    paddingBottom: 8,
  },
  yieldboxheader: {
    padding: 12,
    gap: 12,
    height: 48,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  environmentboxheader: {
    padding: 12,
    gap: 12,
    height: 48,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  yieldboxheadertitile: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 18,
  },

  statCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginTop: 8,
  },
  indicatorBar: {
    width: 2,
    height: 20,
    borderRadius: 100,
    marginRight: 15,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'regular'),
    marginBottom: 2,
    lineHeight: 12,
  },
  statValue: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 12,
  },
  statIconContainer: {
    marginLeft: 8,
  },
  reportbox: {
    marginBottom: 25,
    borderWidth: 1,
    padding: 12,
    borderRadius: 20,
  },
  reporttitle: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 18,
  },
  nodechartbox: {
    marginBottom: 25,
    borderWidth: 1,
    padding: 12,
    borderRadius: 20,
  },
});
