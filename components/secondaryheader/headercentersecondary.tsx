import React from "react";
import { Image, Text, View } from "react-native";
import { getFontFamily } from "../../assets/utils/fontfamily";
import Themestore from "../../store/themestore";

const HeaderCenterSecondary: React.FC = () => {
    const theme = Themestore((state) => state.theme);
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
            <View style={{backgroundColor: theme.colors.background, borderRadius: 100, borderColor: theme.colors.bordercolor}}>
                <Image
                    style={{ width: 36, height: 36, borderRadius: 100 }}
                    source={require('../../assets/luckycementlogo.png')}
                />
            </View>
            <View style={{ marginLeft: 10 }}>
                <Text style=
                    {{
                        fontSize: 10,
                        fontFamily: getFontFamily('true', 'medium'),
                        color: theme.colors.title
                    }}>
                    Lucky Cement Nooribad
                </Text>
                <Text style={{fontSize: 8, fontFamily: getFontFamily('true', 'regular'), color: theme.colors.text, lineHeight: 16}}>30MW PV+ 28.8MW Wind MGCS</Text>
            </View>
        </View>
    );
}

export default HeaderCenterSecondary;