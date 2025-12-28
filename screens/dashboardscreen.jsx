import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

const Dashboardscreen = () => {
  return (
    <SafeAreaView style={styles.dashboardview}>
      <Text>dashboardscreen</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  dashboardview: {
    flex: 1,
    backgroundColor: '#151314',
    position: 'relative',
  },
});

export default Dashboardscreen;
