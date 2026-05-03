import React, { useState } from 'react';
import { 
    View, 
    TouchableOpacity, 
    Image, 
    Text, 
    StyleSheet, 
    ActivityIndicator,
    Alert 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { uploadToServer } from '../api/uploadService';

const ImageUploadButton = ({ onImageUploaded, initialImage, bucket = 'marine-storage', folder = 'uploads', label = 'Select Image' }) => {
    const [image, setImage] = useState(initialImage);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            uploadPhoto(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            uploadPhoto(result.assets[0].uri);
        }
    };

    const uploadPhoto = async (uri) => {
        setUploading(true);
        try {
            const publicUrl = await uploadToServer(uri);
            setImage(publicUrl);
            onImageUploaded(publicUrl);
        } catch (error) {
            Alert.alert('Error', 'Failed to upload image to server.');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            {image ? (
                <View style={styles.imageWrapper}>
                    <Image source={{ uri: image }} style={styles.image} />
                    <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)}>
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} disabled={uploading}>
                        {uploading ? (
                            <ActivityIndicator color="#2563eb" />
                        ) : (
                            <>
                                <Ionicons name="image-outline" size={32} color="#2563eb" />
                                <Text style={styles.uploadText}>{label}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.uploadBtn, styles.cameraBtn]} onPress={takePhoto} disabled={uploading}>
                        <Ionicons name="camera-outline" size={32} color="#fff" />
                        <Text style={[styles.uploadText, { color: '#fff' }]}>Take Photo</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginVertical: 10 },
    buttonContainer: { flexDirection: 'row', gap: 10 },
    uploadBtn: { 
        flex: 1,
        height: 100, 
        borderWidth: 2, 
        borderColor: '#e2e8f0', 
        borderStyle: 'dashed', 
        borderRadius: 16, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f8fafc'
    },
    cameraBtn: {
        backgroundColor: '#2563eb',
        borderStyle: 'solid',
        borderColor: '#2563eb'
    },
    uploadText: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#64748b' },
    imageWrapper: { position: 'relative', width: '100%', height: 200, borderRadius: 16, overflow: 'hidden' },
    image: { width: '100%', height: '100%', resizeMode: 'cover' },
    removeBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: '#fff', borderRadius: 12 }
});

export default ImageUploadButton;
