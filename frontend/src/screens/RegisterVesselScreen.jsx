import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    Alert,
    ActivityIndicator,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import ImageUploadButton from '../components/ImageUploadButton';

const RegisterVesselScreen = ({ navigation, route }) => {
    const editVessel = route.params?.vessel;
    const [loading, setLoading] = useState(false);
    const [vesselData, setVesselData] = useState({
        name: editVessel?.name || '',
        vesselType: editVessel?.vesselType || 'multi-day',
        licenseNumber: editVessel?.licenseNumber || '',
        capacity: editVessel?.capacity ? String(editVessel.capacity) : '',
        photos: editVessel?.photos || [],
        image: editVessel?.image || '',
        ownerCommission: editVessel?.ownerCommission ? String(editVessel.ownerCommission) : '40',
        plannerCommission: editVessel?.plannerCommission ? String(editVessel.plannerCommission) : '10',
        crewCommission: editVessel?.crewCommission ? String(editVessel.crewCommission) : '50',
        isAvailableForRent: editVessel?.isAvailableForRent || false,
        rentalPrice: editVessel?.rentalPrice ? String(editVessel.rentalPrice) : '',
        rentalPriceType: editVessel?.rentalPriceType || 'per-day'
    });

    const handleRegister = async () => {
        if (!vesselData.name || !vesselData.licenseNumber || !vesselData.capacity) {
            Alert.alert("Error", "Please fill all required fields");
            return;
        }

        if (vesselData.photos.length === 0) {
            Alert.alert("Error", "Please upload at least one photo of the boat");
            return;
        }

        const totalComm = parseFloat(vesselData.ownerCommission) + 
                          parseFloat(vesselData.plannerCommission) + 
                          parseFloat(vesselData.crewCommission);
        
        if (totalComm !== 100) {
            Alert.alert("Error", "Total commissions must add up to 100%");
            return;
        }

        setLoading(true);
        try {
            if (editVessel) {
                await client.put(`/api/vessels/${editVessel._id}`, {
                    ...vesselData,
                    image: vesselData.photos[0],
                    capacity: Number(vesselData.capacity),
                    ownerCommission: Number(vesselData.ownerCommission),
                    plannerCommission: Number(vesselData.plannerCommission),
                    crewCommission: Number(vesselData.crewCommission),
                    status: editVessel.status === 'maintenance' && vesselData.photos.length > 0 && vesselData.capacity > 0 ? 'available' : editVessel.status
                });
                Alert.alert("Success", "Vessel updated successfully!");
            } else {
                await client.post('/api/vessels', { 
                    ...vesselData,
                    image: vesselData.photos[0],
                    capacity: Number(vesselData.capacity),
                    ownerCommission: Number(vesselData.ownerCommission),
                    plannerCommission: Number(vesselData.plannerCommission),
                    crewCommission: Number(vesselData.crewCommission),
                });
                Alert.alert("Success", "Vessel registered successfully!");
            }
            navigation.goBack();
        } catch (error) {
            Alert.alert("Error", error.response?.data?.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1e3a8a', '#1e40af']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.title}>{editVessel ? 'Update Vessel' : 'Register Vessel'}</Text>
                        <View style={{ width: 24 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <Text style={styles.label}>Vessel Photos (බෝට්ටුවේ ඡායාරූප) *</Text>
                    <View style={styles.photoGrid}>
                        {vesselData.photos.map((url, index) => (
                            <View key={index} style={styles.photoWrapper}>
                                <Image source={{ uri: url }} style={styles.thumbnail} />
                                <TouchableOpacity 
                                    style={styles.removePhotoBtn}
                                    onPress={() => {
                                        const newPhotos = [...vesselData.photos];
                                        newPhotos.splice(index, 1);
                                        setVesselData({ ...vesselData, photos: newPhotos });
                                    }}
                                >
                                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        
                        {vesselData.photos.length < 5 && (
                            <ImageUploadButton 
                                onImageUploaded={(url) => setVesselData({ ...vesselData, photos: [...vesselData.photos, url] })}
                                folder="vessels"
                                label={vesselData.photos.length === 0 ? "Upload Photos" : "Add More"}
                                showPreview={false}
                                style={styles.uploadBtn}
                            />
                        )}
                    </View>

                    <Text style={[styles.label, { marginTop: 15 }]}>Vessel Name (බෝට්ටුවේ නම) *</Text>
                    <TextInput 
                        style={styles.input}
                        placeholder="e.g. Blue Wave 01"
                        value={vesselData.name}
                        onChangeText={(t) => setVesselData({ ...vesselData, name: t })}
                    />

                    <Text style={styles.label}>License Number *</Text>
                    <TextInput 
                        style={styles.input}
                        placeholder="e.g. SL-V-1234"
                        value={vesselData.licenseNumber}
                        onChangeText={(t) => setVesselData({ ...vesselData, licenseNumber: t })}
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.label}>Vessel Type</Text>
                            <TouchableOpacity 
                                style={styles.typeBtn}
                                onPress={() => setVesselData({ ...vesselData, vesselType: vesselData.vesselType === 'multi-day' ? 'one-day' : 'multi-day' })}
                            >
                                <Text style={styles.typeText}>{vesselData.vesselType === 'multi-day' ? 'Multi-day' : 'One-day'}</Text>
                                <Ionicons name="swap-horizontal" size={16} color="#2563eb" />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Capacity (kg) *</Text>
                            <TextInput 
                                style={styles.input}
                                placeholder="e.g. 5000"
                                keyboardType="numeric"
                                value={vesselData.capacity}
                                onChangeText={(t) => setVesselData({ ...vesselData, capacity: t })}
                            />
                        </View>
                    </View>

                    <Text style={[styles.label, { marginTop: 10 }]}>Profit Sharing Commissions (%)</Text>
                    <View style={styles.commGrid}>
                        <View style={styles.commBox}>
                            <Text style={styles.commLabel}>Owner</Text>
                            <TextInput 
                                style={styles.commInput}
                                keyboardType="numeric"
                                value={vesselData.ownerCommission}
                                onChangeText={(t) => setVesselData({ ...vesselData, ownerCommission: t })}
                            />
                        </View>
                        <View style={styles.commBox}>
                            <Text style={styles.commLabel}>Planner</Text>
                            <TextInput 
                                style={styles.commInput}
                                keyboardType="numeric"
                                value={vesselData.plannerCommission}
                                onChangeText={(t) => setVesselData({ ...vesselData, plannerCommission: t })}
                            />
                        </View>
                        <View style={styles.commBox}>
                            <Text style={styles.commLabel}>Crew</Text>
                            <TextInput 
                                style={styles.commInput}
                                keyboardType="numeric"
                                value={vesselData.crewCommission}
                                onChangeText={(t) => setVesselData({ ...vesselData, crewCommission: t })}
                            />
                        </View>
                    </View>

                    <Text style={[styles.label, { marginTop: 10 }]}>Vessel Purpose *</Text>
                    <View style={styles.purposeContainer}>
                        <TouchableOpacity 
                            style={[styles.purposeBtn, !vesselData.isAvailableForRent && styles.purposeBtnActive]}
                            onPress={() => setVesselData({ ...vesselData, isAvailableForRent: false })}
                        >
                            <Ionicons name="boat" size={20} color={!vesselData.isAvailableForRent ? "#fff" : "#64748b"} />
                            <Text style={[styles.purposeText, !vesselData.isAvailableForRent && styles.purposeTextActive]}>Own Trips</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.purposeBtn, vesselData.isAvailableForRent && styles.purposeBtnActive]}
                            onPress={() => setVesselData({ ...vesselData, isAvailableForRent: true })}
                        >
                            <Ionicons name="key" size={20} color={vesselData.isAvailableForRent ? "#fff" : "#64748b"} />
                            <Text style={[styles.purposeText, vesselData.isAvailableForRent && styles.purposeTextActive]}>Rent Out</Text>
                        </TouchableOpacity>
                    </View>

                    {vesselData.isAvailableForRent && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={styles.label}>Rental Price (LKR / Day) *</Text>
                            <TextInput 
                                style={styles.input}
                                placeholder="e.g. 25000"
                                keyboardType="numeric"
                                value={vesselData.rentalPrice}
                                onChangeText={(t) => setVesselData({ ...vesselData, rentalPrice: t })}
                            />
                        </View>
                    )}

                    <TouchableOpacity 
                        style={[styles.registerBtn, loading && styles.disabledBtn]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{editVessel ? 'Update Vessel' : 'Register Vessel'}</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingBottom: 20 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
    title: { color: '#fff', fontSize: 20, fontWeight: '800' },
    scrollContent: { padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 2 },
    label: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8 },
    input: { backgroundColor: '#f1f5f9', height: 50, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, fontSize: 15, color: '#1e293b' },
    row: { flexDirection: 'row', marginBottom: 16 },
    typeBtn: { backgroundColor: '#f1f5f9', height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    typeText: { fontSize: 15, fontWeight: '700', color: '#2563eb' },
    commGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    commBox: { flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
    commLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 5 },
    commInput: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    registerBtn: { backgroundColor: '#2563eb', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    disabledBtn: { backgroundColor: '#94a3b8' },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    purposeContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    purposeBtn: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 8, 
        backgroundColor: '#f1f5f9', 
        height: 50, 
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    purposeBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    purposeText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
    purposeTextActive: { color: '#fff' },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 10,
    },
    photoWrapper: {
        width: 80,
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    removePhotoBtn: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    uploadBtn: {
        width: 80,
        height: 80,
        minWidth: 80,
        borderRadius: 12,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default RegisterVesselScreen;
