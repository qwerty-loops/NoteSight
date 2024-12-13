// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from './Screens/SplashScreen';
import MainMenuScreen from './Screens/MainMenuScreen';
import AudioRecorderScreen from './Screens/AudioRecorderScreen';
import CameraScreen from './Screens/CameraScreen';
import RecordingsListScreen from './Screens/RecordingsListScreen';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SplashScreen">
      <Stack.Screen
          name="SplashScreen"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainMenu"
          component={MainMenuScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AudioRecorderScreen"
          component={AudioRecorderScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CameraScreen"
          component={CameraScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RecordingsListScreen"
          component={RecordingsListScreen}
          options={{ headerShown: false }}
/>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
