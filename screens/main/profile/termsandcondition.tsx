import { StyleSheet, Text, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react'
import Themestore from '../../../store/themestore';
import { getFontFamily } from '../../../assets/utils/fontfamily';

const Termsandcondition: React.FC = () => {
    const theme = Themestore(state => state.theme);
    const insets = useSafeAreaInsets();
    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
            >
                <Text style=
                {{ 
                    color: theme.colors.title, 
                    fontSize: 20, 
                    fontFamily: getFontFamily('true', 'medium') 
                }}>
                    Terms and Condition
                </Text>
            </ScrollView>
        </SafeAreaView>
    )
}

export default Termsandcondition;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 12,
        gap: 12,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    }
})