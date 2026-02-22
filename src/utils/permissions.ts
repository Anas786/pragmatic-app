import { Alert, Platform, PermissionsAndroid } from 'react-native';

export interface PermissionStatus {
  camera: boolean;
  photoLibrary: boolean;
  location: boolean;
}

export const requestAppPermissions = async (): Promise<PermissionStatus> => {
  const permissions: PermissionStatus = {
    camera: false,
    photoLibrary: false,
    location: false,
  };

  try {
    if (Platform.OS === 'ios') {
      // iOS permissions are handled by react-native-image-picker automatically
      // We'll just return true for iOS since the library handles it
      permissions.camera = true;
      permissions.photoLibrary = true;
      permissions.location = true;
    } else if (Platform.OS === 'android') {
      // Android permissions
      const cameraGranted = await requestCameraPermissionAndroid();
      const storageGranted = await requestStoragePermissionAndroid();
      const locationGranted = await requestLocationPermissionAndroid();

      permissions.camera = cameraGranted;
      permissions.photoLibrary = storageGranted;
      permissions.location = locationGranted;

      if (!cameraGranted) {
        showPermissionAlert('Camera', 'camera');
      }

      if (!storageGranted) {
        showPermissionAlert('Photo Library', 'storage');
      }

      if (!locationGranted) {
        showPermissionAlert('Location', 'location');
      }
    }

    return permissions;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return permissions;
  }
};

const requestCameraPermissionAndroid = async (): Promise<boolean> => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'This app needs access to your camera to take profile photos.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Camera permission request error:', err);
    return false;
  }
};

const requestStoragePermissionAndroid = async (): Promise<boolean> => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission',
        message: 'This app needs access to your photo library to select profile photos.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Storage permission request error:', err);
    return false;
  }
};

const requestLocationPermissionAndroid = async (): Promise<boolean> => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'This app needs access to your location to show you on the map.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Location permission request error:', err);
    return false;
  }
};

const showPermissionAlert = (permissionName: string, permissionType: string) => {
  Alert.alert(
    `${permissionName} Permission Required`,
    `This app needs access to your ${permissionType} to provide profile photo functionality. Please enable it in your device settings.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => openAppSettings() },
    ]
  );
};

const openAppSettings = () => {
  // This would typically use react-native-permissions' openSettings()
  // For now, we'll just show a message
  Alert.alert(
    'Open Settings',
    'Please go to your device settings and enable the required permissions for this app.',
    [{ text: 'OK' }]
  );
};

export const checkPermissions = async (): Promise<PermissionStatus> => {
  const permissions: PermissionStatus = {
    camera: false,
    photoLibrary: false,
    location: false,
  };

  try {
    if (Platform.OS === 'ios') {
      // iOS permissions are handled by react-native-image-picker
      permissions.camera = true;
      permissions.photoLibrary = true;
      permissions.location = true;
    } else if (Platform.OS === 'android') {
      const cameraStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      const storageStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      const locationStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

      permissions.camera = cameraStatus;
      permissions.photoLibrary = storageStatus;
      permissions.location = locationStatus;
    }

    return permissions;
  } catch (error) {
    console.error('Error checking permissions:', error);
    return permissions;
  }
}; 