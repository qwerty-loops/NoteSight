// SplashScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('MainMenu'); // Navigate to Main Menu after 2 seconds
    }, 2000);
    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NoteSight</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007BFF', // Primary blue color
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default SplashScreen;
