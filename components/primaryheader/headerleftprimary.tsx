import { Alert, TouchableOpacity } from "react-native";
import Themestore from "../../store/themestore";
import FontAwesome6 from "@react-native-vector-icons/fontawesome6";

const Headerleft: React.FC = () => {
    const theme = Themestore(state => state.theme);
    return (
        <TouchableOpacity onPress={() => Alert.alert('Drawer will be here')}>
            <FontAwesome6
                name="align-left"
                style={{
                    top: 8,
                    gap: 7.5,
                    width: 20,
                    height: 20,
                    paddingRight: 2,
                    marginLeft: 12,
                }}
                color={theme.colors.iconsecondary}
                size={20}
                iconStyle="solid"
            />
        </TouchableOpacity>
    );
}

export default Headerleft;