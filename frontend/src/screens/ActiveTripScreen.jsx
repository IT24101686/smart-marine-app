import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Image, 
    TextInput, 
    Alert,
    ActivityIndicator,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';
import { uploadToServer } from '../api/uploadService';

const ActiveTripScreen = ({ route, navigation }) => {
    const { tripId } = route.params;
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    
    // Catch Form States
    const [fishType, setFishType] = useState('');
    const [weight, setWeight] = useState('');
    const [grade, setGrade] = useState('Grade A');
    const [catchImages, setCatchImages] = useState([]);

    const fishTypes = ['Tuna (කෙලවල්ලා)', 'Skipjack (බලයා)', 'Marlin (කොප්පරා)', 'Mullet (මෝරා)', 'Other'];

    useEffect(() => {
        fetchTripDetails();
    }, []);

    const fetchTripDetails = async () => {
        try {
            const response = await client.get(`/api/trips/${tripId}`);
            setTrip(response.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not fetch trip info");
            navigation.goBack();
        }
    };

    const pickCatchImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setUploading(true);
            try {
                const uploadedUrls = await Promise.all(
                    result.assets.map(asset => uploadToServer(asset.uri))
                );
                setCatchImages([...catchImages, ...uploadedUrls]);
            } catch (error) {
                Alert.alert("Error", "Failed to upload images to server");
                console.error(error);
            } finally {
                setUploading(false);
            }
        }
    };

    const handleLogCatch = async () => {
        if (!fishType || !weight) {
            Alert.alert("Error", "Please fill type and weight");
            return;
        }

        try {
            setUploading(true);
            
            await client.post(`/api/trips/${tripId}/catch`, {
                fishType,
                grade,
                weight: parseFloat(weight),
                photos: catchImages
            });
            
            Alert.alert("Success", "Catch logged successfully!");
            setModalVisible(false);
            setFishType('');
            setWeight('');
            setCatchImages([]);
            fetchTripDetails();
        } catch (error) {
            Alert.alert("Error", "Failed to upload images or log catch");
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const handleCompleteTrip = async () => {
        Alert.alert(
            "Complete Trip",
            "Are you sure you want to end this trip?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Yes, End Trip", 
                    onPress: async () => {
                        try {
                            await client.put(`/api/trips/${tripId}/complete`);
                            navigation.replace('TripSummary', { tripId });
                        } catch (error) {
                            Alert.alert("Error", "Failed to complete trip");
                        }
                    }
                }
            ]
        );
    };

    if (loading && !trip) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Ongoing Trip</Text>
                        <TouchableOpacity onPress={handleCompleteTrip}>
                            <View style={styles.endBadge}>
                                <Text style={styles.endText}>End</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.boatCard}>
                    <Text style={styles.vesselName}>{trip?.vesselId?.name}</Text>
                    <View style={styles.statusRow}>
                        <Ionicons name="radio-outline" size={16} color="#ef4444" />
                        <Text style={styles.statusLive}>LIVE AT SEA</Text>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recorded Catches</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {trip?.catches && trip.catches.length > 0 ? (
                    trip.catches.map((c, index) => (
                        <View key={index} style={styles.catchCard}>
                            <View style={styles.catchHeader}>
                                <Text style={styles.fishType}>{c.fishType}</Text>
                                <View style={[
                                    styles.gradeBadge, 
                                    { backgroundColor: c.grade === 'Grade A' ? '#dcfce7' : '#fef9c3' }
                                ]}>
                                    <Text style={[
                                        styles.gradeText,
                                        { color: c.grade === 'Grade A' ? '#166534' : '#854d0e' }
                                    ]}>{c.grade}</Text>
                                </View>
                            </View>
                            <Text style={styles.weightText}>{c.weight} kg</Text>
                            
                            <ScrollView horizontal style={styles.catchPhotos}>
                                {c.photos && c.photos.map((p, i) => (
                                    <Image key={i} source={{ uri: p }} style={styles.miniPhoto} />
                                ))}
                            </ScrollView>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="fish-outline" size={60} color="#cbd5e1" />
                        <Text style={styles.emptyText}>No catch recorded yet. Tap + to add.</Text>
                    </View>
                )}
            </ScrollView>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Log New Catch</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text style={styles.label}>Fish Type / Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fishTypeContainer}>
                                {fishTypes.map((t) => (
                                    <TouchableOpacity 
                                        key={t} 
                                        style={[styles.fishTypeChip, fishType === t && styles.activeFishType]}
                                        onPress={() => setFishType(t)}
                                    >
                                        <Text style={[styles.fishTypeChipText, fishType === t && styles.activeFishTypeText]}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={styles.label}>Weight (kg)</Text>
                            <TextInput 
                                style={styles.input}
                                placeholder="e.g. 25.5"
                                keyboardType="numeric"
                                value={weight}
                                onChangeText={setWeight}
                            />

                            <Text style={styles.label}>Quality Grade</Text>
                            <View style={styles.gradeContainer}>
                                {['Grade A', 'Grade B', 'Grade C'].map((g) => (
                                    <TouchableOpacity 
                                        key={g} 
                                        style={[styles.gradeItem, grade === g && styles.activeGrade]}
                                        onPress={() => setGrade(g)}
                                    >
                                        <Text style={[styles.gradeItemText, grade === g && styles.activeGradeText]}>{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Photos</Text>
                            <TouchableOpacity style={styles.photoBtn} onPress={pickCatchImage} disabled={uploading}>
                                {uploading ? <ActivityIndicator color="#2563eb" /> : (
                                    <>
                                        <Ionicons name="camera" size={24} color="#2563eb" />
                                        <Text style={styles.photoBtnText}>Add Photos</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <ScrollView horizontal style={styles.previewScroll}>
                                {catchImages.map((uri, i) => (
                                    <Image key={i} source={{ uri }} style={styles.previewImg} />
                                ))}
                            </ScrollView>

                            <TouchableOpacity 
                                style={[styles.saveBtn, uploading && styles.disabledBtn]} 
                                onPress={handleLogCatch}
                                disabled={uploading}
                            >
                                {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Catch</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 10 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    endBadge: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    endText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    scrollContent: { padding: 24 },
    boatCard: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 24, elevation: 3 },
    vesselName: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
    statusLive: { fontSize: 12, fontWeight: '800', color: '#ef4444', letterSpacing: 1 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    addBtn: { backgroundColor: '#2563eb', width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    catchCard: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#2563eb' },
    catchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fishType: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    gradeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    gradeText: { fontSize: 10, fontWeight: '800' },
    weightText: { fontSize: 14, color: '#64748b', marginTop: 4, fontWeight: '600' },
    catchPhotos: { marginTop: 12 },
    miniPhoto: { width: 60, height: 60, borderRadius: 8, marginRight: 8, backgroundColor: '#f1f5f9' },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { marginTop: 16, color: '#94a3b8', fontSize: 14, textAlign: 'center' },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    label: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, fontWeight: '600' },
    gradeContainer: { flexDirection: 'row', gap: 10 },
    gradeItem: { flex: 1, paddingVertical: 12, backgroundColor: '#f1f5f9', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    activeGrade: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    gradeItemText: { fontWeight: '700', color: '#64748b' },
    activeGradeText: { color: '#fff' },
    photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', borderStyle: 'dashed' },
    photoBtnText: { color: '#2563eb', fontWeight: '700' },
    previewScroll: { marginTop: 12 },
    previewImg: { width: 80, height: 80, borderRadius: 12, marginRight: 10 },
    saveBtn: { backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 30, marginBottom: 20 },
    disabledBtn: { backgroundColor: '#94a3b8' },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    fishTypeContainer: { flexDirection: 'row', marginBottom: 5 },
    fishTypeChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    activeFishType: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    fishTypeChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    activeFishTypeText: { color: '#fff' },
});

export default ActiveTripScreen;
