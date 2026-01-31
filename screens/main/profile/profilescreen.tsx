import { Text, StyleSheet, View, Alert, ScrollView, Image, TouchableOpacity } from 'react-native'
import { Button } from 'react-native-paper';
import React from 'react'
import Themestore from '../../../store/themestore'
import { getFontFamily } from '../../../assets/utils/fontfamily';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { imagePickerOptions, UserprofileStore } from '../../../store/profilestore';
import { RootStackParamList } from '../../../types/navigation';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';


const Profilescreen: React.FC = () => {
    const theme = Themestore(state => state.theme);
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    const handleResponse = UserprofileStore(
        state => state.handleImagePickerResponse
    );

    const openGallery = () => {
        launchImageLibrary(imagePickerOptions, handleResponse);
    };
    const openCamera = () => {
        launchCamera(imagePickerOptions, handleResponse);
    };
    const handleimageedit = () => {
        Alert.alert(
            'Select Image',
            'Choose an option',
            [
                { text: 'Camera', onPress: openCamera },
                { text: 'Gallery', onPress: openGallery },
                { text: 'Cancel', style: 'cancel' },
            ],
            { cancelable: true },
        );
    }
    const handleeditpersonalinfo = () => {
        navigation.push('Editpersonalinfo');
    }
    const handlepasswordchange = () => {
        navigation.push('Editpassword');
    }
    const handledeactivateaccount = () => {
        navigation.push('Deactivateaccount');
    }
    const handletermsandcondition = () => {
        navigation.push('Termsandcondition');
    }
    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
            >
                <View style={styles.userinfocontainer}>
                    <View style={styles.userinfobox}>
                        <View style={styles.userimage}>
                            <Image source={require('../../../assets/profiledummy1.jpg')}
                                style={{
                                    width: 80, height: 80, borderRadius: 100,
                                    borderWidth: 2,
                                    borderColor: theme.colors.cardborder,
                                }}
                            />
                            <View style={[styles.editimage, { backgroundColor: theme.colors.iconbuttonbg, borderWidth: 1, borderColor: theme.colors.cardborder }]}>
                                <FontAwesome6
                                    name='pen-to-square'
                                    iconStyle='solid'
                                    color={theme.colors.iconbuttonicon}
                                    style={styles.editpencilicon}
                                    size={12}
                                    onPress={handleimageedit}
                                />
                            </View>
                        </View>
                        <View style={styles.userinfo}>
                            <Text style={[styles.username, { color: theme.colors.title }]}>Martina Mauas</Text>
                            <Text style={[styles.usertag, { color: theme.colors.text }]}>Profile</Text>
                        </View>
                    </View>
                </View>
                <View style={[styles.personalinfobox, { borderColor: theme.colors.bordercolor }]}>
                    <View style={[styles.personalinfoboxheader, { backgroundColor: theme.colors.cardheader }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <Text style={[styles.personalinfoboxheadertitile, { color: theme.colors.title }]}>Personal Information</Text>
                            <Text style={[styles.editpersonalinfo, { color: theme.colors.highlightedsecondary }]} onPress={handleeditpersonalinfo}>Edit</Text>
                        </View>
                    </View>
                    <View style={[styles.pusernamebox, { backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                            <FontAwesome6
                                name='user'
                                iconStyle='regular'
                                size={12}
                                style={{ width: 16, height: 16 }}
                                color={theme.colors.iconsecondary}
                            />
                            <Text style={[styles.personalinfotext, { color: theme.colors.title }]}>Martina Mauas</Text>
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
                            <Text style={[styles.personalinfotext, { color: theme.colors.title }]}>martina@mail.com</Text>
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
                            <Text style={[styles.personalinfotext, { color: theme.colors.title }]}>021-123456789</Text>
                        </View>
                    </View>
                </View>
                <View style={[styles.securitybox, { borderColor: theme.colors.bordercolor }]}>
                    <View style={[styles.securityboxheader, { backgroundColor: theme.colors.cardheader }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <Text style={[styles.securityboxheadertitile, { color: theme.colors.title }]}>Security</Text>
                            {/* <Text style={[styles.editsecurityinfo, { color: theme.colors.highlightedsecondary }]}>Edit</Text> */}
                        </View>
                    </View>
                    <View style={[styles.spasswordbox, { backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder }]}>
                        <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} onPress={handlepasswordchange}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <FontAwesome6
                                    name='lock'
                                    iconStyle='solid'
                                    size={12}
                                    style={{ width: 16, height: 16 }}
                                    color={theme.colors.iconsecondary}
                                />
                                <Text style={[styles.securitytext, { color: theme.colors.title }]}>Password</Text>
                            </View>
                            <View>
                                <FontAwesome6
                                    name='chevron-right'
                                    iconStyle='solid'
                                    size={12}
                                    style={{ width: 12, height: 12 }}
                                    color={theme.colors.iconsecondary}
                                />
                            </View>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={[styles.saccountdeletebox, { backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder }]} onPress={handledeactivateaccount}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <FontAwesome6
                                    name='trash-can'
                                    iconStyle='regular'
                                    size={12}
                                    style={{ width: 16, height: 16 }}
                                    color={theme.colors.warningicon}
                                />
                                <Text style={[styles.securitytext, { color: theme.colors.title }]}>Account Deactivate</Text>
                            </View>
                            <View>
                                <FontAwesome6
                                    name='chevron-right'
                                    iconStyle='solid'
                                    size={12}
                                    style={{ width: 12, height: 12 }}
                                    color={theme.colors.iconsecondary}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={[styles.legalbox, { borderColor: theme.colors.bordercolor }]}>
                    <View style={[styles.legalboxheader, { backgroundColor: theme.colors.cardheader }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <Text style={[styles.legalboxheadertitile, { color: theme.colors.title }]}>Legal</Text>
                            {/* <Text style={[styles.editlegalinfo, { color: theme.colors.highlightedsecondary }]}>Edit</Text> */}
                        </View>
                    </View>
                    <View style={[styles.ltermsconditionbox, { backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder }]}>
                        <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} onPress={handletermsandcondition}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <FontAwesome6
                                    name='user'
                                    iconStyle='regular'
                                    size={16}
                                    style={{ width: 16, height: 16 }}
                                    color={theme.colors.iconsecondary}
                                />
                                <Text style={[styles.legaltext, { color: theme.colors.title }]}>Terms and Conditions</Text>
                            </View>
                            <View>
                                <FontAwesome6
                                    name='chevron-right'
                                    iconStyle='solid'
                                    size={12}
                                    style={{ width: 12, height: 12 }}
                                    color={theme.colors.iconsecondary}
                                />
                            </View>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.lprivacypolicybox, { backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <FontAwesome6
                                    name='envelope'
                                    iconStyle='regular'
                                    size={16}
                                    style={{ width: 16, height: 16 }}
                                    color={theme.colors.iconsecondary}
                                />
                                <Text style={[styles.legaltext, { color: theme.colors.title }]}>Privacy Policy</Text>
                            </View>
                            <View>
                                <FontAwesome6
                                    name='chevron-right'
                                    iconStyle='solid'
                                    size={12}
                                    style={{ width: 12, height: 12 }}
                                    color={theme.colors.iconsecondary}
                                />
                            </View>

                        </View>
                    </View>
                </View>
                <Button
                    style={[styles.logoutbtn, { backgroundColor: theme.colors.warningbtnbg }]}
                    mode="contained"
                    icon={() => (
                        <FontAwesome6
                            iconStyle="solid"
                            color={theme.colors.iconbuttonicon}
                            size={20}
                            style={{ width: 20, height: 20, transform: 'rotate(180deg)' }}
                            name="right-to-bracket"
                        />
                    )}
                    onPress={() => Alert.alert('Logout')}
                    labelStyle={[styles.logoutbtntext, { color: theme.colors.warningbtntext }]}
                >
                    Logout
                </Button>
            </ScrollView>
        </SafeAreaView>
    )
}

export default Profilescreen;
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 12,
        gap: 12,
    },
    userinfocontainer: {
        paddingBottom: 20,
        gap: 12,
    },
    userinfobox: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 12,
    },
    userimage: {
        width: 80,
        height: 80,
        borderRadius: 100,
        marginRight: 12,
    },
    editimage: {
        width: 23.14,
        height: 23.14,
        position: 'absolute',
        bottom: 0,
        right: 0,
        borderRadius: 100,
    },
    editpencilicon: {
        width: 12,
        height: 12,
        alignSelf: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    userinfo: {
        flex: 1,
        position: 'relative',
    },
    username: {
        fontSize: 20,
        fontFamily: getFontFamily('true', 'medium'),
        lineHeight: 18,
        paddingBottom: 8
    },
    usertag: {
        fontSize: 12,
        fontFamily: getFontFamily('true', 'regular'),
        lineHeight: 16,
    },
    personalinfobox: {
        marginBottom: 20,
        borderWidth: 1,
        borderRadius: 20,
    },
    personalinfoboxheader: {
        padding: 12,
        gap: 12,
        height: 48,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    personalinfoboxheadertitile: {
        fontSize: 12,
        fontFamily: getFontFamily('true', 'medium'),
        lineHeight: 18,
    },
    editpersonalinfo: {
        fontSize: 12,
        fontFamily: getFontFamily('true', 'medium'),
        lineHeight: 18,
    },
    pusernamebox: {
        padding: 12,
        gap: 8,
        borderRadius: 16,
        marginHorizontal: 8,
        marginVertical: 8,
    },
    puseremailbox: {
        padding: 12,
        gap: 12,
        borderRadius: 16,
        marginHorizontal: 8,
        marginBottom: 8,
    },
    pusernumberbox: {
        padding: 12,
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
    securitybox: {
        marginBottom: 20,
        borderWidth: 1,
        borderRadius: 20,
    },
    securityboxheader: {
        padding: 12,
        gap: 12,
        height: 48,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    securityboxheadertitile: {
        fontSize: 12,
        fontFamily: getFontFamily('true', 'medium'),
        lineHeight: 18,
    },
    // editsecurityinfo:{
    //     fontSize: 12,
    //     fontFamily: getFontFamily('true', 'medium'),
    //     lineHeight: 18,
    // },
    spasswordbox: {
        padding: 12,
        gap: 8,
        borderRadius: 16,
        marginHorizontal: 8,
        marginVertical: 8,
    },
    saccountdeletebox: {
        padding: 12,
        gap: 12,
        borderRadius: 16,
        marginHorizontal: 8,
        marginBottom: 8,
    },
    securitytext: {
        fontSize: 12,
        lineHeight: 18,
        fontFamily: getFontFamily('true', 'medium'),
        marginLeft: 8,
    },

    legalbox: {
        marginBottom: 20,
        borderWidth: 1,
        borderRadius: 20,
    },
    legalboxheader: {
        padding: 12,
        gap: 12,
        height: 48,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    legalboxheadertitile: {
        fontSize: 12,
        fontFamily: getFontFamily('true', 'medium'),
        lineHeight: 18,
    },
    // editlegalinfo:{
    //     fontSize: 12,
    //     fontFamily: getFontFamily('true', 'medium'),
    //     lineHeight: 18,
    // },
    ltermsconditionbox: {
        padding: 12,
        gap: 8,
        borderRadius: 16,
        marginHorizontal: 8,
        marginVertical: 8,
    },
    lprivacypolicybox: {
        padding: 12,
        gap: 12,
        borderRadius: 16,
        marginHorizontal: 8,
        marginBottom: 8,
    },
    legaltext: {
        fontSize: 12,
        lineHeight: 18,
        fontFamily: getFontFamily('true', 'medium'),
        marginLeft: 8,
    },
    logoutbtn: {
        borderRadius: 100,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    logoutbtntext: {
        fontSize: 14,
        fontFamily: getFontFamily('true', 'semi-bold'),
    }
})