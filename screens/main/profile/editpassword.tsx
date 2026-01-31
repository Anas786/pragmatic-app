import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react'
import Themestore from '../../../store/themestore';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { TextInput } from 'react-native-gesture-handler';
import { Button } from 'react-native-paper';
import { getFontFamily } from '../../../assets/utils/fontfamily';

const Editpassword: React.FC = () => {
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
                <View style={[styles.pcurrentpasswordbox, { backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                        <FontAwesome6
                            name='lock'
                            iconStyle='solid'
                            size={12}
                            style={{ width: 16, height: 16 }}
                            color={theme.colors.iconsecondary}
                        />
                        <TextInput editable={true} keyboardType='default' placeholderTextColor={theme.colors.text} placeholder='Current Password' style={[styles.passwordchangetext, { color: theme.colors.text, width: '100%' }]} />
                    </View>
                </View>
                <View style={[styles.pnewpasswordbox, { backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                        <FontAwesome6
                            name='lock'
                            iconStyle='solid'
                            size={12}
                            style={{ width: 16, height: 16 }}
                            color={theme.colors.iconsecondary}
                        />
                        <TextInput editable={true} keyboardType='default' placeholderTextColor={theme.colors.text} placeholder='New Password' style={[styles.passwordchangetext, { color: theme.colors.text, width: '100%' }]} />
                    </View>
                </View>
                <View style={[styles.pconfirmpasswordbox, { backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                        <FontAwesome6
                            name='lock'
                            iconStyle='solid'
                            size={12}
                            style={{ width: 16, height: 16 }}
                            color={theme.colors.iconsecondary}
                        />
                        <TextInput editable={true} keyboardType='default' placeholderTextColor={theme.colors.text} placeholder='Re-enter New Password' style={[styles.passwordchangetext, { color: theme.colors.text, width: '100%' }]} />
                    </View>
                </View>
                <Button
                    style={[styles.changepasswordbtn, { backgroundColor: theme.colors.buttonbg }]}
                    mode="contained"
                    onPress={() => Alert.alert('Changed')}
                    labelStyle={[styles.changepasswordbtntext, { color: theme.colors.buttontext }]}
                >
                    Change
                </Button>
            </ScrollView>
        </SafeAreaView>
    )
}

export default Editpassword;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 12,
        gap: 12,
    },
    pcurrentpasswordbox: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 8,
        borderRadius: 16,
        marginHorizontal: 8,
        marginVertical: 8,
    },
    pnewpasswordbox: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 12,
        borderRadius: 16,
        marginHorizontal: 8,
        marginBottom: 8,
    },
    pconfirmpasswordbox: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 12,
        borderRadius: 16,
        marginHorizontal: 8,
        marginBottom: 8,
    },
    passwordchangetext: {
        fontSize: 12,
        lineHeight: 18,
        fontFamily: getFontFamily('true', 'regular'),
        marginLeft: 8,
    },
    changepasswordbtn: {
        borderRadius: 100,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 20,
    },
    changepasswordbtntext: {
        fontSize: 14,
        fontFamily: getFontFamily('true', 'semi-bold'),
    }
})