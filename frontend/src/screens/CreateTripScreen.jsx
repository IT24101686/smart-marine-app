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
    const [loading, setLoading] = useState(false);
    const [vessels, setVessels] = useState([]);
    const [selectedVessel, setSelectedVessel] = useState(null);
    const [maxCrew, setMaxCrew] = useState('5');
    const [minCrew, setMinCrew] = useState('3');
    const [departureDate, setDepartureDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [notes, setNotes] = useState('');
    const [plannedDuration, setPlannedDuration] = useState('3 Days');

    // Cost States
    const [fuelCost, setFuelCost] = useState('');
    const [foodCost, setFoodCost] = useState('');
    const [baitCost, setBaitCost] = useState('');

    useEffect(() => {
        fetchVessels();
    }, []);

    const fetchVessels = async () => {
        try {
            const response = await client.get('/api/vessels/my-vessels');
            const vesselList = response.data;
            setVessels(vesselList);

            if (vesselIdFromParams) {
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

    const handleCreateTrip = async () => {
        if (!selectedVessel) {
            Alert.alert("Error", "Please select a vessel first");
            return;
        }

        setLoading(true);
        try {
            await client.post('/api/trips', {
                vesselId: selectedVessel._id,
                maxFishermen: parseInt(maxCrew),
                minFishermen: parseInt(minCrew),
                departureTime: departureDate,
                plannedDuration,
                notes,
                tripType: 'direct',
                fuelCost: parseFloat(fuelCost) || 0,
                foodCost: parseFloat(foodCost) || 0,
                baitCost: parseFloat(baitCost) || 0
            });

            Alert.alert("Success", "Trip planned successfully!");
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to create trip");
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
                        <Text style={styles.headerTitle}>Plan New Trip</Text>
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
                                <TextInput style={styles.flexInput} value={minCrew} onChangeText={setMinCrew} keyboardType="numeric" />
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Max Crew</Text>
                            <View style={styles.inputBox}>
                                <TextInput style={styles.flexInput} value={maxCrew} onChangeText={setMaxCrew} keyboardType="numeric" />
                            </View>
                        </View>
                    </View>

                    <Text style={styles.label}>Planned Duration</Text>
                    <View style={styles.inputBox}>
                        <TextInput style={styles.flexInput} value={plannedDuration} onChangeText={setPlannedDuration} />
                    </View>

                    {/* Operational Costs Section */}
                    <Text style={[styles.label, { color: '#2563eb', marginTop: 25 }]}>Estimated Operational Costs (LKR)</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.subLabel}>Fuel Cost</Text>
                            <View style={styles.inputBox}>
                                <TextInput style={styles.flexInput} value={fuelCost} onChangeText={setFuelCost} keyboardType="numeric" placeholder="e.g. 50000" />
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.subLabel}>Food/Ice Cost</Text>
                            <View style={styles.inputBox}>
                                <TextInput style={styles.flexInput} value={foodCost} onChangeText={setFoodCost} keyboardType="numeric" placeholder="e.g. 20000" />
                            </View>
                        </View>
                    </View>
                    <Text style={styles.subLabel}>Bait/Other Costs</Text>
                    <View style={styles.inputBox}>
                        <TextInput style={styles.flexInput} value={baitCost} onChangeText={setBaitCost} keyboardType="numeric" placeholder="e.g. 10000" />
                    </View>

                    <Text style={styles.label}>Notes</Text>
                    <TextInput style={[styles.inputBox, styles.textArea]} value={notes} onChangeText={setNotes} multiline numberOfLines={4} />

                    <TouchableOpacity style={styles.submitButton} onPress={handleCreateTrip} disabled={loading}>
                        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.buttonGradient}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Post Trip Request</Text>}
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
