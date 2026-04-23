import React from 'react';
import { StatusBar, StyleSheet, View, Alert, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Geolocation from 'react-native-geolocation-service';
import Map from './src/components/Map';
import ReportButton from './src/components/ReportButton';
import { submitReport } from './src/services/reports';

function App() {
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted';
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location to report transport inspectors.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return false;
  };

  const handleReport = async () => {
    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Location access is required to submit reports.');
      return;
    }

    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await submitReport(latitude, longitude);
          console.log('Report submitted at:', latitude, longitude);
        } catch (error) {
          console.log('Failed to submit report (likely Firebase config missing)');
          Alert.alert('Configuration Required', 'Report logic is ready, but Firebase must be configured with valid credentials.');
        }
      },
      (error) => {
        console.error('Geolocation Error:', error);
        Alert.alert('Error', 'Could not determine your location. Please try again.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Map />
        <ReportButton onReport={handleReport} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
