import { StyleSheet, ScrollView, View, Text, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react'
import Themestore from '../../../store/themestore';
import { getFontFamily } from '../../../assets/utils/fontfamily';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { TextInput } from 'react-native-gesture-handler';
import { Button } from 'react-native-paper';


const Deactivateaccount: React.FC = () => {
    const theme = Themestore(state => state.theme);
    const insets = useSafeAreaInsets();
    const [deletecheckbox, setdeletecheckbox] = useState<boolean>(false);
    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
            >
                <View style={[styles.pdeleteaccountbox, { backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                        <FontAwesome6
                            name='lock'
                            iconStyle='solid'
                            size={12}
                            style={{ width: 16, height: 16 }}
                            color={theme.colors.iconsecondary}
                        />
                        <TextInput editable={true} keyboardType='default' placeholderTextColor={theme.colors.text} placeholder='Enter Your Password' style={[styles.deleteaccfieldtext, { color: theme.colors.text, width: '100%' }]} />
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.deleteContainer}
                    activeOpacity={0.8}
                    onPress={() => setdeletecheckbox(prev => !prev)}
                >
                    <View
                        style=
                        {[
                            styles.deletecheckbox,
                            { backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder },
                            deletecheckbox && styles.deletecheckboxActive
                        ]}
                    >
                        {deletecheckbox ? (
                            <FontAwesome6
                                name="check"
                                iconStyle="solid"
                                size={12}
                                color="#ffffff"
                            />
                        ) : null}
                    </View>
                    <Text style={[styles.deleteText, { color: theme.colors.title }]}>I agree to deactivate my account.</Text>
                </TouchableOpacity>
                <Button
                    style={[styles.deleteaccountbtn, { backgroundColor: theme.colors.warningbtnbg }]}
                    mode="contained"
                    onPress={() => Alert.alert('Deleted Successfully')}
                    labelStyle={[styles.deleteaccountbtntext, { color: theme.colors.warningbtntext }]}
                >
                    Deactivate Account
                </Button>
            </ScrollView>
        </SafeAreaView>
    )
}

export default Deactivateaccount;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 12,
        gap: 12,
    },
    pdeleteaccountbox: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 8,
        borderRadius: 16,
        marginHorizontal: 8,
        marginVertical: 8,
    },
    deleteaccfieldtext: {
        fontSize: 12,
        lineHeight: 18,
        fontFamily: getFontFamily('true', 'medium'),
        marginLeft: 8,
    },
    deleteaccountbtn: {
        borderRadius: 100,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 20,
    },
    deleteaccountbtntext: {
        fontSize: 14,
        fontFamily: getFontFamily('true', 'semi-bold'),
    },
    deleteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 8,
        marginLeft: 10,
    },
    deletecheckbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deletecheckboxActive: {
        borderColor: '#08820E',
        backgroundColor: '#08820E',
    },
    deleteText: {
        fontSize: 14,
        fontFamily: getFontFamily('true', 'medium'),
    },
})