import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import Themestore from '../store/themestore'

const Companydetailscreen: React.FC = () => {
    const theme = Themestore((state)=> state.theme);
  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Text style={{color: theme.colors.title}}>Company Detail</Text>
    </View>
  )
}

export default Companydetailscreen;


const styles = StyleSheet.create({
    container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

})