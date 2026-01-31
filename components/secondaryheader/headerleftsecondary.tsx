import { useNavigation } from "@react-navigation/native";
import Themestore from "../../store/themestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/navigation";
import { StyleSheet, TouchableOpacity } from "react-native";
import FontAwesome6 from "@react-native-vector-icons/fontawesome6";

const Headerleft: React.FC = () => {
    const theme = Themestore(state => state.theme);
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const handlebackbutton = () => {
        navigation.goBack();
    }
    return (
        <TouchableOpacity onPress={handlebackbutton} style={[styles.backbutton, { backgroundColor: theme.colors.headerbackbuttonbg, borderColor: theme.colors.bordercolor }]}>
            <FontAwesome6
                name="chevron-left"
                style={{
                    width: 16,
                    height: 16,
                }}
                color={theme.colors.iconsecondary}
                size={14}
                iconStyle="solid"
            />
        </TouchableOpacity>
    );
}

export default Headerleft;

const styles = StyleSheet.create({
    backbutton: {
        width: 32,
        height: 32,
        borderRadius: 80,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        marginLeft: 12,
        marginTop: 8,

    }
})