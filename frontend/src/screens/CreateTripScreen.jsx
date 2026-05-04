import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Platform,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';

const CreateTripScreen = ({ route, navigation }) => {
    const vesselIdFromParams = route.params?.vesselId;
    const isEditing = route.params?.isEditing;
    const editingTrip = route.params?.trip;

    const [loading, setLoading] = useState(false);
    const [vessels, setVessels] = useState([]);
    const [selectedVessel, setSelectedVessel] = useState(null);
    const [maxCrew, setMaxCrew] = useState(editingTrip?.maxFishermen?.toString() || '5');
    const [minCrew, setMinCrew] = useState(editingTrip?.minFishermen?.toString() || '3');
    const [departureDate, setDepartureDate] = useState(editingTrip?.departureTime ? new Date(editingTrip.departureTime) : new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [notes, setNotes] = useState(editingTrip?.notes || '');
    const [plannedDuration, setPlannedDuration] = useState(editingTrip?.plannedDuration || '3 Days');

    // Cost States
    const [fuelCost, setFuelCost] = useState(editingTrip?.fuelCost?.toString() || '');
    const [foodCost, setFoodCost] = useState(editingTrip?.foodCost?.toString() || '');
    const [baitCost, setBaitCost] = useState(editingTrip?.baitCost?.toString() || '');

    useEffect(() => {
        fetchVessels();
    }, [editingTrip]);

    const fetchVessels = async () => {
        try {
            const response = await client.get('/api/vessels/my-vessels');
            const vesselList = response.data;
            setVessels(vesselList);

            if (editingTrip) {
                const found = vesselList.find(v => v._id === editingTrip.vesselId?._id || v._id === editingTrip.vesselId);
                if (found) setSelectedVessel(found);
            } else if (vesselIdFromParams) {
                const found = vesselList.find(v => v._id === vesselIdFromParams);
                if (found) setSelectedVessel(found);
            } else if (vesselList.length > 0) {
                setSelectedVessel(vesselList[0]);
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not fetch your vessels");
        }
    };

    const handleSubmit = async () => {
        if (!selectedVessel) {
            Alert.alert("Error", "Please select a vessel first");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                vesselId: selectedVessel._id,
                maxFishermen: parseInt(maxCrew),
                minFishermen: parseInt(minCrew),
                departureTime: departureDate,
                plannedDuration,
                notes,
                tripType: editingTrip?.tripType || 'direct',
                fuelCost: parseFloat(fuelCost) || 0,
                foodCost: parseFloat(foodCost) || 0,
                baitCost: parseFloat(baitCost) || 0
            };

            if (isEditing) {
                await client.put(`/api/trips/${editingTrip._id}`, payload);
                Alert.alert("Success", "Trip updated successfully!");
            } else {
                await client.post('/api/trips', payload);
                Alert.alert("Success", "Trip planned successfully!");
            }
            
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", `Failed to ${isEditing ? 'update' : 'create'} trip`);
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || departureDate;
        setShowDatePicker(Platform.OS === 'ios');
        setDepartureDate(currentDate);
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{isEditing ? 'Edit Trip Plan' : 'Plan New Trip'}</Text>
                        <View style={{ width: 28 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <Text style={styles.label}>Select Vessel</Text>
                    <View style={styles.vesselList}>
                        {vessels.map((v) => (
                            <TouchableOpacity
                                key={v._id}
                                style={[styles.vesselItem, selectedVessel?._id === v._id && styles.selectedVesselItem]}
                                onPress={() => setSelectedVessel(v)}
                            >
                                <Ionicons name="boat" size={24} color={selectedVessel?._id === v._id ? "#fff" : "#64748b"} />
                                <Text style={[styles.vesselName, selectedVessel?._id === v._id && styles.selectedVesselText]}>{v.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Departure Date & Time</Text>
                    <TouchableOpacity style={styles.inputBox} onPress={() => setShowDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={20} color="#64748b" />
                        <Text style={styles.inputText}>{departureDate.toLocaleString()}</Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker value={departureDate} mode="datetime" display="default" onChange={onDateChange} minimumDate={new Date()} />
                    )}

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.label}>Min Crew</Text>
                            <View style={styles.inputBox}>
                                <TextInput style={styles.flexInput} value={minCrew} onChangeText={setMinCrew} keyboardType="numeric" placeholder="3" />
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Max Crew</Text>
                            <View style={styles.inputBox}>
                                <TextInput style={styles.flexInput} value={maxCrew} onChangeText={setMaxCrew} keyboardType="numeric" placeholder="5" />
                            </View>
                        </View>
                    </View>

                    <Text style={styles.label}>Planned Duration</Text>
                    <View style={styles.inputBox}>
                        <TextInput style={styles.flexInput} value={plannedDuration} onChangeText={setPlannedDuration} placeholder="e.g. 3 Days" />
                    </View>

                    <Text style={styles.label}>Estimated Costs (LKR)</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 5 }}>
                            <Text style={styles.subLabel}>Fuel</Text>
                            <TextInput style={styles.inputBox} value={fuelCost} onChangeText={setFuelCost} keyboardType="numeric" placeholder="0" />
                        </View>
                        <View style={{ flex: 1, marginHorizontal: 5 }}>
                            <Text style={styles.subLabel}>Food</Text>
                            <TextInput style={styles.inputBox} value={foodCost} onChangeText={setFoodCost} keyboardType="numeric" placeholder="0" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 5 }}>
                            <Text style={styles.subLabel}>Bait</Text>
                            <TextInput style={styles.inputBox} value={baitCost} onChangeText={setBaitCost} keyboardType="numeric" placeholder="0" />
                        </View>
                    </View>

                    <Text style={styles.label}>Additional Notes</Text>
                    <View style={[styles.inputBox, styles.textArea]}>
                        <TextInput style={styles.flexInput} value={notes} onChangeText={setNotes} placeholder="Any special instructions..." multiline />
                    </View>

                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
                        <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.buttonGradient}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isEditing ? 'Update Plan' : 'Start Planning'}</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingBottom: 20 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
    scrollContent: { padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 3 },
    label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 10, marginTop: 15 },
    subLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4, marginTop: 10 },
    vesselList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    vesselItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 12, borderRadius: 12 },
    selectedVesselItem: { backgroundColor: '#2563eb' },
    vesselName: { marginLeft: 8, fontWeight: '600', color: '#64748b' },
    selectedVesselText: { color: '#fff' },
    inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, height: 50 },
    inputText: { marginLeft: 12, fontSize: 15, color: '#1e293b' },
    row: { flexDirection: 'row' },
    flexInput: { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: '600' },
    textArea: { height: 80, alignItems: 'flex-start', paddingTop: 10 },
    submitButton: { marginTop: 30 },
    buttonGradient: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CreateTripScreen;
