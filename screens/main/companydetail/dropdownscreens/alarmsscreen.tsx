import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import Themestore from '../../../../store/themestore'

const Alarmsscreen: React.FC = () => {
    const theme = Themestore(state => state.theme);
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={{ fontSize: 24, color: theme.colors.title }}>Alarms Screen</Text>
    </View>
  )
}

export default Alarmsscreen;


const styles = StyleSheet.create({
    container:{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    }
})