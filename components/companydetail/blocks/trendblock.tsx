import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useState } from 'react';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import Themestore from '../../../store/themestore';
import { getFontFamily } from '../../../assets/utils/fontfamily';
import DatePicker from 'react-native-date-picker';
import LinearGradient from 'react-native-linear-gradient';
import Areachart from '../charts/areachart';
import Linechart from '../charts/linechart';
import Barchart from '../charts/barchart';
import { Inverterfilter } from '../../../types/invertertablefilter';

const Trendblock: React.FC<Inverterfilter> = ({
  inverterfilter,
  selectinverterfilter,
}) => {
  const theme = Themestore(state => state.theme);
  const [date, setDate] = useState(new Date());
  const [open, setOpen] = useState<boolean>(false);
  const analysisData = [
    { title: 'Captive Plant kW', min: '0.00', avg: '579.74', max: '14784.25' },
    { title: 'Grid Active Power', min: '0.00', avg: '579.74', max: '14784.25' },
  ];

  return (
    <>
      <View
        style={[
          styles.chartanalysisbox,
          { borderColor: theme.colors.bordercolor },
        ]}
      >
        <View
          style={[
            styles.chartanalysisboxheader,
            { backgroundColor: theme.colors.cardheader },
          ]}
        >
          <View>
            <Text
              style={[
                styles.chartanalysisboxheadertitile,
                { color: theme.colors.title },
              ]}
            >
              Chart Analysis
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
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
                iconStyle="solid"
                color={theme.colors.iconbuttontext}
                size={16}
              />
              <Text
                style={{
                  fontSize: 10,
                  color: theme.colors.iconbuttontext,
                  fontFamily: getFontFamily('true', 'medium'),
                  marginLeft: 8,
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
              style={[
                styles.refreshicon,
                { borderWidth: 1, borderColor: theme.colors.cardscolorgreen },
              ]}
            >
              <FontAwesome6
                name="rotate"
                iconStyle="solid"
                color={theme.colors.iconcolor}
                size={12}
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
                marginLeft: 8,
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
        {analysisData.map((item, index) => (
          <View
            key={index}
            style={[
              styles.gradientchart,
              {
                backgroundColor: theme.colors.overlaybackground,
              },
            ]}
          >
            <Text
              style={[
                styles.gradientcharttitle,
                {
                  color: theme.colors.title,
                },
              ]}
            >
              {item.title}
            </Text>

            <View
              style={{
                position: 'relative',
                height: 40,
                justifyContent: 'flex-end',
                marginBottom: 15,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ alignItems: 'flex-start' }}>
                  <View
                    style={{
                      backgroundColor: theme.colors.chartanalysisvaluebg,
                      paddingHorizontal: 4,
                      paddingVertical: 4,
                      borderRadius: 100,
                      marginBottom: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: '#000',
                        fontSize: 10,
                        fontWeight: 'medium',
                      }}
                    >
                      {item.min}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderLeftWidth: 4,
                      borderRightWidth: 4,
                      borderTopWidth: 6,
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                      borderTopColor: theme.colors.chartanalysisvaluebg,
                      marginLeft: 8,
                    }}
                  />
                </View>
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      backgroundColor: theme.colors.chartanalysisvaluebg,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 10,
                      marginBottom: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: '#000',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    >
                      {item.avg}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderLeftWidth: 4,
                      borderRightWidth: 4,
                      borderTopWidth: 6,
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                      borderTopColor: theme.colors.chartanalysisvaluebg,
                    }}
                  />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View
                    style={{
                      backgroundColor: theme.colors.chartanalysisvaluebg,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 10,
                      marginBottom: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: '#000',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    >
                      {item.max}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderLeftWidth: 4,
                      borderRightWidth: 4,
                      borderTopWidth: 6,
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                      borderTopColor: theme.colors.chartanalysisvaluebg,
                      marginRight: 22,
                    }}
                  />
                </View>
              </View>
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                colors={['#FF3B30', '#FFCC00', '#34C759']}
                style={{ height: 4, borderRadius: 1000, width: '100%' }}
              />
            </View>

            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <Text style={{ color: theme.colors.text, fontSize: 6 }}>Min</Text>
              <Text style={{ color: theme.colors.text, fontSize: 6 }}>Avg</Text>
              <Text style={{ color: theme.colors.text, fontSize: 6 }}>Max</Text>
            </View>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.trendanalysisbox,
          { borderColor: theme.colors.bordercolor },
        ]}
      >
        <View
          style={[
            styles.trendanalysisboxheader,
            { backgroundColor: theme.colors.cardheader },
          ]}
        >
          <View>
            <Text
              style={[
                styles.trendanalysisboxheadertitile,
                { color: theme.colors.title },
              ]}
            >
              Trend Analysis
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
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
                iconStyle="solid"
                color={theme.colors.iconbuttontext}
                size={16}
              />
              <Text
                style={{
                  fontSize: 10,
                  color: theme.colors.iconbuttontext,
                  fontFamily: getFontFamily('true', 'medium'),
                  marginLeft: 8,
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
              style={[
                styles.refreshicon,
                { borderWidth: 1, borderColor: theme.colors.cardscolorgreen },
              ]}
            >
              <FontAwesome6
                name="rotate"
                iconStyle="solid"
                color={theme.colors.iconcolor}
                size={12}
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
                marginLeft: 8,
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

        <Areachart />
        <Linechart />
        <Barchart />
      </View>

      <View
        style={[styles.inverterbox, { borderColor: theme.colors.bordercolor }]}
      >
        <View
          style={[
            styles.inverterboxheader,
            { backgroundColor: theme.colors.cardheader },
          ]}
        >
          <View>
            <Text
              style={[
                styles.inverterboxheadertitile,
                { color: theme.colors.title },
              ]}
            >
              Inverter Table
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
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
                iconStyle="solid"
                color={theme.colors.iconbuttontext}
                size={16}
              />
              <Text
                style={{
                  fontSize: 10,
                  color: theme.colors.iconbuttontext,
                  fontFamily: getFontFamily('true', 'medium'),
                  marginLeft: 8,
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
              style={[
                styles.refreshicon,
                { borderWidth: 1, borderColor: theme.colors.cardscolorgreen },
              ]}
            >
              <FontAwesome6
                name="rotate"
                iconStyle="solid"
                color={theme.colors.iconcolor}
                size={12}
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
                marginLeft: 8,
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  inverterfilter === 'customfilter'
                    ? theme.colors.buttonbg
                    : 'transparent',
                borderColor:
                  inverterfilter === 'customfilter'
                    ? theme.colors.buttonbg
                    : theme.colors.bordercolor,
              },
            ]}
            onPress={() => selectinverterfilter('customfilter')}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    inverterfilter === 'customfilter'
                      ? theme.colors.iconbuttontext
                      : theme.colors.text,
                },
              ]}
            >
              Custom
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  inverterfilter === 'month'
                    ? theme.colors.buttonbg
                    : 'transparent',
                borderColor:
                  inverterfilter === 'month'
                    ? theme.colors.buttonbg
                    : theme.colors.bordercolor,
              },
            ]}
            onPress={() => selectinverterfilter('month')}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    inverterfilter === 'month'
                      ? theme.colors.iconbuttontext
                      : theme.colors.text,
                },
              ]}
            >
              Month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  inverterfilter === 'year'
                    ? theme.colors.buttonbg
                    : 'transparent',
                borderColor:
                  inverterfilter === 'year'
                    ? theme.colors.buttonbg
                    : theme.colors.bordercolor,
              },
            ]}
            onPress={() => selectinverterfilter('year')}
          >
           
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    inverterfilter === 'year'
                      ? theme.colors.iconbuttontext
                      : theme.colors.text,
                },
              ]}
            >
              Year
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  inverterfilter === 'lifetime'
                    ? theme.colors.buttonbg
                    : 'transparent',
                borderColor:
                  inverterfilter === 'lifetime'
                    ? theme.colors.buttonbg
                    : theme.colors.bordercolor,
              },
            ]}
            onPress={() => selectinverterfilter('lifetime')}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    inverterfilter === 'lifetime'
                      ? theme.colors.iconbuttontext
                      : theme.colors.text,
                },
              ]}
            >
              Life Time
            </Text>
          </TouchableOpacity>
          </View>
        </ScrollView>
        <View
          style={[
            styles.invertercard,
            {
              backgroundColor: theme.colors.overlaybackground,
              borderColor: theme.colors.bordercolor,
            },
          ]}
        >
          <Text style={[styles.invertercardTitle, { color: theme.colors.title }]}>
            Canteen, Pump Room (Inverter 9)
          </Text>

          <View style={styles.metricsRow}>
            <View style={[styles.metricBox, { borderColor: theme.colors.inputborder }]}>
              <Text style={[styles.metricLabel, { color: theme.colors.text }]}>Production</Text>
              <Text style={[styles.metricValue, { color: theme.colors.title }]}>241.56</Text>
            </View>

            <View style={[styles.metricBox, { borderColor: theme.colors.inputborder }]}>
              <Text style={[styles.metricLabel, { color: theme.colors.text }]}>Yield</Text>
              <Text style={[styles.metricValue, { color: theme.colors.title }]}>2.20</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressTitle, { color: theme.colors.title }]}>Performance Ratio</Text>
              <Text style={[styles.progressValue, { color: theme.colors.highlighted }]}>86.56%</Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.progressbarbg }]}>
              <View style={[styles.progressBarFill, { width: '86.56%', backgroundColor: theme.colors.progressbar }]} />
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressTitle, { color: theme.colors.title }]}>Uptime %</Text>
              <Text style={[styles.progressValue, { color: theme.colors.highlighted }]}>61.56%</Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.progressbarbg }]}>
              <View style={[styles.progressBarFill, { width: '61.56%', backgroundColor: theme.colors.cardscolorblue  }]} />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.invertercard,
            {
              backgroundColor: theme.colors.overlaybackground,
              borderColor: theme.colors.bordercolor,
            },
          ]}
        >
          <Text style={[styles.invertercardTitle, { color: theme.colors.title }]}>
            Canteen, Pump Room (Inverter 9)
          </Text>

          <View style={styles.metricsRow}>
            <View style={[styles.metricBox, { borderColor: theme.colors.inputborder }]}>
              <Text style={[styles.metricLabel, { color: theme.colors.text }]}>Production</Text>
              <Text style={[styles.metricValue, { color: theme.colors.title }]}>241.56</Text>
            </View>
            <View style={[styles.metricBox, { borderColor: theme.colors.inputborder }]}>
              <Text style={[styles.metricLabel, { color: theme.colors.text }]}>Yield</Text>
              <Text style={[styles.metricValue, { color: theme.colors.title }]}>2.20</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressTitle, { color: theme.colors.title }]}>Performance Ratio</Text>
              <Text style={[styles.progressValue, { color: theme.colors.highlighted }]}>86.56%</Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.progressbarbg }]}>
              <View style={[styles.progressBarFill, { width: '86.56%', backgroundColor: theme.colors.progressbar }]} />
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressTitle, { color: theme.colors.title }]}>Uptime %</Text>
              <Text style={[styles.progressValue, { color: theme.colors.highlighted }]}>61.56%</Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.progressbarbg }]}>
              <View style={[styles.progressBarFill, { width: '61.56%', backgroundColor: theme.colors.cardscolorblue  }]} />
            </View>
          </View>
        </View>
      </View>
    </>
  );
};

