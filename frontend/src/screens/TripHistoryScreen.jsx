import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';

const TripHistoryScreen = ({ navigation }) => {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await client.get('/api/trips/my-trips');
            const all = Array.isArray(res.data) ? res.data : [];
            // Filter only completed or sold trips
            const history = all.filter(t => ['completed', 'sold'].includes(t.status));
            setTrips(history);
        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredTrips = trips.filter(t => 
        t.vesselId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        new Date(t.departureTime).toLocaleDateString().includes(searchQuery)
    );

    const renderTripItem = ({ item }) => {
        const isSold = item.status === 'sold';
        const date = new Date(item.departureTime).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const revenue = item.totalRevenue || item.estimatedRevenue || 0;

        return (
            <TouchableOpacity 
                style={styles.tripCard}
                onPress={() => navigation.navigate('TripSummary', { tripId: item._id })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.vesselInfo}>
                        <View style={styles.iconBox}>
                            <Ionicons name="boat" size={24} color="#2563eb" />
                        </View>
                        <View>
                            <Text style={styles.vesselName}>{item.vesselId?.name || 'Unknown'}</Text>
                            <Text style={styles.tripDate}>{date}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isSold ? '#dcfce7' : '#fef9c3' }]}>
                        <Text style={[styles.statusText, { color: isSold ? '#166534' : '#854d0e' }]}>
                            {isSold ? 'SOLD' : 'FINISHED'}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>CREW</Text>
                        <Text style={styles.statValue}>👥 {item.crew?.length || 0}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>REVENUE (LKR)</Text>
                        <Text style={[styles.statValue, { color: '#16a34a' }]}>
                            {revenue > 0 ? Math.round(revenue).toLocaleString() : 'N/A'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Trip History</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={20} color="#94a3b8" />
                        <TextInput 
                            placeholder="Search by vessel or date..."
                            placeholderTextColor="#94a3b8"
                            style={styles.searchInput}
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
                    data={filteredTrips}
                    keyExtractor={(item) => item._id}
                    renderItem={renderTripItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons name="file-tray-outline" size={64} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No past trips found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, marginTop: 20, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, elevation: 5 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b', fontWeight: '600' },
    listContent: { padding: 20 },
    tripCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    vesselInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
    vesselName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    tripDate: { fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '800' },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stat: { flex: 1 },
    statLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginBottom: 2 },
    statValue: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyBox: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 15, fontSize: 16, color: '#94a3b8', fontWeight: '600' }
});

export default TripHistoryScreen;
