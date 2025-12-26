import { StyleSheet, View, Text } from 'react-native';
import React from 'react';
import SplashScreenone from './screens/splashscreen_one'

const App = () => {

  return (
    <View style={styles.container}>
      <SplashScreenone/>
    </View>
  );
};

const styles = StyleSheet.create({
  container:{
    flex: 1,
  }
});

export default App;
