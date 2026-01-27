import { ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../assets/utils/fontfamily';
import { Image } from 'react-native';
import Themestore from '../store/themestore';

interface CompanyCardProps {
  companyName: string;
  date: string;
  time: string;
  logo: string;
  powerReadings: any[];
  efficiency: number;
  onExpandView: () => void;
  onverticalView: () => void;
  isactive: boolean;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ companyName, date, time, logo, powerReadings, efficiency, onExpandView, onverticalView, isactive }) => {
  const theme = Themestore(state => state.theme);
  return (
    <View style={[styles.companycard, {backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.bordercolor}]}>
      <View style={styles.companyheader}>
        <View style={styles.companylogoandtitle}>
          <View style={[styles.companylogo, {backgroundColor: theme.colors.background, borderColor: theme.colors.bordercolor}]}>
            <Image source={logo as ImageSourcePropType} style={{ width: 40, height: 40, borderRadius: 20, }} />
            <View style={{position: 'absolute', bottom: 0, right: -5, width: 6, height: 6, padding: 4, borderRadius: 100, borderWidth: 2, borderColor: theme.colors.companyactiveborder, backgroundColor: isactive ? theme.colors.companyactivebg: theme.colors.companyinactivebg}}/>
          </View>
          <View>
            <Text style={[styles.companyname, {color: theme.colors.title}]}>{companyName}</Text>
            <Text style={[styles.companydate, {color: theme.colors.text}]}>{date}, {time}</Text>
          </View>
        </View>
        <FontAwesome6 iconStyle="solid" color={theme.colors.iconsecondary} onPress={onverticalView} size={16} name="ellipsis-vertical" />
      </View>
      <View style={styles.powerreadingscontainer}>
        {powerReadings.map((reading, index) => (
          <View key={index} style={[styles.powerreadingcard, {backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder}]}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
              <FontAwesome6 iconStyle="solid" color={reading.iconcolor} size={12} name={reading.icon} />
              <Text style={[styles.powerreadingname, {color: theme.colors.title}]}>{reading.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
              <Text style={[styles.powerreadingvalue, {color: theme.colors.title}]}>{reading.value}</Text>
              <Text style={[styles.powerreadinglabel, {color: theme.colors.text}]}>{reading.label}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.poweroutputefficiency}>
        <Text style={[styles.poweroutputefficiencytext, {color: theme.colors.title}]}>Power Output Efficiency</Text>
        <Text style={[styles.efficiencypercentage, {color: theme.colors.highlighted}]}>{efficiency}%</Text>
        <View style={[styles.progressbarcontainer, {backgroundColor: theme.colors.progressbarbg}]}>
          <View style={[styles.progressbar, { width: `${efficiency}%`, backgroundColor: theme.colors.progressbar }]} />
        </View>
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.expandviewbutton, {backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder}]}
        onPress={onExpandView}>
        <Text style={[styles.expandviewbuttontext, {color: theme.colors.title}]}>Expand View</Text>
        <FontAwesome6 iconStyle="solid" color={theme.colors.iconsecondary} style={{ width: 8, height: 8, marginLeft: 8 }} size={8} name="chevron-down" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  companycard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  companyheader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  companylogoandtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  companylogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 4,
    position: 'relative',
  },
  companyname: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 12,
  },
  companydate: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'regular'),
    lineHeight: 18,
  },
  powerreadingscontainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 10,
  },
  powerreadingcard: {
    flexBasis: '30%',
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    gap: 8,
  },
  powerreadingname: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'regular'),
    lineHeight: 12,
    marginLeft: 6,
  },
  powerreadingvalue: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'semibold'),
    lineHeight: 12,
  },
  powerreadinglabel: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'regular'),
    lineHeight: 12,
    marginLeft: 4,
  },
  poweroutputefficiency: {
    marginBottom: 10,
  },
  poweroutputefficiencytext: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 12,
    marginBottom: 8
  },
  progressbarcontainer: {
    height: 4,
    borderRadius: 1000,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  progressbar: {
    height: '100%',
    borderRadius: 1000,
  },
  efficiencypercentage: {
    position: 'absolute',
    right: 5,
    fontSize: 8,
    fontFamily: getFontFamily('true', 'medium'),
  },
  expandviewbutton: {
    borderRadius: 100,
    borderWidth: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  expandviewbuttontext: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'regular'),
    lineHeight: 12,
  },
});

export default CompanyCard;

