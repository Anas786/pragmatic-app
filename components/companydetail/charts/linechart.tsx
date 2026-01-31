import { Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { LineChart } from 'react-native-gifted-charts';
import { getFontFamily } from '../../../assets/utils/fontfamily';
import Themestore from '../../../store/themestore';

const Linechart: React.FC = () => {
  const theme = Themestore(state => state.theme);
  const customdatapoint = (color: string) => {
    return (
      <View
        style={{
          width: 10,
          height: 10,
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderRadius: 5,
          borderColor: color,
        }}
      />
    );
  };
  const lineData1 = [
    { value: 65 },
    { value: 55 },
    { value: 70 },
    { value: 80 },
    { value: 95 },
    { value: 65 },
    { value: 50 },
    { value: 60 },
    { value: 85 },
    { value: 75 },
    { value: 81 },
    { value: 39 },
  ];

  const lineData2 = [
    { value: 70 },
    { value: 60 },
    { value: 70 },
    { value: 75 },
    { value: 90 },
    { value: 100 },
    { value: 61 },
    { value: 50 },
    { value: 84 },
    { value: 59 },
    { value: 65 },
    { value: 60 },
  ];
  const lineData3 = [
    { value: 60 },
    { value: 18 },
    { value: 25 },
    { value: 42 },
    { value: 33 },
    { value: 68 },
    { value: 70 },
    { value: 60 },
    { value: 63 },
    { value: 38 },
    { value: 82 },
    { value: 22 },
  ];
  const dataSet = [
    {
      data: lineData1.map(item => ({
        ...item,
        customDataPoint: () => customdatapoint(theme.colors.linechartdatapointbordergreen), 
      })),
      color: '#3AD04B',
      areaChart: false,
    },
    {
      data: lineData2.map(item => ({
        ...item,
        customDataPoint: () => customdatapoint(theme.colors.linechartdatapointborderblue), 
      })),
      color: '#3A5FD0',
      areaChart: false,
    },
    {
      data: lineData3.map(item => ({
        ...item,
        customDataPoint: () => customdatapoint(theme.colors.linechartdatapointborderred), 
      })),
      color: '#D03A3A',
      areaChart: false,
    },
  ];
  return (
    <View style={{ marginVertical: 8 }}>
      <LineChart
        dataSet={dataSet}
        height={220}
        width={285}
        spacing={25}
        initialSpacing={10}
        maxValue={100}
        noOfSections={5}
        yAxisTextStyle={{ color: theme.colors.text, fontSize: 10 }}
        xAxisLabelTextStyle={{
          color: theme.colors.text,
          fontSize: 7.4,
        }}
        rulesColor={theme.colors.text}
        rulesType="dashed"
        yAxisColor="transparent"
        xAxisColor="transparent"
        curved={false}
        thickness={1}
        hideDataPoints={false}
        xAxisLabelTexts={[
          '19 Dec',
          '20 Dec',
          '21 Dec',
          '22 Dec',
          '23 Dec',
          '24 Dec',
          '25 Dec',
          '26 Dec',
          '26 Dec',
          '26 Dec',
          '26 Dec',
          '26 Dec',
        ]}
      />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: theme.colors.cardscolorgreen,
            borderRadius: 100,
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginRight: 4,
            marginTop: 8,
          }}
        >
          <Text
            style={{
              fontSize: 6,
              fontFamily: getFontFamily('true', 'semi-bold'),
              color: theme.colors.chartyeartextactive,
            }}
          >
            2021
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: theme.colors.cardscolorred,
            borderRadius: 100,
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginRight: 4,
            marginTop: 8,
          }}
        >
          <Text
            style={{
              fontSize: 6,
              fontFamily: getFontFamily('true', 'semi-bold'),
              color: theme.colors.chartyeartextinactive,
            }}
          >
            2022
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: theme.colors.cardscolorblue,
            borderRadius: 100,
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginRight: 4,
            marginTop: 8,
          }}
        >
          <Text
            style={{
              fontSize: 6,
              fontFamily: getFontFamily('true', 'semi-bold'),
              color: theme.colors.chartyeartextinactive,
            }}
          >
            2023
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
export default Linechart;
