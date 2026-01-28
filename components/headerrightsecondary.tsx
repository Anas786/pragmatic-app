import FontAwesome6 from "@react-native-vector-icons/fontawesome6";
import Themestore from "../store/themestore";
import { StyleSheet, Text, View } from "react-native";
import { getFontFamily } from "../assets/utils/fontfamily";

const Headerrightsecondary: React.FC = () => {
    const theme = Themestore(state => state.theme);
    return (
        <View style={[styles.status, { backgroundColor: theme.colors.headerstatus, borderColor: theme.colors.bordercolor }]}>
            <View style=
            {{ 
                flexDirection: 'row', 
                position: "relative", 
                justifyContent: 'space-between', 
                alignItems: 'center' 
            }}>
                <View style=
                {{ 
                    backgroundColor: theme.colors.headerstatusiconbg, 
                    borderRadius: 100, 
                    borderColor: theme.colors.headerstatusiconbg, 
                    width: 12, 
                    height: 12 
                }}>
                    <FontAwesome6 name="circle" iconStyle="solid" size={10} color={theme.colors.headeractivestatusicon} style={{ width: 10, height: 10 }} />
                </View>
                <Text style=
                {{
                    fontSize: 8, 
                    fontFamily: getFontFamily('true', 'medium'), 
                    color: theme.colors.title,
                    marginLeft: 4,
                }}>
                    Online
                </Text>
            </View>
        </View>
    );
}

export default Headerrightsecondary;

const styles = StyleSheet.create({
    status: {
        width: 60,
        height: 30,
        borderRadius: 106.67,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        marginRight: 12,
        marginTop: 8,

    }
})