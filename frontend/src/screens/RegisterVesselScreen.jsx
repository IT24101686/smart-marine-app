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
    Image,
    Dimensions,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import ImageUploadButton from '../components/ImageUploadButton';

const { width, height } = Dimensions.get('window');

const RegisterVesselScreen = ({ navigation, route }) => {
    const editVessel = route.params?.vessel;
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [viewerVisible, setViewerVisible] = useState(false);
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
        rentalPriceType: editVessel?.rentalPriceType || 'per-day',
        rentalPaymentTerm: editVessel?.rentalPaymentTerm || 'after-trip'
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
            const payload = {
                ...vesselData,
                image: vesselData.photos[0],
                capacity: Number(vesselData.capacity),
                ownerCommission: Number(vesselData.ownerCommission),
                plannerCommission: Number(vesselData.plannerCommission),
                crewCommission: Number(vesselData.crewCommission),
                rentalPrice: vesselData.isAvailableForRent ? Number(vesselData.rentalPrice) : 0
            };

            if (editVessel) {
                await client.put(`/api/vessels/${editVessel._id}`, {
                    ...payload,
                    status: editVessel.status === 'maintenance' && vesselData.photos.length > 0 && vesselData.capacity > 0 ? 'available' : editVessel.status
                });
                Alert.alert("Success", "Vessel updated successfully!");
            } else {
                await client.post('/api/vessels', payload);
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
            <Modal
                visible={viewerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setViewerVisible(false)}
            >
                <View style={styles.viewerContainer}>
                    <TouchableOpacity 
                        style={styles.closeViewer}
                        onPress={() => setViewerVisible(false)}
                    >
                        <Ionicons name="close-circle" size={40} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image 
                            source={{ uri: selectedImage }} 
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.title}>{editVessel ? 'Edit Vessel' : 'New Vessel'}</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* 1. Media Section */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Boat Appearance</Text>
                    <Text style={styles.label}>Upload up to 5 clear photos of your boat</Text>
                    <View style={styles.photoGrid}>
                        {vesselData.photos.map((url, index) => (
                            <TouchableOpacity 
                                key={index} 
                                style={styles.photoWrapper}
                                onPress={() => {
                                    setSelectedImage(url);
                                    setViewerVisible(true);
                                }}
                            >
                                <Image source={{ uri: url }} style={styles.thumbnail} />
                                <TouchableOpacity 
                                    style={styles.removePhotoBtn}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        const newPhotos = [...vesselData.photos];
                                        newPhotos.splice(index, 1);
                                        setVesselData({ ...vesselData, photos: newPhotos });
                                    }}
                                >
                                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                        
                        {vesselData.photos.length < 5 && (
                            <ImageUploadButton 
                                onImageUploaded={(url) => setVesselData({ ...vesselData, photos: [...vesselData.photos, url] })}
                                folder="vessels"
                                label={vesselData.photos.length === 0 ? "Add Photos" : "+ Add"}
                                showPreview={false}
                                style={styles.uploadBtn}
                            />
                        )}
                    </View>
                </View>

                {/* 2. Basic Info */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>General Details</Text>
                    
                    <View style={[styles.inputWrapper, editVessel && { backgroundColor: '#f1f5f9', opacity: 0.7 }]}>
                        <Ionicons name="boat-outline" size={20} color="#64748b" style={styles.inputIcon} />
                        <TextInput 
                            style={styles.input}
                            placeholder="Vessel Name (e.g. Blue Wave)"
                            value={vesselData.name}
                            onChangeText={(t) => setVesselData({ ...vesselData, name: t })}
                            editable={!editVessel}
                        />
                        {editVessel && <Ionicons name="lock-closed" size={16} color="#94a3b8" style={{ marginRight: 10 }} />}
                    </View>

                    <View style={[styles.inputWrapper, editVessel && { backgroundColor: '#f1f5f9', opacity: 0.7 }]}>
                        <Ionicons name="document-text-outline" size={20} color="#64748b" style={styles.inputIcon} />
                        <TextInput 
                            style={styles.input}
                            placeholder="License Number (e.g. SL-V-123)"
                            value={vesselData.licenseNumber}
                            onChangeText={(t) => setVesselData({ ...vesselData, licenseNumber: t })}
                            editable={!editVessel}
                        />
                        {editVessel && <Ionicons name="lock-closed" size={16} color="#94a3b8" style={{ marginRight: 10 }} />}
                    </View>

                    <View style={styles.row}>
                        <TouchableOpacity 
                            style={styles.typeSelector}
                            onPress={() => setVesselData({ ...vesselData, vesselType: vesselData.vesselType === 'multi-day' ? 'one-day' : 'multi-day' })}
                        >
                            <Text style={styles.typeLabel}>Type</Text>
                            <Text style={styles.typeValue}>{vesselData.vesselType === 'multi-day' ? 'Multi-day' : 'One-day'}</Text>
                        </TouchableOpacity>
                        
                        <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
                            <Ionicons name="barbell-outline" size={20} color="#64748b" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="Capacity (kg)"
                                keyboardType="numeric"
                                value={vesselData.capacity}
                                onChangeText={(t) => setVesselData({ ...vesselData, capacity: t })}
                            />
                        </View>
                    </View>
                </View>

                {/* 3. Profit Sharing */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Profit Sharing (%)</Text>
                    <Text style={styles.label}>Set how the net profit will be divided</Text>
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
                </View>

                {/* 4. Rental Config */}
                <View style={styles.sectionCard}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.sectionTitle}>Rental Settings</Text>
                        <TouchableOpacity 
                            onPress={() => setVesselData({ ...vesselData, isAvailableForRent: !vesselData.isAvailableForRent })}
                            style={[styles.switch, vesselData.isAvailableForRent && styles.switchOn]}
                        >
                            <View style={[styles.switchDot, vesselData.isAvailableForRent && styles.switchDotOn]} />
                        </TouchableOpacity>
                    </View>

                    {vesselData.isAvailableForRent ? (
                        <View style={{ marginTop: 15 }}>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="cash-outline" size={20} color="#64748b" style={styles.inputIcon} />
                                <TextInput 
                                    style={styles.input}
                                    placeholder="Price Per Day (LKR)"
                                    keyboardType="numeric"
                                    value={vesselData.rentalPrice}
                                    onChangeText={(t) => setVesselData({ ...vesselData, rentalPrice: t })}
                                />
                            </View>

                            <Text style={[styles.label, { marginTop: 5 }]}>Payment Schedule</Text>
                            <View style={styles.termContainer}>
                                <TouchableOpacity 
                                    style={[styles.termBtn, vesselData.rentalPaymentTerm === 'upfront' && styles.termBtnActive]}
                                    onPress={() => setVesselData({ ...vesselData, rentalPaymentTerm: 'upfront' })}
                                >
                                    <Ionicons name="flash-outline" size={18} color={vesselData.rentalPaymentTerm === 'upfront' ? "#fff" : "#64748b"} />
                                    <Text style={[styles.termText, vesselData.rentalPaymentTerm === 'upfront' && styles.termTextActive]}>Upfront</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.termBtn, vesselData.rentalPaymentTerm === 'after-trip' && styles.termBtnActive]}
                                    onPress={() => setVesselData({ ...vesselData, rentalPaymentTerm: 'after-trip' })}
                                >
                                    <Ionicons name="time-outline" size={18} color={vesselData.rentalPaymentTerm === 'after-trip' ? "#fff" : "#64748b"} />
                                    <Text style={[styles.termText, vesselData.rentalPaymentTerm === 'after-trip' && styles.termTextActive]}>After Trip</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.infoText}>This boat will only be used for your own trips.</Text>
                    )}
                </View>

                <TouchableOpacity 
                    style={[styles.registerBtn, loading && styles.disabledBtn]}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    <LinearGradient 
                        colors={loading ? ['#94a3b8', '#94a3b8'] : ['#2563eb', '#1e40af']} 
                        style={styles.gradientBtn}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{editVessel ? 'Save Changes' : 'Register Boat'}</Text>}
                    </LinearGradient>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    title: { color: '#fff', fontSize: 20, fontWeight: '900' },
    scrollContent: { padding: 16 },
    sectionCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
    label: { fontSize: 12, color: '#64748b', marginBottom: 12, fontWeight: '600' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, paddingHorizontal: 12 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 50, fontSize: 15, color: '#1e293b', fontWeight: '600' },
    row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    typeSelector: { backgroundColor: '#eff6ff', borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe', minWidth: 100 },
    typeLabel: { fontSize: 10, color: '#2563eb', fontWeight: '800', textTransform: 'uppercase' },
    typeValue: { fontSize: 14, color: '#1e40af', fontWeight: '700' },
    commGrid: { flexDirection: 'row', gap: 8 },
    commBox: { flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
    commLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 4, textTransform: 'uppercase' },
    commInput: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    switch: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#e2e8f0', padding: 2 },
    switchOn: { backgroundColor: '#16a34a' },
    switchDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
    switchDotOn: { alignSelf: 'flex-end' },
    infoText: { fontSize: 13, color: '#64748b', marginTop: 10, fontStyle: 'italic' },
    termContainer: { flexDirection: 'row', gap: 10, marginTop: 10 },
    termBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    termBtnActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
    termText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    termTextActive: { color: '#fff' },
    registerBtn: { marginTop: 10, borderRadius: 20, overflow: 'hidden', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    gradientBtn: { height: 60, justifyContent: 'center', alignItems: 'center' },
    btnText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    photoWrapper: { width: 75, height: 75, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
    thumbnail: { width: '100%', height: '100%' },
    removePhotoBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: '#fff', borderRadius: 10 },
    uploadBtn: { width: 75, height: 75, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#2563eb', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f7ff' },
});

export default RegisterVesselScreen;
