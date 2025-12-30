import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../assets/utils/fontfamily';
import { Button } from 'react-native-paper';
import { Image } from 'react-native';

const CompanyCard = ({ companyName, date, time, logo, powerReadings, efficiency, onExpandView }) => {
  return (
    <View style={styles.companycard}>
      <View style={styles.companyheader}>
        <View style={styles.companylogoandtitle}>
          <View style={styles.companylogo}>
            <Image source={logo} style={{ width: 28, height: 28 }} />
          </View>
          <View>
            <Text style={styles.companyname}>{companyName}</Text>
            <Text style={styles.companydate}>{date}, {time}</Text>
          </View>
        </View>
        <FontAwesome6 iconStyle="solid" color={'#ffffff'} size={16} name="ellipsis-vertical" />
      </View>
      <View style={styles.powerreadingscontainer}>
        {powerReadings.map((reading, index) => (
          <View key={index} style={styles.powerreadingcard}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
              <FontAwesome6 iconStyle="solid" color={reading.iconcolor} size={12} name={reading.icon} />
              <Text style={styles.powerreadingname}>{reading.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
              <Text style={styles.powerreadingvalue}>{reading.value}</Text>
              <Text style={styles.powerreadinglabel}>{reading.label}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.poweroutputefficiency}>
        <Text style={styles.poweroutputefficiencytext}>Power Output Efficiency</Text>
        <Text style={styles.efficiencypercentage}>{efficiency}%</Text>
        <View style={styles.progressbarcontainer}>
          <View style={[styles.progressbar, { width: `${efficiency}%` }]} />
        </View>
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.expandviewbutton}
        onPress={onExpandView}>
        <Text style={styles.expandviewbuttontext}>Expand View</Text>
        <FontAwesome6 iconStyle="solid" color={'#ffffff'} style={{ width: 8, height: 8, marginLeft: 8 }} size={8} name="chevron-down" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  companycard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#1b1a1b',
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
    borderColor: '#303030',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 4
  },
  companyname: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
    color: '#ffffff',
    lineHeight: 12,
  },
  companydate: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'regular'),
    color: '#6e6e6e',
    lineHeight: 12,
  },
  powerreadingscontainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    gap: 10,
  },
  powerreadingcard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#1b1a1b',
    padding: 8,
    gap: 8,
  },
  powerreadingname: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'regular'),
    color: '#ffffff',
    lineHeight: 12,
    marginLeft: 4,
  },
  powerreadingvalue: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'semibold'),
    color: '#ffffff',
    lineHeight: 12,
  },
  powerreadinglabel: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'regular'),
    color: '#6e6e6e',
    lineHeight: 12,
    marginLeft: 4,
  },
  poweroutputefficiency: {
    marginBottom: 10,
  },
  poweroutputefficiencytext: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
    color: '#ffffff',
    lineHeight: 12,
    marginBottom: 8
  },
  progressbarcontainer: {
    height: 4,
    backgroundColor: '#262626',
    borderRadius: 1000,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  progressbar: {
    height: '100%',
    backgroundColor: '#05c80e',
    borderRadius: 1000,
  },
  efficiencypercentage: {
    position: 'absolute',
    right: 5,
    fontSize: 8,
    fontFamily: getFontFamily('true', 'medium'),
    color: '#05c80e',
  },
  expandviewbutton: {
    borderRadius: 100,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#303030',
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
    color: '#6e6e6e',
  },
});

export default CompanyCard;

