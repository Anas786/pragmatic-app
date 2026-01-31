import { StyleSheet, ScrollView, View, Alert, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react'
import Themestore from '../../../store/themestore';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../../../assets/utils/fontfamily';
import { Button } from 'react-native-paper';

const Editpersonalinfo: React.FC = () => {
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
                <View style={[styles.pusernamebox, { backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                        <FontAwesome6
                            name='user'
                            iconStyle='regular'
                            size={12}
                            style={{ width: 16, height: 16 }}
                            color={theme.colors.iconsecondary}
                        />
                        <TextInput editable={true} keyboardType='default' placeholderTextColor={theme.colors.title} placeholder='Martina Mauas' style={[styles.personalinfotext, { color: theme.colors.title, width: '100%' }]} />
                    </View>
                </View>
                <View style={[styles.puseremailbox, { backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                        <FontAwesome6
                            name='envelope'
                            iconStyle='regular'
                            size={12}
                            style={{ width: 16, height: 16 }}
                            color={theme.colors.iconsecondary}
                        />
                        <TextInput editable={true} keyboardType='email-address' placeholderTextColor={theme.colors.title} placeholder='martina@mail.com' style={[styles.personalinfotext, { color: theme.colors.title, width: '100%' }]} />
                    </View>
                </View>
                <View style={[styles.pusernumberbox, { backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                        <FontAwesome6
                            name='phone'
                            iconStyle='solid'
                            size={12}
                            style={{ width: 16, height: 16 }}
                            color={theme.colors.iconsecondary}
                        />
                        <TextInput editable={true} keyboardType='phone-pad' placeholderTextColor={theme.colors.title} placeholder='021-123456789' style={[styles.personalinfotext, { color: theme.colors.title, width: '100%' }]} />
                    </View>
                </View>
                <Button
                    style={[styles.savepersonalinfobtn, { backgroundColor: theme.colors.buttonbg }]}
                    mode="contained"
                    onPress={() => Alert.alert('Saved')}
                    labelStyle={[styles.savepersonalinfobtntext, { color: theme.colors.buttontext }]}
                >
                    Save
                </Button>
            </ScrollView>
        </SafeAreaView>
    )
}

export default Editpersonalinfo;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 12,
        gap: 12,
    },
    pusernamebox: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 8,
        borderRadius: 16,
        marginHorizontal: 8,
        marginVertical: 8,
    },
    puseremailbox: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 12,
        borderRadius: 16,
        marginHorizontal: 8,
        marginBottom: 8,
    },
    pusernumberbox: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 12,
        borderRadius: 16,
        marginHorizontal: 8,
        marginBottom: 8,
    },
    personalinfotext: {
        fontSize: 12,
        lineHeight: 18,
        fontFamily: getFontFamily('true', 'medium'),
        marginLeft: 8,
    },
    savepersonalinfobtn: {
        borderRadius: 100,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 20,
    },
    savepersonalinfobtntext: {
        fontSize: 14,
        fontFamily: getFontFamily('true', 'semi-bold'),
    }
})