import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  FlatList, 
  Alert, 
  Modal, 
  Platform, 
  PermissionsAndroid 
} from 'react-native';
import Slider from '@react-native-community/slider';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';

const AudioRecorderScreen = () => {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recordingsList, setRecordingsList] = useState([]);
  const [currentPlaybackUri, setCurrentPlaybackUri] = useState(null);
  const [currentPlaybackName, setCurrentPlaybackName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00:00');
  const [playTime, setPlayTime] = useState('00:00:00');
  const [duration, setDuration] = useState('00:00:00');
  const [sliderValue, setSliderValue] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

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
      const path = `${RNFS.DownloadDirectoryPath}/recording_${Date.now()}.mp3`;
      await audioRecorderPlayer.startRecorder(path);
      setRecording(true);
      setPaused(false);

      audioRecorderPlayer.addRecordBackListener((e) => {
        setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
      });
    } catch (error) {
      Alert.alert('Recording Error', error.message);
    }
  };

  const pauseRecording = async () => {
    try {
      if (paused) {
        await audioRecorderPlayer.resumeRecorder();
      } else {
        await audioRecorderPlayer.pauseRecorder();
      }
      setPaused(!paused);
    } catch (error) {
      Alert.alert('Pause Recording Error', error.message);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setRecording(false);
      setPaused(false);
      setRecordTime('00:00:00');

      const fileName = `recording_${Date.now()}.mp3`;
      setRecordingsList((prevList) => [
        ...prevList,
        { uri: result, name: fileName },
      ]);
    } catch (error) {
      Alert.alert('Stop Recording Error', error.message);
    }
  };

  const startPlaying = async (uri, name) => {
    try {
      setCurrentPlaybackUri(uri);
      setCurrentPlaybackName(name);
      setModalVisible(true);
      await audioRecorderPlayer.startPlayer(uri);
      setPlaying(true);

      audioRecorderPlayer.addPlayBackListener((e) => {
        const currentPos = Math.floor(e.currentPosition);
        const totalDur = Math.floor(e.duration);

        setPlayTime(audioRecorderPlayer.mmssss(currentPos));
        setDuration(audioRecorderPlayer.mmssss(totalDur));
        setSliderValue(currentPos / totalDur);
        setTotalDuration(totalDur);

        if (currentPos >= totalDur) {
          stopPlaying();
        }
      });
    } catch (error) {
      Alert.alert('Playback Error', error.message);
    }
  };

  const stopPlaying = async () => {
    try {
      await audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
      setPlaying(false);
      setPlayTime('00:00:00');
      setSliderValue(0);
    } catch (error) {
      Alert.alert('Stop Playback Error', error.message);
    }
  };

  const togglePlayPause = async () => {
    if (playing) {
      console.log('Pausing playback');
      await audioRecorderPlayer.pausePlayer();
    } else {
      console.log('Resuming playback');
      await audioRecorderPlayer.startPlayer(currentPlaybackUri);
    }
    setPlaying(!playing);
  };

  const onRewindPress = async () => {
    console.log('Rewind button pressed');
    const currentPos = sliderValue * totalDuration;
    const rewindTime = Math.max(currentPos - 10000, 0); // Rewind 10 seconds
    console.log(`Rewinding to: ${rewindTime}`);
    await audioRecorderPlayer.seekToPlayer(rewindTime);
  };

  const onForwardPress = async () => {
    console.log('Forward button pressed');
    const currentPos = sliderValue * totalDuration;
    const forwardTime = Math.min(currentPos + 10000, totalDuration); // Forward 10 seconds
    console.log(`Forwarding to: ${forwardTime}`);
    await audioRecorderPlayer.seekToPlayer(forwardTime);
  };

  const onSliderValueChange = async (value) => {
    console.log('Slider value changed:', value);
    const seekTime = value * totalDuration;
    console.log(`Seeking to: ${seekTime}`);
    await audioRecorderPlayer.seekToPlayer(seekTime);
    setSliderValue(value);
    if (!playing) {
      console.log('Resuming playback after slider scrub');
      await audioRecorderPlayer.resumePlayer();
      setPlaying(true);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.timerText}>
        {recording ? `Recording: ${recordTime}` : ''}
      </Text>

      {!recording && (
        <FlatList
          data={recordingsList}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <Pressable style={styles.playButton} onPress={() => startPlaying(item.uri, item.name)}>
              <Text style={styles.playButtonText}>{item.name}</Text>
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <View style={styles.controlButtons}>
        {recording && (
          <Pressable style={styles.controlButton} onPress={stopRecording}>
            <Text style={styles.controlButtonText}>Stop</Text>
          </Pressable>
        )}
        {recording && (
          <Pressable style={styles.controlButton} onPress={pauseRecording}>
            <Text style={styles.controlButtonText}>{paused ? 'Resume' : 'Pause'}</Text>
          </Pressable>
        )}
      </View>

      {!recording && (
        <Pressable
          style={[styles.recordButton, recording && styles.recording]}
          onPress={startRecording}
        >
          <Text style={styles.recordButtonText}>Start Recording</Text>
        </Pressable>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={styles.fullScreenPlayer}>
          <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.closeButtonText}>X</Text>
          </Pressable>
          <Text style={styles.playerTitle}>Now Playing</Text>
          <Text style={styles.playerFileName}>{currentPlaybackName}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={sliderValue}
            minimumTrackTintColor="#1DB954"
            maximumTrackTintColor="#d3d3d3"
            thumbTintColor="#1DB954"
            onSlidingComplete={onSliderValueChange}
          />
          <View style={styles.timestampContainer}>
            <Text style={styles.timeElapsed}>{playTime}</Text>
            <Text style={styles.totalTime}>{duration}</Text>
          </View>
          <View style={styles.playbackControls}>
            <Pressable style={styles.playbackButton} onPress={onRewindPress}>
              <Text style={styles.buttonText}>Rewind 10s</Text>
            </Pressable>
            <Pressable style={styles.playbackButton} onPress={togglePlayPause}>
              <Text style={styles.buttonText}>{playing ? 'Pause' : 'Play'}</Text>
            </Pressable>
            <Pressable style={styles.playbackButton} onPress={onForwardPress}>
              <Text style={styles.buttonText}>Forward 10s</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  recordButton: {
    backgroundColor: 'red',
    padding: 20,
    borderRadius: 50,
    marginBottom: 60,
    width: '60%',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
  },
  recording: {
    backgroundColor: 'darkred',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 18,
  },
  playButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    marginRight: 10,
    alignItems: 'center',
    width: '100%',
  },
  playButtonText: {
    color: 'white',
    fontSize: 16,
  },
  controlButtons: {
    flexDirection: 'row',
    marginVertical: 10,
    justifyContent: 'space-around',
    width: '80%',
  },
  controlButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
    width: '45%',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 16,
  },
  fullScreenPlayer: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  closeButtonText: {
    fontSize: 24,
    color: 'black',
  },
  playerTitle: {
    color: 'black',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  playerFileName: {
    color: 'grey',
    fontSize: 18,
    marginBottom: 20,
  },
  slider: {
    width: '90%',
    height: 40,
    marginBottom: 10,
  },
  timestampContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: 10,
  },
  timeElapsed: {
    color: 'black',
    fontSize: 14,
  },
  totalTime: {
    color: 'black',
    fontSize: 14,
  },
  playbackControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  playbackButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default AudioRecorderScreen;
