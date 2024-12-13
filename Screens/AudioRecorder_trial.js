import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Alert, Modal, Platform, PermissionsAndroid } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';

const AudioRecorderScreen = () => {
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recordingsList, setRecordingsList] = useState([]);
  const [currentPlaybackUri, setCurrentPlaybackUri] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;

  useEffect(() => {
    const requestPermissions = async () => {
      const microphonePermission = await requestMicrophonePermission();

      if (!microphonePermission) {
        Alert.alert('Permission Required', 'Microphone access is required to record audio.');
      }

      if (Platform.OS === 'android') {
        await requestStoragePermission();
      }
    };

    requestPermissions();

    return () => {
      audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
    };
  }, []);

  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
        title: 'Microphone Permission',
        message: 'This app needs access to your microphone to record audio.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 29) {
      return true;
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission',
        message: 'This app needs access to your storage to save audio files.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const startRecording = async () => {
    try {
      const path = Platform.select({
        ios: 'recording.m4a',
        android: `${RNFS.DocumentDirectoryPath}/recording.mp3`,
      });
      await audioRecorderPlayer.startRecorder(path);
      setRecording(true);

      audioRecorderPlayer.addRecordBackListener((e) => {
        console.log('Recording progress:', e.currentPosition);
      });
    } catch (error) {
      Alert.alert('Recording Error', error.message);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      console.log('Recording saved at:', result);
      setRecording(false);

      const fileName = `recording_${Date.now()}.mp3`;
      setRecordingsList((prevList) => [
        ...prevList,
        { uri: result, name: fileName },
      ]);
    } catch (error) {
      Alert.alert('Stop Recording Error', error.message);
    }
  };

  const startPlaying = async (uri) => {
    try {
      await audioRecorderPlayer.startPlayer(uri);
      setPlaying(true);
      setCurrentPlaybackUri(uri);

      audioRecorderPlayer.addPlayBackListener((e) => {
        if (e.currentPosition === e.duration) {
          stopPlaying();
        }
      });
      setModalVisible(true);
    } catch (error) {
      Alert.alert('Playback Error', error.message);
    }
  };

  const stopPlaying = async () => {
    try {
      await audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
      setPlaying(false);
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Stop Playback Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.recordButton, recording && styles.recording]}
        onPress={recording ? stopRecording : startRecording}
      >
        <Text style={styles.recordButtonText}>
          {recording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </Pressable>

      <FlatList
        data={recordingsList}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <Pressable style={styles.playButton} onPress={() => startPlaying(item.uri)}>
            <Text style={styles.playButtonText}>{item.name}</Text>
          </Pressable>
        )}
      />

      <Modal visible={modalVisible} transparent>
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalButton} onPress={stopPlaying}>
            <Text style={styles.modalButtonText}>Stop Playback</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#007BFF',
    padding: 20,
    borderRadius: 50,
    marginBottom: 20,
    width: '60%',
    alignItems: 'center',
  },
  recording: {
    backgroundColor: 'red',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 18,
  },
  playButton: {
    backgroundColor: '#008000',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    alignItems: 'center',
    width: '80%',
  },
  playButtonText: {
    color: 'white',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButton: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 5,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 18,
  },
});

export default AudioRecorderScreen;