export default Trendblock;

const styles = StyleSheet.create({
  chartanalysisbox: {
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 20,
    paddingBottom: 8,
  },
  chartanalysisboxheader: {
    padding: 12,
    gap: 12,
    height: 48,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartanalysisboxheadertitile: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 18,
  },
  trendanalysisbox: {
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 20,
    paddingBottom: 8,
  },
  trendanalysisboxheader: {
    padding: 12,
    gap: 12,
    height: 48,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendanalysisboxheadertitile: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 18,
  },
  inverterbox: {
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 20,
    paddingBottom: 8,
  },
  inverterboxheader: {
    padding: 12,
    gap: 12,
    height: 48,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inverterboxheadertitile: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 18,
  },
  refreshicon: {
    width: 24,
    height: 24,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientchart: {
    margin: 8,
    borderRadius: 16,
    padding: 12,
  },
  gradientcharttitle: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    marginVertical: 8,
    marginHorizontal: 8,
  },
  filterButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    marginRight: 8,
    width: 86,
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 8,
    lineHeight: 12,
    fontFamily: getFontFamily('true', 'medium'),
    textAlign: 'center',
  },
  invertercard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 8,
  },
  invertercardTitle: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 15,
  },
  metricBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'regular'),
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'semibold'),
  },
  progressSection: {
    marginBottom: 20,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
  },
  progressValue: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'medium'),
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 1000,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1000,
  },
});
