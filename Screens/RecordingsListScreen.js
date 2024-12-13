import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  Image,
  Modal,
} from 'react-native';
import RNFS from 'react-native-fs';
import Video from 'react-native-video';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import Slider from '@react-native-community/slider';

const RecordingsListScreen = () => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [playTime, setPlayTime] = useState('00:00:00');
  const [duration, setDuration] = useState('00:00:00');
  const [sliderValue, setSliderValue] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [playing, setPlaying] = useState(false);

  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;

  useEffect(() => {
    fetchMediaFiles();

    return () => {
      audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
    };
  }, []);

  const fetchMediaFiles = async () => {
    try {
      const files = await RNFS.readDir(RNFS.DownloadDirectoryPath);
      const filteredFiles = files.filter((file) =>
        ['.mp3', '.mp4', '.jpg', '.jpeg', '.png'].some((ext) =>
          file.name.endsWith(ext)
        )
      );
      setMediaFiles(filteredFiles);
    } catch (error) {
      Alert.alert('Error', 'Failed to load media files');
    }
  };

  const deleteMedia = async (filePath) => {
    try {
      await RNFS.unlink(filePath);
      Alert.alert('Success', 'File deleted successfully');
      fetchMediaFiles();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete the file');
    }
  };

  const openMedia = async (media) => {
    if (media.name.endsWith('.mp3')) {
      setSelectedMedia(media);
      setModalVisible(true);
      await startPlaying(media.path);
    } else {
      setSelectedMedia(media);
      setModalVisible(true);
    }
  };

  const closeMedia = async () => {
    setModalVisible(false);
    setSelectedMedia(null);
    await stopPlaying();
  };

  const startPlaying = async (path) => {
    try {
      setPlaying(true);
      await audioRecorderPlayer.startPlayer(path);

      audioRecorderPlayer.addPlayBackListener((e) => {
        const currentPosition = Math.floor(e.currentPosition);
        const totalDuration = Math.floor(e.duration);

        setPlayTime(audioRecorderPlayer.mmssss(currentPosition));
        setDuration(audioRecorderPlayer.mmssss(totalDuration));
        setSliderValue(currentPosition / totalDuration);
        setTotalDuration(totalDuration);

        if (currentPosition >= totalDuration) {
          resetPlayback();
        }
      });
    } catch (error) {
      Alert.alert('Playback Error', error.message);
    }
  };

  const stopPlaying = async () => {
    setPlaying(false);
    setPlayTime('00:00:00');
    setSliderValue(0);
    await audioRecorderPlayer.stopPlayer();
    audioRecorderPlayer.removePlayBackListener();
  };

  const resetPlayback = () => {
    setPlaying(false);
    setPlayTime('00:00:00');
    setSliderValue(0);
  };

  const togglePlayPause = async () => {
    if (playing) {
      await audioRecorderPlayer.pausePlayer();
    } else {
      await audioRecorderPlayer.startPlayer(selectedMedia.path);
    }
    setPlaying(!playing);
  };

  const rewind10s = async () => {
    const currentPos = sliderValue * totalDuration;
    const rewindTime = Math.max(currentPos - 10000, 0); // Rewind 10 seconds
    await audioRecorderPlayer.seekToPlayer(rewindTime);
  };

  const forward10s = async () => {
    const currentPos = sliderValue * totalDuration;
    const forwardTime = Math.min(currentPos + 10000, totalDuration); // Forward 10 seconds
    await audioRecorderPlayer.seekToPlayer(forwardTime);
  };

  const onSliderValueChange = async (value) => {
    const seekTime = value * totalDuration;
    await audioRecorderPlayer.seekToPlayer(seekTime);
    setSliderValue(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Media Files</Text>
      <FlatList
        data={mediaFiles}
        keyExtractor={(item) => item.path}
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => openMedia(item)}>
            <Text style={styles.itemText}>{item.name}</Text>
            <Pressable
              style={styles.deleteButton}
              onPress={() => deleteMedia(item.path)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </Pressable>
        )}
        contentContainerStyle={styles.listContainer}
      />

      <Modal visible={modalVisible} transparent>
        <View style={styles.modalContainer}>
          {selectedMedia && selectedMedia.name.endsWith('.mp4') ? (
            <Video
              source={{ uri: `file://${selectedMedia.path}` }}
              style={styles.fullScreenMedia}
              controls
              resizeMode="contain"
            />
          ) : selectedMedia && selectedMedia.name.endsWith('.mp3') ? (
            <View style={styles.audioPlayer}>
              <Text style={styles.modalText}>Playing: {selectedMedia.name}</Text>
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
                <Pressable style={styles.playbackButton} onPress={rewind10s}>
                  <Text style={styles.buttonText}>Rewind 10s</Text>
                </Pressable>
                <Pressable style={styles.playbackButton} onPress={togglePlayPause}>
                  <Text style={styles.buttonText}>{playing ? 'Pause' : 'Play'}</Text>
                </Pressable>
                <Pressable style={styles.playbackButton} onPress={forward10s}>
                  <Text style={styles.buttonText}>Forward 10s</Text>
                </Pressable>
              </View>
            </View>
          ) : selectedMedia && (
            <Image
              source={{ uri: `file://${selectedMedia.path}` }}
              style={styles.fullScreenMedia}
              resizeMode="contain"
            />
          )}
          <Pressable style={styles.closeIcon} onPress={closeMedia}>
            <Text style={styles.closeText}>X</Text>
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
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 50,
  },
  item: {
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 5,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenMedia: {
    width: '100%',
    height: '70%',
  },
  modalText: {
    color: 'white',
    fontSize: 20,
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
    color: 'white',
    fontSize: 14,
  },
  totalTime: {
    color: 'white',
    fontSize: 14,
  },
  playbackControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
  },
  playbackButton: {
    backgroundColor: '#1DB954',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  closeIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  closeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  audioPlayer: {
    width: '90%',
    alignItems: 'center',
  },
});

export default RecordingsListScreen;
