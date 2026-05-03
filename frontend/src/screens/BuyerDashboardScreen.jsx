import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    Image,
    Modal as RNModal,
    TextInput
} from 'react-native';


import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import MapComponent from '../components/MapComponent';
import AsyncStorage from '@react-native-async-storage/async-storage';


const { width } = Dimensions.get('window');

const BuyerDashboardScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [availableCatches, setAvailableCatches] = useState([]);
    const [filteredCatches, setFilteredCatches] = useState([]);
    const [selectedType, setSelectedType] = useState('All');
    const [expandedMapId, setExpandedMapId] = useState(null);
    const [user, setUser] = useState(null);
    const [marketRates, setMarketRates] = useState([]);
    const [rateModalVisible, setRateModalVisible] = useState(false);
    const [editingRate, setEditingRate] = useState(null);
    const [myStock, setMyStock] = useState([]);
    const [ongoingTrips, setOngoingTrips] = useState([]);
    const [refreshing, setRefreshing] = useState(false);


    const fishTypes = ['All', 'Tuna (කෙලවල්ලා)', 'Skipjack (බලයා)', 'Marlin (කොප්පරා)', 'Mullet (මෝරා)'];

    useEffect(() => {
        loadUserAndCatches();
    }, []);


    const loadUserAndCatches = async () => {
        try {
            setRefreshing(true);
            const userData = await AsyncStorage.getItem('userData');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                await Promise.all([
                    fetchAvailableCatches(parsedUser.district),
                    fetchOngoingCatches(parsedUser.district)
                ]);
            } else {
                await fetchAvailableCatches('Galle');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchOngoingCatches = async (district) => {
        try {
            const response = await client.get(`/api/trips/ongoing/${district}`);
            setOngoingTrips(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Fetch ongoing catches error:", error);
        }
    };

    const fetchMarketRates = async () => {
        try {
            const response = await client.get('/api/market-rates');
            setMarketRates(response.data);
        } catch (error) {
            console.error("Fetch rates error:", error);
        }
    };

    useEffect(() => {
        fetchMarketRates();
    }, []);

    const fetchAvailableCatches = async (district) => {
        try {
            const response = await client.get(`/api/trips/market/all?district=${district}`);
            const data = Array.isArray(response.data) ? response.data : [];
            
            // Available: Completed but NOT yet sold (Backend already filtered by district)
            const available = data.filter(t => t.status === 'completed');
            
            // My Stock: Sold to ME (logged in user)
            const bought = data.filter(t => t.status === 'sold' && t.buyerId?._id === user?._id);

            const [availableWithSummary, boughtWithSummary] = await Promise.all([
                Promise.all(available.map(async (trip) => {
                    try {
                        const summaryRes = await client.get(`/api/trips/${trip._id}/summary`);
                        return { ...trip, summary: summaryRes.data };
                    } catch (e) { return { ...trip }; }
                })),
                Promise.all(bought.map(async (trip) => {
                    try {
                        const summaryRes = await client.get(`/api/trips/${trip._id}/summary`);
                        return { ...trip, summary: summaryRes.data };
                    } catch (e) { return { ...trip }; }
                }))
            ]);

            setAvailableCatches(availableWithSummary);
            setFilteredCatches(availableWithSummary);
            setMyStock(boughtWithSummary);
        } catch (error) {
            console.error("Fetch catches error:", error);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if (selectedType === 'All') {
            setFilteredCatches(availableCatches);
        } else {
            const filtered = availableCatches.filter(trip =>
                trip.summary && trip.summary.catchBreakdown && trip.summary.catchBreakdown[selectedType]
            );
            setFilteredCatches(filtered);
        }
    }, [selectedType, availableCatches]);


    const calculateTotalPrice = (item) => {
        const summary = item.summary;
        if (!summary || !summary.catchBreakdownDetails) return 0;

        let total = 0;

        // If the Planner has set custom prices for this trip
        if (item.customPrices && item.customPrices.length > 0) {
            item.customPrices.forEach(cp => {
                const details = summary.catchBreakdownDetails[cp.fishType];
                if (details) {
                    total += (details.gradeA || 0) * (cp.priceA || 0);
                    total += (details.gradeB || 0) * (cp.priceB || 0);
                }
            });
        } else {
            // Fallback to market rates if no custom prices
            Object.keys(summary.catchBreakdownDetails).forEach(fishType => {
                const details = summary.catchBreakdownDetails[fishType];
                const rate = marketRates.find(r => r.fishType === fishType) || marketRates[0];
                
                total += (details.gradeA || 0) * (rate?.gradeAPrice || 1500);
                total += (details.gradeB || 0) * (rate?.gradeBPrice || 1000);
            });
        }

        return total;
    };

    const handleBuy = async (tripId, totalPrice) => {
        try {
            setLoading(true);
            const response = await client.post(`/api/trips/${tripId}/buy`, { totalPrice });
            Alert.alert(
                "Payment Successful!", 
                "The transaction is complete. The earnings have been distributed to the Vessel Owner, Trip Planner, and Crew members.",
                [{ text: "OK", onPress: () => loadUserAndCatches() }]
            );
        } catch (error) {
            setLoading(false);
            console.error(error);
            Alert.alert("Error", error.response?.data?.message || "Payment failed");
        }
    };

    const handlePurchaseRequest = (trip) => {
        const total = calculateTotalPrice(trip);
        Alert.alert(
            "Finalize Purchase 💳",
            `Total Amount: LKR ${total.toLocaleString()}\n\nThis payment will be distributed among the vessel owner, planner, and the crew. Proceed with the transaction?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm & Pay",
                    onPress: () => handleBuy(trip._id, total)
                }
            ]
        );
    };



    const renderCatchCard = ({ item }) => {
        if (!item || !item._id) return null;

        const vesselName = item.vesselId?.name || "Unknown Vessel";
        const district = item.plannerId?.district || "Unknown";

        return (
            <View style={styles.catchCard}>

                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.vesselName}>{vesselName}</Text>
                        <Text style={styles.harborName}>{district} Harbor</Text>
                    </View>

                    <View style={styles.freshBadge}>
                        <Text style={styles.freshText}>FRESH ARRIVAL</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Grade A (Premium)</Text>
                        <Text style={[styles.statValue, { color: '#22c55e' }]}>
                            {(item.summary?.supermarketStock || 0).toFixed(1)} kg
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Grade B (Standard)</Text>
                        <Text style={[styles.statValue, { color: '#3b82f6' }]}>
                            {(item.summary?.customerStock || 0).toFixed(1)} kg
                        </Text>
                    </View>
                </View>

                {/* Catch Photos Section */}
                {item.catches && item.catches.some(c => c.photos && c.photos.length > 0) && (
                    <View style={styles.photoSection}>
                        <Text style={styles.photoLabel}>Catch Photos (Fisherman Update):</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                            {item.catches.flatMap(c => c.photos || []).map((photo, idx) => (
                                <Image key={idx} source={{ uri: photo }} style={styles.catchImage} />
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={styles.priceSection}>
                    <Text style={styles.priceLabel}>Estimated Total Catch Value:</Text>
                    <Text style={styles.priceValue}>LKR {calculateTotalPrice(item).toLocaleString()}</Text>
                </View>

                <View style={styles.actionButtons}>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.locationBtn]}
                        onPress={() => setExpandedMapId(expandedMapId === item._id ? null : item._id)}
                    >
                        <Ionicons name={expandedMapId === item._id ? "close" : "location-outline"} size={20} color="#2563eb" />
                        <Text style={styles.locationBtnText}>{expandedMapId === item._id ? "Hide Map" : "View Logistics"}</Text>
                    </TouchableOpacity>

                    {item.status !== 'sold' && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.buyBtn]}
                            onPress={() => handlePurchaseRequest(item)}
                        >
                            <Text style={styles.buyBtnText}>Pay Now</Text>
                            <Ionicons name="card-outline" size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>

                {expandedMapId === item._id && (
                    <View style={styles.mapContainer}>
                        <MapComponent 
                            address1={item.plannerId?.address || `${item.plannerId?.district || 'Galle'} Harbor`} 
                            address2={item.status === 'sold' ? user?.address : null}
                        />
                        {item.status === 'sold' && (
                            <Text style={styles.routeNote}>Dashed line shows the route to your location</Text>
                        )}
                    </View>
                )}
            </View>
        );
    };



    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>

            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <View>
                            <Text style={styles.welcomeText}>Main Buyer Hub</Text>
                            <Text style={styles.subText}>Available stock in {user?.district || 'Galle'}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <TouchableOpacity onPress={() => navigation.navigate('OrderManagement')}>
                                <Ionicons name="receipt-outline" size={28} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                                <Ionicons name="person-circle-outline" size={32} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    <View style={styles.headerActions}>
                        <TouchableOpacity 
                            style={styles.manageRatesBtn} 
                            onPress={() => setRateModalVisible(true)}
                        >
                            <Ionicons name="settings-outline" size={18} color="#fff" />
                            <Text style={styles.manageRatesText}>Market Prices</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.manageRatesBtn, { backgroundColor: '#10b981' }]} 
                            onPress={() => navigation.navigate('OrderManagement')}
                        >
                            <Ionicons name="basket-outline" size={18} color="#fff" />
                            <Text style={styles.manageRatesText}>View Orders</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Filter by Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    {fishTypes.map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.filterChip, selectedType === type && styles.activeFilterChip]}
                            onPress={() => setSelectedType(type)}
                        >
                            <Text style={[styles.filterChipText, selectedType === type && styles.activeFilterChipText]}>
                                {type}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={filteredCatches}
                    renderItem={renderCatchCard}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View>
                            {myStock.length > 0 && (
                                <View style={styles.myStockSection}>
                                    <Text style={styles.sectionTitle}>My Bought Stock (මගේ තොග)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stockScroll}>
                                        {myStock.map((trip) => (
                                            <TouchableOpacity 
                                                key={trip._id} 
                                                style={styles.stockMiniCard}
                                                onPress={() => navigation.navigate('TripSummary', { tripId: trip._id })}
                                            >
                                                <View style={styles.stockCardTop}>
                                                    <Ionicons name="boat" size={20} color="#1e3a8a" />
                                                    <Text style={styles.miniVesselName}>{trip.vesselId?.name}</Text>
                                                </View>
                                                <Text style={styles.miniStockWeight}>
                                                    Total: {(trip.summary?.totalWeight || 0).toFixed(1)} kg
                                                </Text>
                                                <View style={styles.manageLabel}>
                                                    <Text style={styles.manageLabelText}>View Summary</Text>
                                                    <Ionicons name="arrow-forward" size={14} color="#2563eb" />
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {ongoingTrips.length > 0 && (
                                <View style={styles.liveSection}>
                                    <View style={styles.liveHeader}>
                                        <View style={styles.liveDot} />
                                        <Text style={styles.sectionTitle}>Live at Sea (දැනට මුහුදේ)</Text>
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.liveScroll}>
                                        {ongoingTrips.map((trip) => (
                                            <View key={trip._id} style={styles.liveCard}>
                                                <View style={styles.liveCardHeader}>
                                                    <Text style={styles.liveVesselName}>{trip.vesselId?.name}</Text>
                                                    <Text style={styles.liveHarbor}>{trip.plannerId?.district} Harbor</Text>
                                                </View>
                                                
                                                <ScrollView horizontal style={styles.miniCatchPhotos}>
                                                    {trip.catches?.map((c, i) => (
                                                        c.photos?.[0] && <Image key={i} source={{ uri: c.photos[0] }} style={styles.miniPhoto} />
                                                    ))}
                                                </ScrollView>

                                                <View style={styles.liveBreakdown}>
                                                    {trip.catches?.slice(0, 3).map((c, i) => (
                                                        <View key={i} style={styles.liveRow}>
                                                            <Text style={styles.liveFishType} numberOfLines={1}>{c.fishType}</Text>
                                                            <Text style={styles.liveWeight}>{c.weight}kg</Text>
                                                        </View>
                                                    ))}
                                                    {trip.catches?.length > 3 && (
                                                        <Text style={styles.moreText}>+ {trip.catches.length - 3} more catches</Text>
                                                    )}
                                                </View>

                                                <View style={styles.liveTotal}>
                                                    <Text style={styles.liveTotalLabel}>Est. Total:</Text>
                                                    <Text style={styles.liveTotalVal}>
                                                        {trip.catches?.reduce((acc, c) => acc + c.weight, 0).toFixed(1)} kg
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                            <Text style={styles.filterTitle}>Available to Buy (මිලදී ගැනීමට ඇත)</Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cart-outline" size={80} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No new arrivals in your district today.</Text>
                        </View>
                    }
                />
            )}

            {/* Market Rate Management Modal */}
            <RNModal visible={rateModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Market Price Management</Text>
                            <TouchableOpacity onPress={() => setRateModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.ratesList}>
                            {marketRates.map((rate) => (
                                <View key={rate._id} style={styles.rateEditCard}>
                                    <Text style={styles.rateFishType}>{rate.fishType}</Text>
                                    <View style={styles.priceEditSection}>
                                        <Text style={styles.priceGroupLabel}>Buying Prices (මාළු ගන්නා මිල)</Text>
                                        <View style={styles.priceEditRow}>
                                            <View style={styles.priceInputBox}>
                                                <Text style={styles.priceInputLabel}>Grade A</Text>
                                                <TextInput 
                                                    style={styles.priceInput}
                                                    keyboardType="numeric"
                                                    defaultValue={rate.gradeAPrice.toString()}
                                                    onEndEditing={(e) => handleUpdateRate(rate.fishType, 'gradeAPrice', e.nativeEvent.text)}
                                                />
                                            </View>
                                            <View style={styles.priceInputBox}>
                                                <Text style={styles.priceInputLabel}>Grade B</Text>
                                                <TextInput 
                                                    style={styles.priceInput}
                                                    keyboardType="numeric"
                                                    defaultValue={rate.gradeBPrice.toString()}
                                                    onEndEditing={(e) => handleUpdateRate(rate.fishType, 'gradeBPrice', e.nativeEvent.text)}
                                                />
                                            </View>
                                        </View>
                                    </View>

                                    <View style={[styles.priceEditSection, { marginTop: 15 }]}>
                                        <Text style={[styles.priceGroupLabel, { color: '#16a34a' }]}>Retail Selling Prices (පාරිභෝගිකයාට විකුණන මිල)</Text>
                                        <View style={styles.priceEditRow}>
                                            <View style={styles.priceInputBox}>
                                                <Text style={styles.priceInputLabel}>Grade A</Text>
                                                <TextInput 
                                                    style={[styles.priceInput, { color: '#16a34a', borderColor: '#bbf7d0' }]}
                                                    keyboardType="numeric"
                                                    defaultValue={rate.retailPriceA?.toString() || "1800"}
                                                    onEndEditing={(e) => handleUpdateRate(rate.fishType, 'retailPriceA', e.nativeEvent.text)}
                                                />
                                            </View>
                                            <View style={styles.priceInputBox}>
                                                <Text style={styles.priceInputLabel}>Grade B</Text>
                                                <TextInput 
                                                    style={[styles.priceInput, { color: '#16a34a', borderColor: '#bbf7d0' }]}
                                                    keyboardType="numeric"
                                                    defaultValue={rate.retailPriceB?.toString() || "1300"}
                                                    onEndEditing={(e) => handleUpdateRate(rate.fishType, 'retailPriceB', e.nativeEvent.text)}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                        
                        <TouchableOpacity 
                            style={styles.closeModalBtn}
                            onPress={() => setRateModalVisible(false)}
                        >
                            <Text style={styles.closeModalBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </RNModal>
        </View>
    );
};

const handleUpdateRate = async (fishType, field, value) => {
    try {
        await client.post('/api/market-rates', {
            fishType,
            [field]: parseFloat(value)
        });
        // Success
    } catch (e) {
        Alert.alert("Error", "Failed to update price");
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 10,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
    },
    subText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 4,
    },
    listContent: {
        padding: 24,
    },
    catchCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    vesselName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    harborName: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 2,
    },
    freshBadge: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    freshText: {
        color: '#166534',
        fontSize: 10,
        fontWeight: '800',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: '#e2e8f0',
    },
    statLabel: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '700',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    locationBtn: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    locationBtnText: {
        color: '#2563eb',
        fontSize: 14,
        fontWeight: '700',
    },
    buyBtn: {
        backgroundColor: '#1e3a8a',
    },
    buyBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    mapContainer: {
        marginTop: 15,
        height: 250,
        borderRadius: 20,
        overflow: 'hidden',
    },
    loader: {

        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 20,
        fontSize: 16,
        color: '#94a3b8',
        fontWeight: '600',
        textAlign: 'center',
    },
    filterSection: {
        paddingHorizontal: 24,
        marginTop: 20,
        marginBottom: 10,
    },
    filterTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    filterScroll: {
        flexDirection: 'row',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    activeFilterChip: {
        backgroundColor: '#1e3a8a',
        borderColor: '#1e3a8a',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
    },
    activeFilterChipText: {
        color: '#fff',
    },
    photoSection: {
        marginTop: 16,
    },
    photoLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
        marginBottom: 8,
    },
    photoScroll: {
        flexDirection: 'row',
    },
    catchImage: {
        width: 120,
        height: 80,
        borderRadius: 12,
        marginRight: 10,
        backgroundColor: '#f1f5f9',
    },
    routeNote: {
        backgroundColor: '#fff',
        padding: 10,
        textAlign: 'center',
        fontSize: 11,
        color: '#ef4444',
        fontWeight: '700',
    },
    priceSection: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#f0fdf4',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 11,
        color: '#166534',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    priceValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#166534',
        marginTop: 2,
    },
    manageRatesBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        gap: 8,
    },
    headerActions: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        marginTop: 15,
        gap: 10,
    },
    myStockSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 12,
    },
    stockScroll: {
        marginBottom: 10,
    },
    stockMiniCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginRight: 15,
        width: 180,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    stockCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    miniVesselName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1e293b',
    },
    miniStockWeight: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    manageLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 4,
    },
    manageLabelText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2563eb',
    },
    manageRatesText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
    },
    ratesList: {
        marginBottom: 20,
    },
    rateEditCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    rateFishType: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 12,
    },
    priceEditSection: {
        marginBottom: 5,
    },
    priceGroupLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#1e3a8a',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    priceEditRow: {
        flexDirection: 'row',
        gap: 12,
    },
    priceInputBox: {
        flex: 1,
    },
    priceInputLabel: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '700',
        marginBottom: 4,
    },
    priceInput: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 10,
        padding: 10,
        fontSize: 15,
        fontWeight: '700',
        color: '#2563eb',
    },
    closeModalBtn: {
        backgroundColor: '#1e3a8a',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    closeModalBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    liveSection: {
        marginBottom: 25,
    },
    liveHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    liveDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444',
    },
    liveScroll: {
        paddingBottom: 10,
    },
    liveCard: {
        backgroundColor: '#1e293b',
        borderRadius: 24,
        padding: 16,
        marginRight: 15,
        width: 260,
        elevation: 5,
    },
    liveCardHeader: {
        marginBottom: 12,
    },
    liveVesselName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
    },
    liveHarbor: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },
    miniCatchPhotos: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    miniPhoto: {
        width: 70,
        height: 50,
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: '#334155',
    },
    liveBreakdown: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 10,
        marginBottom: 12,
    },
    liveRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    liveFishType: {
        fontSize: 12,
        color: '#cbd5e1',
        fontWeight: '600',
        flex: 1,
    },
    liveWeight: {
        fontSize: 12,
        fontWeight: '800',
        color: '#fff',
    },
    moreText: {
        fontSize: 10,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 4,
    },
    liveTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 8,
    },
    liveTotalLabel: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '700',
    },
    liveTotalVal: {
        fontSize: 16,
        fontWeight: '900',
        color: '#22c55e',
    },
});




export default BuyerDashboardScreen;
