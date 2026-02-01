import { TouchableOpacity } from "react-native";
import Themestore from "../../store/themestore";
import FontAwesome6 from "@react-native-vector-icons/fontawesome6";


interface HeaderRightProps {
    setvisible: (value: boolean) => void;
}
const HeaderRight: React.FC<HeaderRightProps> = ({setvisible}) => {
    const theme = Themestore(state => state.theme);
    const toggleTheme = Themestore((state) => state.toggleTheme);
    const mode = Themestore((state) => state.mode);
    return (
        <>
            <TouchableOpacity
                onPress={() => setvisible(true)}
            >
                <FontAwesome6
                    name="bell"
                    style={{
                        top: 7,
                        gap: 10,
                        width: 20,
                        height: 20,
                        marginRight: 12,
                    }}
                    color={theme.colors.iconsecondary}
                    size={20}
                    iconStyle="regular"
                />
            </TouchableOpacity>
            <TouchableOpacity
                onPress={toggleTheme}
            >
                <FontAwesome6
                    name={mode === 'dark' ? 'sun' : 'moon'}
                    style={{
                        top: 7,
                        gap: 10,
                        width: 20,
                        height: 20,
                        marginRight: 12,
                    }}
                    color={theme.colors.iconsecondary}
                    size={20}
                    iconStyle="regular"
                />
            </TouchableOpacity>
        </>
    );
}

export default HeaderRight;