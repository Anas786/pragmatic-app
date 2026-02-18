import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import RangeSlider from 'react-native-sticky-range-slider';
import { getFontFamily } from '../../../assets/utils/fontfamily';
import Themestore from '../../../store/themestore';
import LinearGradient from 'react-native-linear-gradient';

const Rail = () => {
  return (
    <LinearGradient
      colors={['#FF3B30', '#FFD60A', '#34C759']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        flex: 1,
        height: 6,
        borderRadius: 4,
      }}
    />
  );
};

const average: number = 579.74;

const Rangeslider: React.FC = () => {
  const theme = Themestore(state => state.theme);
  return (
    <>
      <View style={[styles.container, {backgroundColor: theme.colors.overlaybackground}]}>
        <Text style={[styles.title, { color: theme.colors.title }]}>Captive Plant KW</Text>
        <RangeSlider
          style={styles.slider}
          min={0.0}
          max={14784.25}
          step={1}
          minRange={579.24}
          low={0.0}
          high={14784.25}
          onValueChanged={() => {}}
          renderLowValue={value => (
            <View style={styles.bubble}>
              <Text
                style={[
                  styles.valueText,
                  { color: theme.colors.rangeslidertext },
                ]}
              >
                {Number(value).toFixed(2)}
              </Text>
            </View>
          )}
          renderHighValue={value => (
            <View
              style={[styles.bubble, { transform: 'translate(-100%, -25%)' }]}
            >
              <Text
                style={[
                  styles.valueText,
                  {
                    color: theme.colors.rangeslidertext,
                  },
                ]}
              >
                {value === 14784.25 ? `${value}` : value}
              </Text>
            </View>
          )}
          renderThumb={() => (
            <View style={{ width: 1, height: 1, opacity: 0 }} />
          )}
          renderRail={Rail}
          renderRailSelected={Rail}
        />
        <View
          style={{
            position: 'absolute',
            left: `50%`,
            top: 43,
            backgroundColor: 'white',
            padding: 4,
            borderRadius: 100,
          }}
        >
          <Text style={styles.valueText}>{average}</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',

          }}
        >
          <Text
            style={[styles.valueText, { color: theme.colors.text, marginLeft: 10, }]}
          >
            Min
          </Text>

          <Text
            style={[styles.valueText, { color: theme.colors.text }]}
          >
            Avg
          </Text>

          <Text
            style={[styles.valueText, { color: theme.colors.text, marginRight: 15, }]}
          >
            Max
          </Text>
        </View>
      </View>

      <View style={[styles.container, {backgroundColor: theme.colors.overlaybackground}]}>
        <Text style={[styles.title, { color: theme.colors.title }]}>Grid Active Power</Text>
        <RangeSlider
          style={styles.slider}
          min={0.0}
          max={14784.25}
          step={1}
          minRange={579.24}
          low={0.0}
          high={14784.25}
          onValueChanged={() => {}}
          renderLowValue={value => (
            <View style={styles.bubble}>
              <Text
                style={[
                  styles.valueText,
                  { color: theme.colors.rangeslidertext },
                ]}
              >
                {Number(value).toFixed(2)}
              </Text>
            </View>
          )}
          renderHighValue={value => (
            <View
              style={[styles.bubble, { transform: 'translate(-100%, -25%)' }]}
            >
              <Text
                style={[
                  styles.valueText,
                  {
                    color: theme.colors.rangeslidertext,
                  },
                ]}
              >
                {value === 14784.25 ? `${value}` : value}
              </Text>
            </View>
          )}
          renderThumb={() => (
            <View style={{ width: 1, height: 1, opacity: 0 }} />
          )}
          renderRail={Rail}
          renderRailSelected={Rail}
        />
        <View
          style={{
            position: 'absolute',
            left: `50%`,
            top: 43,
            backgroundColor: 'white',
            padding: 4,
            borderRadius: 100,
          }}
        >
          <Text style={styles.valueText}>{average}</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',

          }}
        >
          <Text
            style={[styles.valueText, { color: theme.colors.text, marginLeft: 10, }]}
          >
            Min
          </Text>

          <Text
            style={[styles.valueText, { color: theme.colors.text }]}
          >
            Avg
          </Text>

          <Text
            style={[styles.valueText, { color: theme.colors.text, marginRight: 15, }]}
          >
            Max
          </Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 12,
    borderRadius: 16,
    position: 'relative',
    margin: 8
  },
  title: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
    marginBottom: 20,
  },
  bubble: {
    backgroundColor: '#ffffff',
    transform: 'translateY(-5%)',
    padding: 4,
    borderRadius: 100,
    alignItems: 'center',
  },
  slider: {
    marginTop: 20,
    marginBottom: 10,
  },
  valueText: {
    fontSize: 6,
    fontFamily: getFontFamily('true', 'medium'),
  },
  rail: {
    flex: 1,
    height: 3,
    borderRadius: 3,
    backgroundColor: 'white',
  },
  railSelected: {
    height: 3,
    backgroundColor: 'blue',
  },
});

export default Rangeslider;
