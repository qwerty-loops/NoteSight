import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Alert, PermissionsAndroid, Platform, Image, Modal, FlatList, Text } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/AntDesign';

const CameraScreen = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState(false);
  const [recentMedia, setRecentMedia] = useState([]); // Store paths of all media in session
  const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);
  const [currentFullScreenMedia, setCurrentFullScreenMedia] = useState(null); // Track media in full-screen view
  const cameraRef = useRef(null);
  const devices = useCameraDevices();
  const device = devices?.find((d) => d.position === 'back');
  const longPressTimeout = useRef(null);

  useEffect(() => {
    const requestPermissions = async () => {
      const cameraPermission = await Camera.requestCameraPermission();
      const microphonePermission = await Camera.requestMicrophonePermission();

      if (Platform.OS === 'android') {
        await requestStoragePermission();
      }
    };

    requestPermissions();
  }, []);

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 29) {
      return true;
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission Required',
        message: 'This app needs access to your storage to save photos and videos.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const generateUniqueFileName = (prefix, extension) => {
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
    return `${prefix}_${timestamp}.${extension}`;
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    const tempPath = `${RNFS.CachesDirectoryPath}/video.mp4`;

    try {
      setIsRecording(true);
      await cameraRef.current.startRecording({
        onRecordingFinished: async (video) => {
          const uniqueFileName = generateUniqueFileName('video', 'mp4');
          const destinationPath = `${RNFS.DownloadDirectoryPath}/${uniqueFileName}`;
          await moveFile(video.path, destinationPath);
          addRecentMedia({ path: destinationPath, type: 'video' });
          Alert.alert('Recording Finished', `Video saved to: ${destinationPath}`);
        },
        onRecordingError: (error) => {
          Alert.alert('Recording Error', error.message);
          setIsRecording(false);
          setRecordingMode(false);
        },
      });
    } catch (error) {
      Alert.alert('Error', error.message);
      setIsRecording(false);
      setRecordingMode(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    if (cameraRef.current) {
      await cameraRef.current.stopRecording();
      setIsRecording(false);
      setRecordingMode(false);
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePhoto({
        quality: 1,
        skipMetadata: true,
      });
      const uniqueFileName = generateUniqueFileName('photo', 'jpg');
      const destinationPath = `${RNFS.DownloadDirectoryPath}/${uniqueFileName}`;
      await moveFile(photo.path, destinationPath);
      addRecentMedia({ path: destinationPath, type: 'photo' });
      Alert.alert('Photo Captured', `Photo saved to: ${destinationPath}`);
    } catch (error) {
      Alert.alert('Photo Error', error.message);
    }
  };

  const moveFile = async (sourcePath, destinationPath) => {
    try {
      await RNFS.moveFile(sourcePath, destinationPath);
      console.log('File moved to:', destinationPath);
    } catch (error) {
      console.error('Error moving file:', error);
      Alert.alert('Error', 'Could not save file to Downloads folder.');
    }
  };

  const addRecentMedia = (media) => {
    setRecentMedia((prevMedia) => [media, ...prevMedia]);
  };

  const handlePressIn = () => {
    longPressTimeout.current = setTimeout(() => {
      setRecordingMode(true);
      startRecording();
    }, 2000);
  };

  const handlePressOut = () => {
    clearTimeout(longPressTimeout.current);
    if (!recordingMode) {
      takePhoto();
    }
  };

  const handleTapWhileRecording = () => {
    if (recordingMode) {
      stopRecording();
    }
  };

  const openFullScreen = (media) => {
    if (media) {
      setCurrentFullScreenMedia(media);
      setIsFullScreenVisible(true);
    }
  };

  const closeFullScreen = () => {
    setIsFullScreenVisible(false);
    setCurrentFullScreenMedia(null); // Reset to avoid null property access
  };

  if (!device) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        device={device}
        isActive={true}
        video={true}
        audio={true}
        photo={true}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.buttonContainer}>
        <Pressable
          style={[
            styles.donutButton,
            isRecording && styles.donutButtonRecording,
          ]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handleTapWhileRecording}
        />
      </View>
      <View style={styles.galleryContainer}>
        <FlatList
          horizontal
          data={recentMedia}
          keyExtractor={(item, index) => index.toString()}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable style={styles.galleryItem} onPress={() => openFullScreen(item)}>
              {item.type === 'video' ? (
                <Video
                  source={{ uri: item.path }}
                  style={styles.galleryMedia}
                  muted
                  resizeMode="contain"
                />
              ) : (
                <Image
                  source={{ uri: `file://${item.path}` }}
                  style={styles.galleryMedia}
                  resizeMode="cover"
                />
              )}
            </Pressable>
          )}
        />
      </View>
      <Modal visible={isFullScreenVisible} transparent>
        <View style={styles.fullScreenContainer}>
          {currentFullScreenMedia?.type === 'video' ? (
            <Video
              source={{ uri: currentFullScreenMedia.path }}
              style={styles.fullScreenMedia}
              controls
              resizeMode="contain"
            />
          ) : (
            <Image
              source={{ uri: `file://${currentFullScreenMedia?.path}` }}
              style={styles.fullScreenMedia}
              resizeMode="contain"
            />
          )}
          <View style={styles.closeIconContainer}>
            <Icon name="close" size={24} color="white" onPress={closeFullScreen} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  donutButtonRecording: {
    borderColor: 'red',
  },
  galleryContainer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    paddingHorizontal: 10,
  },
  galleryItem: {
    width: 70,
    height: 70,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'black',
  },
  galleryMedia: {
    width: '100%',
    height: '100%',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenMedia: {
    width: '100%',
    height: '80%',
  },
  closeIconContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
});

export default CameraScreen;
