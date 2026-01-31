import React from "react";
import { Image } from "react-native";

const HeaderCenterPrimary: React.FC = () => {
    return (
        <Image
            style={{ width: 40, height: 27 }}
            source={require('../../assets/headerlogo.png')}
        />
    );
}

export default HeaderCenterPrimary;