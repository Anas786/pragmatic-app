import { TouchableOpacity } from "react-native";
import Themestore from "../../store/themestore";
import FontAwesome6 from "@react-native-vector-icons/fontawesome6";

interface HeaderLeftProps {
    setvisible: (value: boolean) => void;
}

const Headerleft: React.FC<HeaderLeftProps>= ({setvisible}) => {
    const theme = Themestore(state => state.theme);
    return (
        <TouchableOpacity onPress={() => setvisible(true)}>
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