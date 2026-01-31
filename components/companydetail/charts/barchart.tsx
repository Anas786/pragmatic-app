import { Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { BarChart } from 'react-native-gifted-charts';
import { getFontFamily } from '../../../assets/utils/fontfamily';
import Themestore from '../../../store/themestore';

const Barchart: React.FC = () => {
  const theme = Themestore(state => state.theme);
  const databar1 = [{ value: 40 }, { value: 40 }, { value: 55 }];
  const databar2 = [{ value: 65 }, { value: 30 }, { value: 78 }];
  const databar3 = [{ value: 100 }, { value: 90 }, { value: 90 }];
  const labels = ['19 Dec', '20 Dec', '21 Dec'];
  const dataSet: any[] = [];
  databar1.forEach((item, index) => {
    dataSet.push({
      value: item.value,
      frontColor: '#d03a3a',
      spacing: 4,
    });
    dataSet.push({
      value: databar2[index].value,
      frontColor: '#3ad040',
      spacing: 4,
      label: labels[index],
    });
    dataSet.push({
      value: databar3[index].value,
      frontColor: '#3a5fd0',
      spacing: 30,
    });
    dataSet.push({
      value: databar1[index].value,
      frontColor: '#d03a3a',
      spacing: 4,
    });
    dataSet.push({
      value: databar2[index].value,
      frontColor: '#3ad040',
      spacing: 4,
      label: labels[index],
    });
    dataSet.push({
      value: databar3[index].value,
      frontColor: '#3a5fd0',
      spacing: 30,
    });
  });
  return (
    <View style={{ marginVertical: 8 }}>
      <BarChart
        data={dataSet}
        height={200}
        width={285}
        barWidth={10}
        maxValue={100}
        noOfSections={5}
        yAxisTextStyle={{ color: theme.colors.text, fontSize: 10 }}
        xAxisLabelTextStyle={{
          color: theme.colors.text,
          fontSize: 7.4,
          width: 25,
          textAlign: 'center',
          marginLeft: -5,
        }}
        rulesColor={theme.colors.text}
        rulesType="solid"
        hideRules={true}
        showVerticalLines={true}
        verticalLinesThickness={10}
        verticalLinesColor={theme.colors.overlaybackground}
        yAxisColor="transparent"
        xAxisColor="transparent"
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
export default Barchart;
