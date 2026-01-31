import { Text, StyleSheet, View } from 'react-native';
import React from 'react';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import Themestore from '../../../store/themestore';
import { getFontFamily } from '../../../assets/utils/fontfamily';

const Cardblock: React.FC = () => {
  const theme = Themestore(state => state.theme);
  return (
    <View style={[styles.cardbox, { borderColor: theme.colors.bordercolor }]}>
      <View
        style={[
          styles.cardboxheader,
          { backgroundColor: theme.colors.cardheader },
        ]}
      >
        <Text
          style={[styles.cardboxheadertitile, { color: theme.colors.title }]}
        >
          Cards
        </Text>
      </View>
 
      <View style={styles.statCardContainer}>
        <View
          style={[
            styles.statitem,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 8,
            },
          ]}
        >
          <View style={{flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
            <View
              style={[
                styles.indicatorBar,
                { backgroundColor: theme.colors.cardscolorblue },
              ]}
            />
            <View>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>
                Wind Generation - RealTime
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.title }]}>
                4,4844.25 KW
              </Text>
            </View>
          </View>

          <View>
            <View style={styles.statIconContainer}>
              <FontAwesome6
                iconStyle="solid"
                name="fan"
                size={20}
                color={theme.colors.cardscolorblue}
              />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statitem,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 0,
            },
          ]}
        >

          <View style={{flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
            <View
              style={[
                styles.indicatorBar,
                { backgroundColor: theme.colors.cardscolorblue },
              ]}
            />
            <View>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>
                Wind Energy Today
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.title }]}>
                7,514.00 KWh
              </Text>
            </View>
          </View>
          <View>
            <View style={styles.statIconContainer}>
              <FontAwesome6
                iconStyle="solid"
                name="fan"
                size={20}
                color={theme.colors.cardscolorblue}
              />
            </View>
          </View>
          
        </View>
      </View>
 
      <View style={styles.statCardContainer}>
        <View
          style={[
            styles.statitem,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 8,
            },
          ]}
        >
          <View style={{flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
            <View
              style={[
                styles.indicatorBar,
                { backgroundColor: theme.colors.cardscolorgreen },
              ]}
            />
            <View>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>
                PV-SG-CI-01
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.title }]}>
                16,124.80 KWh
              </Text>
            </View>
          </View>

          <View>
            <View style={styles.statIconContainer}>
              <FontAwesome6
                iconStyle="solid"
                name="solar-panel"
                size={20}
                color={theme.colors.cardscolorgreen}
              />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statitem,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 0,
            },
          ]}
        >

          <View style={{flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
            <View
              style={[
                styles.indicatorBar,
                { backgroundColor: theme.colors.cardscolorgreen },
              ]}
            />
            <View>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>
                Pv-SG-CI-05
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.title }]}>
                15,217.80 KWh
              </Text>
            </View>
          </View>
          <View>
            <View style={styles.statIconContainer}>
              <FontAwesome6
                iconStyle="solid"
                name="solar-panel"
                size={20}
                color={theme.colors.cardscolorgreen}
              />
            </View>
          </View>
          
        </View>
      </View>
 
      <View style={styles.statCardContainer}>
        <View
          style={[
            styles.statitem,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 8,
            },
          ]}
        >
          <View style={{flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
            <View
              style={[
                styles.indicatorBar,
                { backgroundColor: theme.colors.cardscolorgreen },
              ]}
            />
            <View>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>
                PV-SG-CI-01
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.title }]}>
                16,124.80 KWh
              </Text>
            </View>
          </View>

          <View>
            <View style={styles.statIconContainer}>
              <FontAwesome6
                iconStyle="solid"
                name="solar-panel"
                size={20}
                color={theme.colors.cardscolorgreen}
              />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statitem,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 0,
            },
          ]}
        >

          <View style={{flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
            <View
              style={[
                styles.indicatorBar,
                { backgroundColor: theme.colors.cardscolorgreen },
              ]}
            />
            <View>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>
                Pv-SG-CI-05
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.title }]}>
                15,217.80 KWh
              </Text>
            </View>
          </View>
          <View>
            <View style={styles.statIconContainer}>
              <FontAwesome6
                iconStyle="solid"
                name="solar-panel"
                size={20}
                color={theme.colors.cardscolorgreen}
              />
            </View>
          </View>
          
        </View>
      </View>

      <View style={styles.statCardContainer}>
        <View
          style={[
            styles.statitem,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 8,
            },
          ]}
        >
          <View style={{flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
            <View
              style={[
                styles.indicatorBar,
                { backgroundColor: theme.colors.cardscolorred },
              ]}
            />
            <View>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>
                PV-SG-CI-01
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.title }]}>
                16,124.80 KWh
              </Text>
            </View>
          </View>

          <View>
            <View style={styles.statIconContainer}>
              <FontAwesome6
                iconStyle="solid"
                name="volcano"
                size={20}
                color={theme.colors.cardscolorred}
              />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statitem,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 0,
            },
          ]}
        >

          <View style={{flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
            <View
              style={[
                styles.indicatorBar,
                { backgroundColor: theme.colors.cardscolorred },
              ]}
            />
            <View>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>
                Pv-SG-CI-05
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.title }]}>
                15,217.80 KWh
              </Text>
            </View>
          </View>
          <View>
            <View style={styles.statIconContainer}>
              <FontAwesome6
                iconStyle="solid"
                name="volcano"
                size={20}
                color={theme.colors.cardscolorred}
              />
            </View>
          </View>
          
        </View>
      </View>

      <View style={styles.statCardContainer}>
        <View
          style={[
            styles.statitem,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 8,
            },
          ]}
        >
          <View style={{flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
            <View
              style={[
                styles.indicatorBar,
                { backgroundColor: theme.colors.cardscolorblue },
              ]}
            />
            <View>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>
                Wind Generation - RealTime
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.title }]}>
                4,4844.25 KW
              </Text>
            </View>
          </View>

          <View>
            <View style={styles.statIconContainer}>
              <FontAwesome6
                iconStyle="solid"
                name="fan"
                size={20}
                color={theme.colors.cardscolorblue}
              />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statitem,
            {
              backgroundColor: theme.colors.overlaybackground,
              marginBottom: 0,
            },
          ]}
        >

          <View style={{flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
            <View
              style={[
                styles.indicatorBar,
                { backgroundColor: theme.colors.cardscolorblue },
              ]}
            />
            <View>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>
                Wind Energy Today
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.title }]}>
                7,514.00 KWh
              </Text>
            </View>
          </View>
          <View>
            <View style={styles.statIconContainer}>
              <FontAwesome6
                iconStyle="solid"
                name="fan"
                size={20}
                color={theme.colors.cardscolorblue}
              />
            </View>
          </View>
          
        </View>
      </View>
    </View>
  );
};
export default Cardblock;

const styles = StyleSheet.create({
  cardbox: {
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 20,
    paddingBottom: 8,
  },
  cardboxheader: {
    padding: 12,
    gap: 12,
    height: 48,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  cardboxheadertitile: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 18,
  },
  statCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statitem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginRight: 8,
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
});
