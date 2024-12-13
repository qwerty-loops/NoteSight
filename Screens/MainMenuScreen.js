// MainMenuScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MainMenuScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    configureGoogleSign();
    checkSignInStatus();
  }, []);

  const configureGoogleSign = () => {
    GoogleSignin.configure({
      
      // Get this from Google Cloud Console
      webClientId: '279701516543-4j4000er9rnko27me9d21ntkghnk2k4k.apps.googleusercontent.com',
      offlineAccess: true,
    });
  };

  const checkSignInStatus = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        setIsSignedIn(true);
      }
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const signIn = async () => {
    try {
      console.log('Checking Play Services...');
      await GoogleSignin.hasPlayServices();
      
      console.log('Attempting sign in...');
      const userInfo = await GoogleSignin.signIn();
      console.log('Sign in successful:', userInfo);
      console.log(userInfo.data.idToken);

      
      if (!userInfo || !userInfo.data.idToken) {
        throw new Error('Failed to get valid user info from Google Sign In');
      }
      
      // Store user info in AsyncStorage
      await AsyncStorage.setItem('userToken', userInfo.data.idToken);
      await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo.data.user));
      
      setIsSignedIn(true);
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Sign in cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Sign in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Play services not available');
      } else {
        Alert.alert('Something went wrong', error.toString());
        console.error(error);
      }
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userInfo');
      setIsSignedIn(false);
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>NoteSight</Text>
        <Pressable
          style={styles.button}
          onPress={signIn}
        >
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NoteSight</Text>
      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('AudioRecorderScreen')}
      >
        <Text style={styles.buttonText}>Record Audio</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('CameraScreen')}
      >
        <Text style={styles.buttonText}>Record Video</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('RecordingsListScreen')}
      >
        <Text style={styles.buttonText}>View Recordings</Text>
      </Pressable>
      <Pressable
        style={[styles.button, styles.signOutButton]}
        onPress={signOut}
      >
        <Text style={styles.buttonText}>Sign Out</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    marginTop: 20,
  },
});

export default MainMenuScreen;