import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    Image, 
    TextInput, 
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../api/client';

const { width } = Dimensions.get('window');

const RentalDashboardScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [availableBoats, setAvailableBoats] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await client.get('/api/vessels/available-for-rent');
            setAvailableBoats(res.data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load available boats");
        } finally {
            setLoading(false);
        }
    };

    const handleRent = async (boat) => {
        Alert.alert(
            "Request Rental",
            `Send a request to rent ${boat.name} for LKR ${boat.rentalPrice?.toLocaleString()} per day?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Send Request", 
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await client.post(`/api/vessels/${boat._id}/request-rent`);
                            Alert.alert("Success", "Rental request sent successfully! The owner will notify you once approved.");
                            loadData();
                        } catch (error) {
                            Alert.alert("Error", error.response?.data?.message || "Request failed");
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const filteredBoats = availableBoats.filter(b => 
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.vesselType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderBoatCard = ({ item }) => (
        <TouchableOpacity 
            style={styles.boatCard}
            activeOpacity={0.9}
            onPress={() => handleRent(item)}
        >
            <Image 
                source={item.image ? { uri: item.image } : require('../../assets/adaptive-icon.png')} 
                style={styles.boatImage} 
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.imageOverlay}>
                <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>LKR {item.rentalPrice?.toLocaleString()}</Text>
                    <Text style={styles.perDayText}>/day</Text>
                </View>
            </LinearGradient>

            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.boatName}>{item.name}</Text>
                        <Text style={styles.boatType}>{item.vesselType.toUpperCase()} • {item.licenseNumber}</Text>
                    </View>
                    <View style={styles.ratingBox}>
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Text style={styles.ratingText}>4.8</Text>
                    </View>
                </View>

                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="barbell-outline" size={16} color="#2563eb" />
                        </View>
                        <View>
                            <Text style={styles.detailLabel}>Capacity</Text>
                            <Text style={styles.detailVal}>{item.capacity}kg</Text>
                        </View>
                    </View>
                    <View style={styles.detailItem}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="card-outline" size={16} color="#2563eb" />
                        </View>
                        <View>
                            <Text style={styles.detailLabel}>Payment</Text>
                            <Text style={styles.detailVal}>{item.rentalPaymentTerm === 'upfront' ? 'Upfront' : 'After'}</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.rentBtn}
                    onPress={() => handleRent(item)}
                >
                    <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.rentGradient}>
                        <Text style={styles.rentBtnText}>Request to Rent</Text>
                        <Ionicons name="chevron-forward" size={18} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.headerTitle}>Rent a Vessel</Text>
                            <Text style={styles.headerSub}>Find the perfect boat for your next trip</Text>
                        </View>
                    </View>

                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={20} color="#64748b" />
                        <TextInput 
                            style={styles.searchInput}
                            placeholder="Search by name or type..."
                            placeholderTextColor="#94a3b8"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={filteredBoats}
                    renderItem={renderBoatCard}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="boat-outline" size={80} color="#cbd5e1" />
                            <Text style={styles.emptyTitle}>No Boats Available</Text>
                            <Text style={styles.emptySub}>Check back later for newly listed vessels.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { paddingBottom: 25, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    headerTop: { paddingHorizontal: 24, paddingTop: 10 },
    headerTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
    headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600', marginTop: 4 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 24, marginTop: 25, borderRadius: 18, paddingHorizontal: 16, height: 56, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10 },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1e293b', fontWeight: '600' },
    listContent: { padding: 20 },
    boatCard: { backgroundColor: '#fff', borderRadius: 28, marginBottom: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 },
    boatImage: { width: '100%', height: 220 },
    imageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, justifyContent: 'flex-start', padding: 20 },
    priceBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    priceText: { color: '#fff', fontSize: 18, fontWeight: '900' },
    perDayText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginLeft: 2, fontWeight: '600' },
    cardContent: { padding: 20 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    boatName: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    boatType: { fontSize: 13, color: '#64748b', fontWeight: '700', marginTop: 2 },
    ratingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 4 },
    ratingText: { fontSize: 12, fontWeight: '800', color: '#f59e0b' },
    detailsRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconCircle: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
    detailLabel: { fontSize: 11, color: '#64748b', fontWeight: '700' },
    detailVal: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    rentBtn: { borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    rentGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 10 },
    rentBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 20 }
});

export default RentalDashboardScreen;
