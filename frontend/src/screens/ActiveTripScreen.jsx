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

    // ── Log/Edit Catch Modal ──────────────────────────────────────
    const [catchModalVisible, setCatchModalVisible] = useState(false);
    const [isEditingCatch, setIsEditingCatch] = useState(false);
    const [editingCatchId, setEditingCatchId] = useState(null);
    const [fishType, setFishType] = useState('');
    const [weight, setWeight] = useState('');
    const [grade, setGrade] = useState('Grade A');
    const [catchImages, setCatchImages] = useState([]);

    // ── End Trip (Set Prices) Modal ───────────────────────────
    const [endModalVisible, setEndModalVisible] = useState(false);
    const [tripFishTypes, setTripFishTypes] = useState([]);   // [{fishType, totalWeight, grades}]
    const [priceInputs, setPriceInputs] = useState({});       // { fishType: pricePerKg string }
    const [savingPrices, setSavingPrices] = useState(false);
    const [loadingFishTypes, setLoadingFishTypes] = useState(false);

    const fishTypes = ['Tuna (කෙලවල්ලා)', 'Skipjack (බලයා)', 'Marlin (කොප්පරා)', 'Mullet (මෝරා)', 'Other'];

    useEffect(() => {
        fetchTripDetails();
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        }
    };

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

    // ── Catch Image Upload ────────────────────────────────────
    const pickCatchImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

    // ── Log/Update Catch Submit ──────────────────────────────────────
    const handleLogCatch = async () => {
        if (!fishType || !weight) {
            Alert.alert("Error", "Please fill type and weight");
            return;
        }

        try {
            setUploading(true);
            const payload = {
                fishType,
                grade,
                weight: parseFloat(weight),
                photos: catchImages
            };

            if (isEditingCatch) {
                await client.put(`/api/trips/catch/${editingCatchId}`, payload);
                Alert.alert("Success", "Catch updated successfully!");
            } else {
                await client.post(`/api/trips/${tripId}/catch`, payload);
                Alert.alert("Success", "Catch logged successfully!");
            }

            setCatchModalVisible(false);
            resetCatchForm();
            fetchTripDetails();
        } catch (error) {
            Alert.alert("Error", `Failed to ${isEditingCatch ? 'update' : 'log'} catch`);
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const resetCatchForm = () => {
        setFishType('');
        setWeight('');
        setGrade('Grade A');
        setCatchImages([]);
        setIsEditingCatch(false);
        setEditingCatchId(null);
    };

    const handleEditCatch = (c) => {
        setFishType(c.fishType);
        setWeight(c.weight.toString());
        setGrade(c.grade);
        setCatchImages(c.photos || []);
        setEditingCatchId(c._id);
        setIsEditingCatch(true);
        setCatchModalVisible(true);
    };

    const handleDeleteCatch = (catchId) => {
        Alert.alert(
            "Delete Catch",
            "Are you sure you want to remove this record?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await client.delete(`/api/trips/catch/${catchId}`);
                            fetchTripDetails();
                        } catch (error) {
                            setLoading(false);
                            Alert.alert("Error", "Failed to delete catch");
                        }
                    }
                }
            ]
        );
    };

    // ── Open End Trip Modal ───────────────────────────────────
    const openEndTripModal = async () => {
        setLoadingFishTypes(true);
        setEndModalVisible(true);
        try {
            const res = await client.get(`/api/fish-prices/${tripId}/fish-types`);
            const types = res.data.fishTypes || [];
            setTripFishTypes(types);

            // Pre-fill price inputs (empty)
            const initial = {};
            types.forEach(ft => { initial[ft.fishType] = ''; });
            setPriceInputs(initial);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not fetch fish types from catches");
        } finally {
            setLoadingFishTypes(false);
        }
    };

    // ── Save Prices & Complete Trip ───────────────────────────
    const handleSavePricesAndEnd = async () => {
        const incomplete = tripFishTypes.some(ft => !priceInputs[ft.fishType] || parseFloat(priceInputs[ft.fishType]) <= 0);
        if (incomplete) {
            Alert.alert("Missing Prices", "Please enter a price per kg for every fish type.");
            return;
        }

        const prices = tripFishTypes.map(ft => ({
            fishType: ft.fishType,
            pricePerKg: parseFloat(priceInputs[ft.fishType])
        }));

        try {
            setSavingPrices(true);
            await client.post(`/api/fish-prices/${tripId}`, { prices });
            await client.put(`/api/trips/${tripId}/complete`);
            setEndModalVisible(false);
            navigation.replace('TripSummary', { tripId });
        } catch (error) {
            Alert.alert("Error", error.response?.data?.message || "Failed to save prices and end trip");
            console.error(error);
        } finally {
            setSavingPrices(false);
        }
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
                        <TouchableOpacity onPress={openEndTripModal}>
                            <View style={styles.endBadge}>
                                <Ionicons name="flag" size={13} color="#fff" />
                                <Text style={styles.endText}>End Trip</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.boatCard}>
                    <Text style={styles.vesselName}>{trip?.vesselId?.name || 'Vessel'}</Text>
                    <View style={styles.statusRow}>
                        <Ionicons name="radio-outline" size={16} color="#ef4444" />
                        <Text style={styles.statusLive}>LIVE AT SEA</Text>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recorded Catches</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => { resetCatchForm(); setCatchModalVisible(true); }}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {trip?.catches && trip.catches.length > 0 ? (
                    trip.catches.map((c, index) => (
                        <View key={c._id || index} style={styles.catchCard}>
                            <View style={styles.catchHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fishType}>{c.fishType}</Text>
                                    <View style={[
                                        styles.gradeBadge,
                                        { backgroundColor: c.grade === 'Grade A' ? '#dcfce7' : c.grade === 'Grade B' ? '#fef9c3' : '#fee2e2' }
                                    ]}>
                                        <Text style={[
                                            styles.gradeText,
                                            { color: c.grade === 'Grade A' ? '#166534' : c.grade === 'Grade B' ? '#854d0e' : '#991b1b' }
                                        ]}>{c.grade}</Text>
                                    </View>
                                </View>
                                <View style={styles.catchActions}>
                                    <TouchableOpacity onPress={() => handleEditCatch(c)} style={styles.actionIcon}>
                                        <Ionicons name="create-outline" size={22} color="#2563eb" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteCatch(c._id)} style={styles.actionIcon}>
                                        <Ionicons name="trash-outline" size={22} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Text style={styles.weightText}>{String(c.weight)} kg</Text>
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

            {/* LOG / EDIT CATCH MODAL */}
            <Modal visible={catchModalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditingCatch ? 'Edit Catch Quality' : 'Log New Catch'}</Text>
                            <TouchableOpacity onPress={() => setCatchModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Fish Type / Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                                {fishTypes.map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.chip, fishType === t && styles.chipActive]}
                                        onPress={() => setFishType(t)}
                                    >
                                        <Text style={[styles.chipText, fishType === t && styles.chipTextActive]}>{t}</Text>
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

                            <Text style={styles.label}>Photos (Optional)</Text>
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
                                {uploading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.saveBtnText}>{isEditingCatch ? 'Update Record' : 'Save Catch'}</Text>
                                }
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* END TRIP — SET FISH PRICES MODAL */}
            <Modal visible={endModalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Set Fish Prices</Text>
                                <Text style={styles.modalSubtitle}>Price per kg before ending trip</Text>
                            </View>
                            <TouchableOpacity onPress={() => setEndModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {loadingFishTypes ? (
                            <View style={styles.modalLoader}>
                                <ActivityIndicator size="large" color="#2563eb" />
                                <Text style={styles.loadingText}>Loading catches...</Text>
                            </View>
                        ) : tripFishTypes.length === 0 ? (
                            <View style={styles.modalLoader}>
                                <Ionicons name="fish-outline" size={60} color="#cbd5e1" />
                                <Text style={styles.emptyText}>No catches recorded for this trip yet.{'\n'}Add catches before ending the trip.</Text>
                                <TouchableOpacity style={[styles.saveBtn, { marginTop: 20 }]} onPress={() => setEndModalVisible(false)}>
                                    <Text style={styles.saveBtnText}>Go Back</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.summaryBanner}>
                                    <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
                                    <Text style={styles.summaryText}>
                                        {tripFishTypes.length} fish type{tripFishTypes.length > 1 ? 's' : ''} recorded. Enter selling price per kg for each.
                                    </Text>
                                </View>

                                {tripFishTypes.map((ft) => (
                                    <View key={ft.fishType} style={styles.priceRow}>
                                        <View style={styles.priceRowLeft}>
                                            <Text style={styles.priceRowFish}>{ft.fishType}</Text>
                                            <View style={styles.priceRowMeta}>
                                                <Text style={styles.priceRowWeight}>Total: {String(ft.totalWeight)} kg</Text>
                                                {ft.grades.map(g => (
                                                    <View key={g} style={[styles.gradePill, { backgroundColor: g === 'Grade A' ? '#dcfce7' : g === 'Grade B' ? '#fef9c3' : '#fee2e2' }]}>
                                                        <Text style={[styles.gradePillText, { color: g === 'Grade A' ? '#166534' : g === 'Grade B' ? '#854d0e' : '#991b1b' }]}>{g}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                        <View style={styles.priceInputWrapper}>
                                            <Text style={styles.lkrLabel}>LKR</Text>
                                            <TextInput
                                                style={styles.priceInput}
                                                placeholder="0.00"
                                                keyboardType="numeric"
                                                value={priceInputs[ft.fishType]}
                                                onChangeText={(val) => setPriceInputs(prev => ({ ...prev, [ft.fishType]: val }))}
                                            />
                                            <Text style={styles.perKgLabel}>/kg</Text>
                                        </View>
                                    </View>
                                ))}

                                <TouchableOpacity style={[styles.endTripBtn, savingPrices && styles.disabledBtn]} onPress={handleSavePricesAndEnd} disabled={savingPrices}>
                                    {savingPrices ? <ActivityIndicator color="#fff" /> : (
                                        <>
                                            <Ionicons name="flag" size={20} color="#fff" />
                                            <Text style={styles.saveBtnText}>Save Prices & End Trip</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        )}
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
    endBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    endText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    scrollContent: { padding: 24, paddingBottom: 40 },
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
    gradeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
    gradeText: { fontSize: 10, fontWeight: '800' },
    weightText: { fontSize: 14, color: '#64748b', marginTop: 8, fontWeight: '600' },
    catchActions: { flexDirection: 'row', gap: 12 },
    actionIcon: { padding: 4 },
    catchPhotos: { marginTop: 12 },
    miniPhoto: { width: 60, height: 60, borderRadius: 8, marginRight: 8, backgroundColor: '#f1f5f9' },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { marginTop: 16, color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 22 },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    modalSubtitle: { fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 2 },
    modalLoader: { alignItems: 'center', paddingVertical: 40 },
    loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
    label: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, fontWeight: '600', color: '#1e293b' },
    chipRow: { flexDirection: 'row', marginBottom: 5 },
    chip: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    chipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    chipTextActive: { color: '#fff' },
    gradeContainer: { flexDirection: 'row', gap: 10 },
    gradeItem: { flex: 1, paddingVertical: 12, backgroundColor: '#f1f5f9', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    activeGrade: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    gradeItemText: { fontWeight: '700', color: '#64748b' },
    activeGradeText: { color: '#fff' },
    photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', borderStyle: 'dashed' },
    photoBtnText: { color: '#2563eb', fontWeight: '700' },
    previewScroll: { marginTop: 12 },
    previewImg: { width: 80, height: 80, borderRadius: 12, marginRight: 10 },
    saveBtn: { backgroundColor: '#2563eb', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, marginTop: 24, marginBottom: 20 },
    disabledBtn: { backgroundColor: '#94a3b8' },
    saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
    summaryBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#bfdbfe' },
    summaryText: { flex: 1, fontSize: 13, color: '#2563eb', fontWeight: '600', lineHeight: 20 },
    priceRow: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    priceRowLeft: { marginBottom: 12 },
    priceRowFish: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    priceRowMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    priceRowWeight: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    gradePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    gradePillText: { fontSize: 10, fontWeight: '800' },
    priceInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#2563eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4 },
    lkrLabel: { fontSize: 14, fontWeight: '700', color: '#2563eb', marginRight: 6 },
    priceInput: { flex: 1, fontSize: 22, fontWeight: '800', color: '#1e293b', paddingVertical: 8 },
    perKgLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginLeft: 6 },
    endTripBtn: { backgroundColor: '#ef4444', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, marginTop: 10, marginBottom: 24 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default ActiveTripScreen;
