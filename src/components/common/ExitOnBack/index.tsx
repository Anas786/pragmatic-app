import { useEffect, useRef } from "react";
import { BackHandler, ToastAndroid } from "react-native";
import RNExitApp from "react-native-exit-app";

export const useExitOnBack = () => {
  const backPressedOnce = useRef(false);
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (backPressedOnce.current) {
        RNExitApp.exitApp();
        return true;
      }

      backPressedOnce.current = true;
      ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);

      setTimeout(() => {
        backPressedOnce.current = false;
      }, 2000);

      return true;
    });

    return () => handler.remove();
  }, []);
};
