import { StyleSheet, Text, View } from 'react-native';
import React, { useState } from 'react';
import { PieChart } from 'react-native-gifted-charts';
import { getFontFamily } from '../../../assets/utils/fontfamily';
import Themestore from '../../../store/themestore';

const Piechart: React.FC = () => {
  const theme = Themestore(state => state.theme);
  const [focusedindex, setfocusedindex] = useState<number | any>(null);
  const pieData = [
    { value: 45, color: theme.colors.piechartcolor1, text: '' },
    { value: 30, color: theme.colors.piechartcolor2, text: '' },
    { value: 5, color: theme.colors.piechartcolor4, text: '' },
    { value: 20, color: theme.colors.piechartcolor3, text: '' },
  ];
  return (
    <>
      <View style={{ padding: 15, alignItems: 'center' }}>
        <PieChart
          data={pieData}
          donut
          radius={80}
          innerRadius={0}
          showText
          focusOnPress
          onPress={(_:any, index:any) =>
            setfocusedindex((prev: any) => (prev === index ? null : index))
          }
          textColor="white"
          textSize={10}
          textBackgroundRadius={26}
          font={getFontFamily('true', 'bold')}
        />

        <View
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          {focusedindex === 3 && (
            <View style={{ position: 'absolute', top: 20, left: 0 }}>
              <View
                style={{
                  backgroundColor: theme.colors.overlaybackground,
                  padding: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.bordercolor,
                }}
              >
                <Text style={{ fontSize: 8, color: theme.colors.text }}>
                  Genset{'\n'}Production{'\n'}(kWh)
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      color: theme.colors.title,
                      fontFamily: getFontFamily('true', 'semi-bold'),
                    }}
                  >
                    23,424
                  </Text>
                  <View
                    style={{
                      backgroundColor: theme.colors.buttonbg,
                      borderRadius: 100,
                      padding: 4,
                      marginLeft: 5,
                    }}
                  >
                    <Text style={{ fontSize: 6, color: theme.colors.title }}>
                      67%
                    </Text>
                  </View>
                </View>
              </View>
              <View
                style={{
                  height: 1,
                  width: 25,
                  backgroundColor: theme.colors.piechartcolor3,
                  position: 'absolute',
                  right: -30,
                  top: 25,
                }}
              />
              <View
                style={{
                  height: 1,
                  width: 20,
                  backgroundColor: theme.colors.piechartcolor3,
                  position: 'absolute',
                  right: -40,
                  top: 25,
                }}
              />
            </View>
          )}

          {focusedindex === 2 && (
            <View style={{ position: 'absolute', top: 100, left: 0 }}>
              <View
                style={{
                  backgroundColor: theme.colors.overlaybackground,
                  padding: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.bordercolor,
                }}
              >
                <Text style={{ fontSize: 8, color: theme.colors.text }}>
                  Wind Turbine{'\n'}Output (kWh)
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      color: theme.colors.title,
                      fontFamily: getFontFamily('true', 'semi-bold'),
                    }}
                  >
                    12,560
                  </Text>
                  <View
                    style={{
                      backgroundColor: theme.colors.buttonbg,
                      borderRadius: 100,
                      padding: 4,
                      marginLeft: 5,
                    }}
                  >
                    <Text style={{ fontSize: 6, color: theme.colors.title }}>
                      38%
                    </Text>
                  </View>
                </View>
              </View>
              <View
                style={{
                  height: 10,
                  width: 1,
                  backgroundColor: theme.colors.piechartcolor4,
                  position: 'absolute',
                  right: 5,
                  top: -10,
                }}
              />
              <View
                style={{
                  height: 1,
                  width: 25,
                  backgroundColor: theme.colors.piechartcolor4,
                  position: 'absolute',
                  right: -20,
                  top: -10,
                }}
              />
            </View>
          )}

          {focusedindex === 1 && (
            <View style={{ position: 'absolute', bottom: 40, left: 20 }}>
              <View
                style={{
                  backgroundColor: theme.colors.overlaybackground,
                  padding: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.bordercolor,
                }}
              >
                <Text style={{ fontSize: 8, color: theme.colors.text }}>
                  Solar Power{'\n'}Generation{'\n'}(kWh)
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      color: theme.colors.title,
                      fontFamily: getFontFamily('true', 'semi-bold'),
                    }}
                  >
                    15,300
                  </Text>
                  <View
                    style={{
                      backgroundColor: theme.colors.buttonbg,
                      borderRadius: 100,
                      padding: 4,
                      marginLeft: 5,
                    }}
                  >
                    <Text style={{ fontSize: 6, color: theme.colors.title }}>
                      45%
                    </Text>
                  </View>
                </View>
              </View>
              <View
                style={{
                  height: 1,
                  width: 20,
                  backgroundColor: theme.colors.piechartcolor2,
                  position: 'absolute',
                  right: -5,
                  top: -35,
                }}
              />
               <View
                style={{
                  height: 35,
                  width: 1,
                  backgroundColor: theme.colors.piechartcolor2,
                  position: 'absolute',
                  right: 15,
                  top: -35,
                }}
              />
            </View>
          )}

          {focusedindex === 0 && (
            <View style={{ position: 'absolute', top: 50, right: 0 }}>
              <View
                style={{
                  backgroundColor: theme.colors.overlaybackground,
                  padding: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.bordercolor,
                }}
              >
                <Text style={{ fontSize: 8, color: theme.colors.text }}>
                  Wind Turbine{'\n'}Output (kWh)
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      color: theme.colors.title,
                      fontFamily: getFontFamily('true', 'semi-bold'),
                    }}
                  >
                    12,560
                  </Text>
                  <View
                    style={{
                      backgroundColor: theme.colors.buttonbg,
                      borderRadius: 100,
                      padding: 4,
                      marginLeft: 5,
                    }}
                  >
                    <Text style={{ fontSize: 6, color: theme.colors.title }}>
                      38%
                    </Text>
                  </View>
                </View>
              </View>
              <View
                style={{
                  height: 1,
                  width: 20,
                  backgroundColor: theme.colors.piechartcolor1,
                  position: 'absolute',
                  left: -25,
                  top: 25,
                }}
              />
            </View>
          )}

          {focusedindex === 4 && (
            <View style={{ position: 'absolute', bottom: 30, right: 0 }}>
              <View
                style={{
                  backgroundColor: theme.colors.overlaybackground,
                  padding: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.bordercolor,
                }}
              >
                <Text style={{ fontSize: 8, color: theme.colors.text }}>
                  Wind Turbine{'\n'}Output (kWh)
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      color: theme.colors.title,
                      fontFamily: getFontFamily('true', 'semi-bold'),
                    }}
                  >
                    12,560
                  </Text>
                  <View
                    style={{
                      backgroundColor: theme.colors.buttonbg,
                      borderRadius: 100,
                      padding: 4,
                      marginLeft: 5,
                    }}
                  >
                    <Text style={{ fontSize: 6, color: theme.colors.title }}>
                      38%
                    </Text>
                  </View>
                </View>
              </View>
              <View
                style={{
                  height: 1,
                  width: 20,
                  backgroundColor: theme.colors.piechartcolor4,
                  position: 'absolute',
                  left: -20,
                  bottom: 25,
                }}
              />
              <View
                style={{
                  height: 1,
                  width: 20,
                  backgroundColor: theme.colors.piechartcolor4,
                  position: 'absolute',
                  right: -0,
                  bottom: 25,
                }}
              />
            </View>
          )}
        </View>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: 55,
            gap: 8,
          }}
        />
      </View>
    </>
  );
};
export default Piechart;
