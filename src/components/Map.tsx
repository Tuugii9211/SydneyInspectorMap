import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-map-clustering';
import { PROVIDER_GOOGLE, Polyline, Marker } from 'react-native-maps';
import transportLines from '../data/transportLines.json';
import { subscribeToReports, Report } from '../services/reports';

const SYDNEY_CBD = {
  latitude: -33.8688,
  longitude: 151.2093,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const Map = () => {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    // Note: This will fail until Firebase is configured
    try {
      const unsubscribe = subscribeToReports((newReports) => {
        setReports(newReports);
      });
      return () => unsubscribe();
    } catch (e) {
      console.log('Firebase not initialized yet');
    }
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={SYDNEY_CBD}
      >
        {transportLines.features.map((feature, index) => (
          <Polyline
            key={index}
            coordinates={feature.geometry.coordinates.map(coord => ({
              longitude: coord[0],
              latitude: coord[1],
            }))}
            strokeColor={feature.properties.color}
            strokeWidth={3}
          />
        ))}

        {reports.map((report) => (
          <Marker
            key={report.id}
            coordinate={report.location}
            title="Transport Inspector"
            description="Reported by community"
            pinColor="red"
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default Map;
